import ExcelJS from 'exceljs';
import { getCompletionRateBreakdown, getElementBreakdownByCompany } from './dashboard.service.ts';
import { db } from '../../db/index.ts';
import { contract, contractFolder } from '../../db/schema/csms.schema.ts';
import { subContractors, vessels } from '../../db/schema/auth.schema.ts';
import { inArray, and, or, gte, lte, eq } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatDateString(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === '-') return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatAuditDateString(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === '-') return 'belum memasuki periode audit';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'belum memasuki periode audit';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function calculateDurationInMonths(startDate?: string | Date | null, endDate?: string | Date | null): number | string {
  if (!startDate || !endDate || startDate === '-' || endDate === '-') return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';

  const diffTime = end.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.round(diffDays / 30);
}


interface ExportDashboardParams {
  year?: number | number[];
  contractorId?: string | string[];
}

export async function exportDashboardExcelService({ year, contractorId }: ExportDashboardParams) {
  // 1. Fetch filtered contracts to determine running vs ended contracts and folders
  const conditions = [];

  if (year) {
    const years = Array.isArray(year) ? year : [year];
    if (years.length > 0) {
      const yearConditions = years.map(y =>
        and(
          gte(contract.endDate, `${y}-01-01`),
          lte(contract.startDate, `${y}-12-31`)
        )
      );
      conditions.push(or(...yearConditions));
    }
  }

  if (contractorId) {
    const contractorIds = Array.isArray(contractorId) ? contractorId : [contractorId];
    if (contractorIds.length > 0) {
      conditions.push(inArray(contract.contractorId, contractorIds));
    }
  }

  const filteredContracts = await db
    .select({
      id: contract.id,
      title: contract.title,
      numberContract: contract.numberContract,
      startDate: contract.startDate,
      endDate: contract.endDate,
      vendorName: subContractors.name,
      vesselName: vessels.vesselName,
    })
    .from(contract)
    .leftJoin(subContractors, eq(contract.contractorId, subContractors.id))
    .leftJoin(vessels, eq(contract.vesselId, vessels.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // Calculate running vs ended contracts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let runningContracts = 0;
  let endedContracts = 0;

  filteredContracts.forEach(c => {
    const endDate = new Date(c.endDate);
    if (endDate >= today) {
      runningContracts++;
    } else {
      endedContracts++;
    }
  });

  // Fetch all folders at depth 0
  const contractIdsForFolders = filteredContracts.map(c => c.id);
  const allFolders = contractIdsForFolders.length > 0
    ? await db.query.contractFolder.findMany({
      where: and(
        inArray(contractFolder.contractId, contractIdsForFolders),
        eq(contractFolder.depth, 0)
      )
    })
    : [];

  // Calculate planned and realized PSB, PB, PA for the filtered year(s)
  const targetYears = Array.isArray(year) ? year : (year ? [year] : [new Date().getFullYear()]);

  let plannedPSB = 0;
  let realizedPSB = 0;
  let plannedPB = 0;
  let realizedPB = 0;
  let plannedPA = 0;
  let realizedPA = 0;

  allFolders.forEach(folder => {
    const parts = folder.name.split(' - ');
    if (parts.length >= 2) {
      const type = parts[parts.length - 1].trim(); // PSB, PB, PA
      const datePart = parts[0].trim(); // DD-MM-YYYY
      const dateParts = datePart.split('-');
      if (dateParts.length === 3) {
        const folderYear = parseInt(dateParts[2]);
        if (!isNaN(folderYear) && targetYears.includes(folderYear)) {
          const isRealized = folder.isFinal === true || folder.isComplete === true;

          if (type === 'PSB') {
            plannedPSB++;
            if (isRealized) realizedPSB++;
          } else if (type === 'PB') {
            plannedPB++;
            if (isRealized) realizedPB++;
          } else if (type === 'PA') {
            plannedPA++;
            if (isRealized) realizedPA++;
          }
        }
      }
    }
  });

  const [completionData, elementData] = await Promise.all([
    getCompletionRateBreakdown(year, contractorId),
    getElementBreakdownByCompany(year, contractorId)
  ]);

  const { breakdown } = completionData;
  const { elements, semester1, semester2, penilaianAkhir } = elementData;

  const workbook = new ExcelJS.Workbook();

  // ----------------------------------------------------
  // SHEET 0: Rekap Monitoring {year} (at the very beginning)
  // ----------------------------------------------------
  const yearSuffix = Array.isArray(year) ? year.join(', ') : (year || new Date().getFullYear());
  const rekapSheetName = `rekap monitoring ${yearSuffix}`.substring(0, 31);
  const rekapWorksheet = workbook.addWorksheet(rekapSheetName);

  // Set grid lines visible
  rekapWorksheet.views = [{ showGridLines: true }];

  // Column definitions for Rekap Monitoring
  rekapWorksheet.columns = [
    { key: 'colA', width: 4 },   // margin
    { key: 'colB', width: 12 },
    { key: 'colC', width: 12 },
    { key: 'colD', width: 12 },
    { key: 'colE', width: 12 },
    { key: 'colF', width: 12 },
    { key: 'colG', width: 12 },
    { key: 'colH', width: 12 },
  ];



  // Header Title
  const titleCell = rekapWorksheet.getCell('B2');
  titleCell.value = 'TARGET VS REALISASI CSMS - P&O';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '005B9F' } };

  const subtitleCell = rekapWorksheet.getCell('B3');
  subtitleCell.value = `Tahun: ${yearSuffix}`;
  subtitleCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: '555555' } };



  // ----------------------------------------------------
  // HIDDEN SHEET UNTUK DATA DUKUNG GRAFIK NATIVE (OPENPYXL)
  // ----------------------------------------------------

  // Create hidden sheet for support data
  const dataWorksheet = workbook.addWorksheet('CSMS_Chart_Data', { state: 'hidden' });

  // Table 1 (Distribusi Status Kontrak)
  dataWorksheet.getCell('A1').value = 'STATUS KONTRAK';
  dataWorksheet.getCell('B1').value = 'JUMLAH';
  dataWorksheet.getCell('A2').value = 'Kontrak Berjalan';
  dataWorksheet.getCell('B2').value = runningContracts;
  dataWorksheet.getCell('A3').value = 'Kontrak Berakhir';
  dataWorksheet.getCell('B3').value = endedContracts;

  // Table 2 (Rencana vs Realisasi Penilaian)
  dataWorksheet.getCell('D1').value = 'JENIS PENILAIAN';
  dataWorksheet.getCell('E1').value = 'RENCANA (PLAN)';
  dataWorksheet.getCell('F1').value = 'REALISASI (REAL)';

  dataWorksheet.getCell('D2').value = 'PSB';
  dataWorksheet.getCell('E2').value = plannedPSB;
  dataWorksheet.getCell('F2').value = realizedPSB;

  dataWorksheet.getCell('D3').value = 'PB';
  dataWorksheet.getCell('E3').value = plannedPB;
  dataWorksheet.getCell('F3').value = realizedPB;

  dataWorksheet.getCell('D4').value = 'PA';
  dataWorksheet.getCell('E4').value = plannedPA;
  dataWorksheet.getCell('F4').value = realizedPA;

  // Sheet 1: Monitoring
  const sheet1Name = `Monitoring ${yearSuffix}`.substring(0, 31);
  const worksheet1 = workbook.addWorksheet(sheet1Name);

  // Get full contract details for more columns (start/end date)
  const contractIds = breakdown.flatMap(y => [...y.semester1.items, ...y.semester2.items].map(i => i.contractId));
  const uniqueContractIds = [...new Set(contractIds)];

  const contractDetails = uniqueContractIds.length > 0
    ? await db.select().from(contract).where(inArray(contract.id, uniqueContractIds))
    : [];

  const contractMap = new Map(contractDetails.map(c => [c.id, c]));

  // Define Columns and keys for ExcelJS mapping (omitting 'header' to write Row 1/2 manually)
  const s1Columns = [
    { key: 'no', width: 8 },
    { key: 'vendorName', width: 25 },
    { key: 'contractTitle', width: 35 },
    { key: 'contractNumber', width: 25 },
    { key: 'startDate', width: 22 },
    { key: 'endDate', width: 22 },
    { key: 'contractDuration', width: 13 },
    { key: 'wilayahKerja', width: 13 },
  ];

  breakdown.forEach(y => {
    // S1 PB
    s1Columns.push({ key: `s1_pb_${y.year}_date`, width: 18 });
    s1Columns.push({ key: `s1_pb_${y.year}_done`, width: 22 });
    s1Columns.push({ key: `s1_pb_${y.year}_progress`, width: 22 });
    s1Columns.push({ key: `s1_pb_${y.year}_score`, width: 22 });

    // S2 PB
    s1Columns.push({ key: `s2_pb_${y.year}_date`, width: 18 });
    s1Columns.push({ key: `s2_pb_${y.year}_done`, width: 22 });
    s1Columns.push({ key: `s2_pb_${y.year}_progress`, width: 22 });
    s1Columns.push({ key: `s2_pb_${y.year}_score`, width: 22 });

    // PA
    s1Columns.push({ key: `pa_${y.year}_date`, width: 18 });
    s1Columns.push({ key: `pa_${y.year}_done`, width: 22 });
    s1Columns.push({ key: `pa_${y.year}_progress`, width: 22 });
    s1Columns.push({ key: `pa_${y.year}_score`, width: 22 });
  });

  // Add the final total performance column at the very end
  s1Columns.push({ key: 'total_performance', width: 28 });

  worksheet1.columns = s1Columns;

  // Add Row 1 (Main headers)
  const row1Values: string[] = [
    'NO',
    'VENDOR NAME',
    'JUDUL KONTRAK',
    'NOMOR KONTRAK',
    'TANGGAL MULAI',
    'TANGGAL SELESAI',
    'DURASI KONTRAK (Month)',
    'Wilayah Kerja (WK)'
  ];

  // Add Row 2 (Sub headers)
  const row2Values: string[] = [
    '', // NO
    '', // VENDOR NAME
    '', // JUDUL KONTRAK
    '', // NOMOR KONTRAK
    '', // TANGGAL MULAI
    '', // TANGGAL SELESAI
    '', // DURASI KONTRAK
    ''  // Wilayah Kerja (WK)
  ];

  breakdown.forEach(y => {
    // S1 PB
    row1Values.push(`PENILAIAN BERJALAN SEMESTER I\n${y.year}`, '', '', '');
    row2Values.push(
      'TANGGAL PELAKSANAAN',
      'KONTRAK YANG SUDAH MELAKUKAN PB\n1 = Sudah\n0 = Belum',
      'NILAI PELAKSANAAN\nPB TERAKHIR\n(%)',
      'NILAI PERFORMANCE PB\n(%)'
    );

    // S2 PB
    row1Values.push(`PENILAIAN BERJALAN SEMESTER II\n${y.year}`, '', '', '');
    row2Values.push(
      'TANGGAL PELAKSANAAN',
      'KONTRAK YANG SUDAH MELAKUKAN PB\n1 = Sudah\n0 = Belum',
      'NILAI PELAKSANAAN\nPB TERAKHIR\n(%)',
      'NILAI PERFORMANCE PB\n(%)'
    );

    // PA
    row1Values.push(`PENILAIAN AKHIR (PA)\n${y.year}`, '', '', '');
    row2Values.push(
      'TANGGAL PELAKSANAAN',
      'KONTRAK YANG SUDAH MELAKUKAN PA\n1 = Sudah\n0 = Belum',
      'NILAI PELAKSANAAN PA\n(%)',
      'NILAI PERFORMANCE PA\n(%)'
    );
  });

  // Push total performance column header
  row1Values.push('TOTAL NILAI\nPERFORMANCE\nIMPLEMENTASI\nCSMS');
  row2Values.push('');

  worksheet1.addRow(row1Values);
  worksheet1.addRow(row2Values);

  // Merge fixed headers vertically
  for (let i = 1; i <= 8; i++) {
    worksheet1.mergeCells(1, i, 2, i);
  }

  // Merge dynamic headers horizontally
  let currentCol = 9;
  breakdown.forEach(y => {
    // S1 PB
    worksheet1.mergeCells(1, currentCol, 1, currentCol + 3);
    currentCol += 4;
    // S2 PB
    worksheet1.mergeCells(1, currentCol, 1, currentCol + 3);
    currentCol += 4;
    // PA
    worksheet1.mergeCells(1, currentCol, 1, currentCol + 3);
    currentCol += 4;
  });

  // Merge total performance column header vertically
  worksheet1.mergeCells(1, currentCol, 2, currentCol);
  currentCol += 1;

  // Prepare default dynamic column values
  const defaultDynamicValues: Record<string, any> = {};
  defaultDynamicValues['total_performance'] = '-';
  breakdown.forEach(y => {
    defaultDynamicValues[`s1_pb_${y.year}_date`] = 'belum memasuki periode audit';
    defaultDynamicValues[`s1_pb_${y.year}_done`] = 0;
    defaultDynamicValues[`s1_pb_${y.year}_progress`] = 0;
    defaultDynamicValues[`s1_pb_${y.year}_score`] = 0;

    defaultDynamicValues[`s2_pb_${y.year}_date`] = 'belum memasuki periode audit';
    defaultDynamicValues[`s2_pb_${y.year}_done`] = 0;
    defaultDynamicValues[`s2_pb_${y.year}_progress`] = 0;
    defaultDynamicValues[`s2_pb_${y.year}_score`] = 0;

    defaultDynamicValues[`pa_${y.year}_date`] = 'belum memasuki periode audit';
    defaultDynamicValues[`pa_${y.year}_done`] = 0;
    defaultDynamicValues[`pa_${y.year}_progress`] = 0;
    defaultDynamicValues[`pa_${y.year}_score`] = 0;
  });

  // Process data for Sheet 1
  const contractItems = new Map<string, any>();
  breakdown.forEach(y => {
    y.semester1.items.forEach(item => {
      if (!contractItems.has(item.contractId)) {
        const details = contractMap.get(item.contractId);
        contractItems.set(item.contractId, {
          vendorName: item.vendorName,
          contractTitle: item.contractTitle,
          contractNumber: item.contractNumber,
          startDate: formatDateString(details?.startDate),
          endDate: formatDateString(details?.endDate),
          contractDuration: calculateDurationInMonths(details?.startDate, details?.endDate),
          wilayahKerja: 'Zona 6',
          ...defaultDynamicValues
        });
      }
      const existing = contractItems.get(item.contractId);
      if (item.contractfolderName.endsWith(' - PB')) {
        existing[`s1_pb_${y.year}_date`] = formatAuditDateString(item.dateAssessment);
        existing[`s1_pb_${y.year}_done`] = item.isFinal ? 1 : 0;
        const rawScore = item.score !== null && item.score !== undefined ? parseFloat(item.score.toString()) : 0;
        const scoreVal = rawScore === -1 ? 0 : rawScore;
        existing[`s1_pb_${y.year}_progress`] = isNaN(scoreVal) ? 0 : scoreVal;
        existing[`s1_pb_${y.year}_score`] = item.fillingProgress !== null && item.fillingProgress !== undefined ? item.fillingProgress : 0;
      } else if (item.contractfolderName.endsWith(' - PA')) {
        existing[`pa_${y.year}_date`] = formatAuditDateString(item.dateAssessment);
        existing[`pa_${y.year}_done`] = item.isFinal ? 1 : 0;
        const rawScore = item.score !== null && item.score !== undefined ? parseFloat(item.score.toString()) : 0;
        const scoreVal = rawScore === -1 ? 0 : rawScore;
        existing[`pa_${y.year}_progress`] = isNaN(scoreVal) ? 0 : scoreVal;
        existing[`pa_${y.year}_score`] = item.fillingProgress !== null && item.fillingProgress !== undefined ? item.fillingProgress : 0;
      }
    });

    y.semester2.items.forEach(item => {
      if (!contractItems.has(item.contractId)) {
        const details = contractMap.get(item.contractId);
        contractItems.set(item.contractId, {
          vendorName: item.vendorName,
          contractTitle: item.contractTitle,
          contractNumber: item.contractNumber,
          startDate: formatDateString(details?.startDate),
          endDate: formatDateString(details?.endDate),
          contractDuration: calculateDurationInMonths(details?.startDate, details?.endDate),
          wilayahKerja: 'Zona 6',
          ...defaultDynamicValues
        });
      }
      const existing = contractItems.get(item.contractId);
      if (item.contractfolderName.endsWith(' - PB')) {
        existing[`s2_pb_${y.year}_date`] = formatAuditDateString(item.dateAssessment);
        existing[`s2_pb_${y.year}_done`] = item.isFinal ? 1 : 0;
        const rawScore = item.score !== null && item.score !== undefined ? parseFloat(item.score.toString()) : 0;
        const scoreVal = rawScore === -1 ? 0 : rawScore;
        existing[`s2_pb_${y.year}_progress`] = isNaN(scoreVal) ? 0 : scoreVal;
        existing[`s2_pb_${y.year}_score`] = item.fillingProgress !== null && item.fillingProgress !== undefined ? item.fillingProgress : 0;
      } else if (item.contractfolderName.endsWith(' - PA')) {
        existing[`pa_${y.year}_date`] = formatAuditDateString(item.dateAssessment);
        existing[`pa_${y.year}_done`] = item.isFinal ? 1 : 0;
        const rawScore = item.score !== null && item.score !== undefined ? parseFloat(item.score.toString()) : 0;
        const scoreVal = rawScore === -1 ? 0 : rawScore;
        existing[`pa_${y.year}_progress`] = isNaN(scoreVal) ? 0 : scoreVal;
        existing[`pa_${y.year}_score`] = item.fillingProgress !== null && item.fillingProgress !== undefined ? item.fillingProgress : 0;
      }
    });
  });

  Array.from(contractItems.values()).forEach((item, index) => {
    worksheet1.addRow({
      no: index + 1,
      ...item
    });
  });

  // Merge the performance columns vertically across all data rows and set the overall static calculated values
  if (contractItems.size > 0) {
    const startRow = 3;
    const endRow = 2 + contractItems.size;

    let colIdx = 9;
    breakdown.forEach(y => {
      // 3 sections (S1 PB, S2 PB, PA)
      for (let secIdx = 0; secIdx < 3; secIdx++) {
        const perfColIdx = colIdx + 3;

        // Merge column vertically across all data rows
        worksheet1.mergeCells(startRow, perfColIdx, endRow, perfColIdx);

        // Get value from backend calculation
        let val = 0;
        if (secIdx === 0) {
          val = completionData.performance?.pbSemester1 ?? 0;
        } else if (secIdx === 1) {
          val = completionData.performance?.pbSemester2 ?? 0;
        } else {
          val = completionData.performance?.paYearly ?? 0;
        }

        // Set value on the top cell of the merged range
        const topCell = worksheet1.getRow(startRow).getCell(perfColIdx);
        topCell.value = val / 100; // Store as decimal for native percentage formatting
        topCell.font = { name: 'Arial', size: 10, bold: true };
        topCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        topCell.numFmt = '0%'; // Display natively as percentage (e.g. 55%)

        colIdx += 4;
      }
    });

    // Merge the TOTAL PERFORMANCE column vertically at the end and set its static calculated value
    const totalPerfColIdx = colIdx;
    worksheet1.mergeCells(startRow, totalPerfColIdx, endRow, totalPerfColIdx);

    const totalVal = completionData.performance?.totalPerformance ?? 0;
    const totalTopCell = worksheet1.getRow(startRow).getCell(totalPerfColIdx);
    totalTopCell.value = totalVal / 100;
    totalTopCell.font = { name: 'Arial', size: 10, bold: true };
    totalTopCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    totalTopCell.numFmt = '0%'; // Display natively as percentage (e.g. 23%)
  }

  // Set Row Heights for Headers
  worksheet1.getRow(1).height = 40;
  worksheet1.getRow(2).height = 80;

  // Let's style Row 1 and Row 2
  const blueFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '005B9F' } // Standard corporate blue from the image
  };
  const yellowFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC000' }
  };
  const greenFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '92D050' }
  };

  const whiteFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
  const blackFont = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };

  // Style fixed header columns (1 to 8) in Row 1 (they are merged to Row 2)
  for (let colIdx = 1; colIdx <= 8; colIdx++) {
    const cell1 = worksheet1.getRow(1).getCell(colIdx);
    const cell2 = worksheet1.getRow(2).getCell(colIdx);
    cell1.fill = blueFill;
    cell1.font = whiteFont;
    cell1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell2.fill = blueFill;
    cell2.font = whiteFont;
    cell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  // Style dynamic columns in Row 1 and Row 2
  let col = 9;
  breakdown.forEach(y => {
    // 3 sections (S1 PB, S2 PB, PA)
    for (let secIdx = 0; secIdx < 3; secIdx++) {
      const isPA = (secIdx === 2);

      // Style Row 1 cells for this section (merged across 4 columns)
      for (let offset = 0; offset < 4; offset++) {
        const cell = worksheet1.getRow(1).getCell(col + offset);
        cell.fill = blueFill;
        cell.font = whiteFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }

      // Style Row 2 cells
      // 1. Tanggal Pelaksanaan (Col 1)
      const dateCell = worksheet1.getRow(2).getCell(col);
      dateCell.fill = blueFill;
      dateCell.font = whiteFont;
      dateCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // 2. Kontrak yang sudah melakukan (Col 2)
      const doneCell = worksheet1.getRow(2).getCell(col + 1);
      doneCell.fill = blueFill;
      doneCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      doneCell.value = {
        richText: [
          { text: `KONTRAK YANG SUDAH MELAKUKAN ${isPA ? 'PA' : 'PB'}\n`, font: { color: { argb: 'FFFFFF' }, bold: true, name: 'Arial', size: 9 } },
          { text: '1 = Sudah\n0 = Belum', font: { color: { argb: 'FF3333' }, bold: true, name: 'Arial', size: 9 } }
        ]
      };

      // 3. Nilai Pelaksanaan (Col 3) - Yellow for PB, Green for PA
      const progressCell = worksheet1.getRow(2).getCell(col + 2);
      progressCell.fill = isPA ? greenFill : yellowFill;
      progressCell.font = blackFont;
      progressCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // 4. Nilai Performance (Col 4)
      const scoreCell = worksheet1.getRow(2).getCell(col + 3);
      scoreCell.fill = blueFill;
      scoreCell.font = whiteFont;
      scoreCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      col += 4;
    }
  });

  // Style TOTAL PERFORMANCE column header
  const totalPerfFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF00' } // Bright yellow
  };

  const totalPerfHeader1 = worksheet1.getRow(1).getCell(col);
  const totalPerfHeader2 = worksheet1.getRow(2).getCell(col);
  totalPerfHeader1.fill = totalPerfFill;
  totalPerfHeader1.font = blackFont;
  totalPerfHeader1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  totalPerfHeader2.fill = totalPerfFill;
  totalPerfHeader2.font = blackFont;
  totalPerfHeader2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Apply borders and alignment to worksheet rows
  worksheet1.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      if (rowNumber > 2) {
        // Data styling
        if (colNumber === 1 || colNumber === 5 || colNumber === 6 || colNumber === 7 || colNumber === 8 || colNumber >= 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }

        // Apply 2 decimal format to Nilai Pelaksanaan columns
        let currentGroupCol = 9;
        const pelaksanaanCols = new Set<number>();
        breakdown.forEach(() => {
          pelaksanaanCols.add(currentGroupCol + 2); // S1 PB Nilai Pelaksanaan
          pelaksanaanCols.add(currentGroupCol + 6); // S2 PB Nilai Pelaksanaan
          pelaksanaanCols.add(currentGroupCol + 10); // PA Nilai Pelaksanaan
          currentGroupCol += 12;
        });

        if (pelaksanaanCols.has(colNumber)) {
          if (typeof cell.value === 'number') {
            cell.numFmt = '0.00';
          }
        }
      }
    });
  });



  const buildScoreMarineSheet = (
    sheetName: string,
    titleLabel: string,
    contractsList: any[]
  ) => {
    const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

    // Process element labels from backend data
    const elementLabels = elements.map(elString => {
      const spaceIdx = elString.indexOf(' ');
      const no = spaceIdx !== -1 ? elString.substring(0, spaceIdx) : elString;
      const label = spaceIdx !== -1 ? elString.substring(spaceIdx + 1) : '';
      const type = no.includes('.') ? 'child' : 'parent';

      return {
        no,
        label,
        type: type as 'parent' | 'child',
        fullLabel: elString,
        highlight: type === 'parent'
      };
    });

    const childElements = elementLabels.filter(el => el.type === 'child');

    const getAvgFor = (elementName: string) => {
      const vals = contractsList.map(c => c.elementScores?.[elementName]).filter(v => v != null);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };

    const getParentAvgFor = (parentNo: string) => {
      const children = childElements.filter(el => el.no.startsWith(parentNo + '.'));
      if (children.length === 0) return null;

      let sum = 0;
      let count = 0;
      children.forEach(child => {
        const childAvg = getAvgFor(child.fullLabel);
        if (childAvg !== null) {
          sum += childAvg;
          count++;
        }
      });

      return count > 0 ? sum / count : null;
    };

    const isRowHighlighted = (el: any) => {
      // Highlight parent elements 1, 2, 3
      if (el.no === '1' || el.no === '2' || el.no === '3') return true;
      // Highlight any element ending with *
      if (el.label.endsWith('*') || el.fullLabel.endsWith('*')) return true;
      return false;
    };

    // Headers for Score Marine
    const headerRow1 = sheet.getRow(1);
    const headerRow2 = sheet.getRow(2);
    const headerRow3 = sheet.getRow(3);

    headerRow1.getCell(1).value = 'NO';
    headerRow1.getCell(2).value = 'ELEMEN K3LL';
    sheet.mergeCells(1, 1, 3, 1);
    sheet.mergeCells(1, 2, 3, 2);

    let currentColumn = 3;

    if (contractsList.length > 0) {
      const startCol = currentColumn;
      contractsList.forEach(comp => {
        headerRow2.getCell(currentColumn).value = comp.vendorName;
        headerRow3.getCell(currentColumn).value = comp.vesselName;
        sheet.getColumn(currentColumn).width = 25;
        currentColumn++;
      });
      const endCol = currentColumn - 1;
      headerRow1.getCell(startCol).value = titleLabel;
      sheet.mergeCells(1, startCol, 1, endCol);
    }

    // Set AVG Column header
    const avgColIdx = currentColumn;
    headerRow1.getCell(avgColIdx).value = 'AVG';
    sheet.mergeCells(1, avgColIdx, 3, avgColIdx);
    sheet.getColumn(avgColIdx).width = 15;

    sheet.getColumn(1).width = 8;
    sheet.getColumn(2).width = 50;

    // Fills definitions
    const highlightFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE7' } };
    const parentFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7F5EF' } };
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F4F2EC' } };
    const footerSubtotalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F4F2EC' } };
    const footerPercentFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF1F6' } };

    const boldFont = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    const regularFont = { name: 'Arial', size: 10, color: { argb: '000000' } };

    // Add Element Rows
    elementLabels.forEach((el) => {
      const row = sheet.addRow([]);
      row.getCell(1).value = el.no;
      row.getCell(2).value = el.label;

      const isParent = el.type === 'parent';
      const hasScores = contractsList.some(c => c.elementScores?.[el.fullLabel] != null);
      const isExcluded = ['3', '4', '5', '6', '7', '8'].includes(el.no);
      const shouldMerge = !hasScores || isExcluded;

      // Determine colors & styling
      const isHighlighted = isRowHighlighted(el);
      const rowFill = isHighlighted ? highlightFill : (isParent ? parentFill : null);
      const rowFont = (isParent || isHighlighted) ? boldFont : regularFont;

      // Style first two columns
      row.getCell(1).font = rowFont;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (rowFill) row.getCell(1).fill = rowFill;

      row.getCell(2).font = rowFont;
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      if (rowFill) row.getCell(2).fill = rowFill;

      let colIdx = 3;
      if (isParent && shouldMerge) {
        contractsList.forEach(() => {
          const cell = row.getCell(colIdx);
          cell.value = '';
          if (rowFill) cell.fill = rowFill;
          colIdx++;
        });
      } else {
        contractsList.forEach(comp => {
          const cell = row.getCell(colIdx);
          const scoreVal = comp.elementScores?.[el.fullLabel] ?? null;
          cell.value = scoreVal !== null ? scoreVal : '-';
          cell.font = rowFont;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          if (rowFill) cell.fill = rowFill;
          colIdx++;
        });
      }

      // AVG cell for this element row
      let displayAvg = isParent ? getParentAvgFor(el.no) : getAvgFor(el.fullLabel);
      if (isParent && displayAvg === null && hasScores) {
        displayAvg = getAvgFor(el.fullLabel);
      }

      const avgCell = row.getCell(avgColIdx);
      avgCell.value = displayAvg !== null ? displayAvg : '—';
      avgCell.font = boldFont;
      avgCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (displayAvg !== null) {
        avgCell.numFmt = '0.00';
      }
      if (rowFill) avgCell.fill = rowFill;
    });

    // Add Footer 1: Sub Total Rencana K3LL
    const subTotalRow = sheet.addRow([]);
    subTotalRow.getCell(2).value = 'Sub Total Rencana K3LL';
    subTotalRow.getCell(2).font = boldFont;
    subTotalRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    subTotalRow.getCell(2).fill = footerSubtotalFill;
    subTotalRow.getCell(1).fill = footerSubtotalFill;

    let col = 3;
    contractsList.forEach(c => {
      const score = c.rencanaK3LLScore || 0;
      const cell = subTotalRow.getCell(col);
      cell.value = score;
      cell.font = boldFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.numFmt = '0.00';
      cell.fill = footerSubtotalFill;
      col++;
    });

    // Subtotal AVG cell
    const subTotalAvgCell = subTotalRow.getCell(avgColIdx);
    const validScores = contractsList.map(c => c.rencanaK3LLScore).filter(v => v != null);
    const avgTotal = validScores.length ? validScores.reduce((s, v) => s + v, 0) / validScores.length : 0;
    subTotalAvgCell.value = avgTotal;
    subTotalAvgCell.font = boldFont;
    subTotalAvgCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    subTotalAvgCell.numFmt = '0.00';
    subTotalAvgCell.fill = footerSubtotalFill;

    // Add Footer 2: Persentase Sub Total Rencana K3LL
    const percentRow = sheet.addRow([]);
    percentRow.getCell(2).value = 'Persentase Sub Total Rencana K3LL';
    percentRow.getCell(2).font = boldFont;
    percentRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    percentRow.getCell(2).fill = footerPercentFill;
    percentRow.getCell(1).fill = footerPercentFill;

    col = 3;
    contractsList.forEach(c => {
      const score = c.score || 0;
      const cell = percentRow.getCell(col);
      cell.value = score / 100; // Store as decimal for percentage format
      cell.font = boldFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.numFmt = '0.00%';
      cell.fill = footerPercentFill;
      col++;
    });

    // Percent AVG cell
    const percentAvgCell = percentRow.getCell(avgColIdx);
    percentAvgCell.value = avgTotal / 100;
    percentAvgCell.font = boldFont;
    percentAvgCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    percentAvgCell.numFmt = '0.00%';
    percentAvgCell.fill = footerPercentFill;

    // Apply header background to Row 1, 2, 3
    [1, 2, 3].forEach(rowIdx => {
      const row = sheet.getRow(rowIdx);
      row.font = { bold: true, name: 'Arial', size: 10 };
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.eachCell(cell => {
        cell.fill = headerFill;
      });
    });

    // Apply borders to all rows
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  };

  // Build the 3 Score Marine sheets
  buildScoreMarineSheet('Score Marine PB Semester I', 'PB I (SEMESTER 1)', semester1);
  buildScoreMarineSheet('Score Marine PB Semester II', 'PB II (SEMESTER 2)', semester2);
  buildScoreMarineSheet('Score Marine PA', 'PENILAIAN AKHIR (PA)', penilaianAkhir);

  // Write Excel file to a temporary path on disk
  const tempFilePath = path.join(os.tmpdir(), `csms_export_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`);
  await workbook.xlsx.writeFile(tempFilePath);

  try {
    let pythonScriptPath = path.join(process.cwd(), 'src/scripts/add_charts.py');
    if (!fs.existsSync(pythonScriptPath)) {
      pythonScriptPath = path.join(process.cwd(), 'dist/src/scripts/add_charts.py');
      if (!fs.existsSync(pythonScriptPath)) {
        pythonScriptPath = path.join(__dirname, '../../scripts/add_charts.py');
      }
    }

    // Try "python" then "python3" then "py"
    let pythonCmd = 'python';
    try {
      execSync('python --version', { stdio: 'ignore' });
    } catch {
      try {
        execSync('python3 --version', { stdio: 'ignore' });
        pythonCmd = 'python3';
      } catch {
        pythonCmd = 'py';
      }
    }

    execSync(`${pythonCmd} "${pythonScriptPath}" "${tempFilePath}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to add native charts with Python openpyxl:', error);
  }

  // Read the modified Excel file back into a buffer
  const finalBuffer = fs.readFileSync(tempFilePath);

  // Safely clean up the temp file
  try {
    fs.unlinkSync(tempFilePath);
  } catch (err) {
    console.error('Failed to clean up temp file:', err);
  }

  return finalBuffer;
}

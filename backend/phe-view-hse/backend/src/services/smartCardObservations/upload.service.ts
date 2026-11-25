import XLSX from 'xlsx';
import { db } from '../../db/index.ts';
import { smartCardObservations, uploadHistory } from '../../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';
import { normalizeExcelString } from './excelUtils.ts';
import { processRow } from './rowProcessor.ts';
import { saveErrorRow } from './errorHandler.ts';
import { getEmployeesWithoutObservations, getObservationStatistics } from './employeeWithoutObservations.service.ts';
import { saveUploadHistory } from './uploadHistory.service.ts';

export async function uploadSmartCardObservations(filePath: string, filename: string = 'unknown', userId: string) {
  const workbook = XLSX.readFile(filePath);
  
  const worksheetName = 'data-online';
  if (!workbook.SheetNames.includes(worksheetName)) {
    throw new Error(`Worksheet "${worksheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
  }

  const worksheet = workbook.Sheets[worksheetName];
  
  // Try to find the correct header row
  const sheetAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  let headerRowIndex = -1;
  let headerRow: any[] = [];
  
  // Look for a row that contains expected column names
  for (let i = 0; i < Math.min(20, sheetAsArrays.length); i++) {
    const row = sheetAsArrays[i] || [];
    
    const hasExpectedHeaders = row.some(cell => 
      typeof cell === 'string' && (
        cell.toLowerCase().includes('nama') ||
        cell.toLowerCase().includes('perusahaan') ||
        cell.toLowerCase().includes('fungsi') ||
        cell.toLowerCase().includes('tanggal')
      )
    );
    
    if (hasExpectedHeaders) {
      headerRowIndex = i;
      headerRow = row;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    // Try alternative approach - look for rows with substantial data
    for (let i = 0; i < Math.min(50, sheetAsArrays.length); i++) {
      const row = sheetAsArrays[i] || [];
      const nonEmptyCount = row.filter(cell => 
        cell !== null && cell !== undefined && cell !== '' && cell !== 0
      ).length;
      
      if (nonEmptyCount > 10) { // Row with substantial data
        // Check if this could be data row by looking for name-like patterns
        const hasNamePattern = row.some(cell => 
          typeof cell === 'string' && 
          cell.length > 2 && 
          cell.length < 100 &&
          !cell.toLowerCase().includes('nama') // Not a header
        );
        
        if (hasNamePattern && i > 0) {
          headerRowIndex = i - 1;
          headerRow = sheetAsArrays[i - 1] || [];
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row with expected columns (Nama, Nama Perusahaan, Fungsi / Bagian, Tanggal)');
    }
  }
  
  // Parse data starting from the row after headers
  const dataStartRow = headerRowIndex + 1;
  const range = `A${dataStartRow + 1}:${XLSX.utils.encode_col(headerRow.length - 1)}${sheetAsArrays.length}`;
  
  // Use custom parsing with the found header row
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: headerRow,
    range: range
  });

  const targetValue = 'production operations';
  
  // More flexible filtering: try exact match first, then partial match
  let filteredData = rawData.filter((row: any) => {
    const normalized = normalizeExcelString(row['Fungsi / Bagian']);
    return normalized === targetValue;
  });
  
  // If no exact matches, try partial matching
  if (filteredData.length === 0) {
    filteredData = rawData.filter((row: any) => {
      const normalized = normalizeExcelString(row['Fungsi / Bagian']);
      const isPartialMatch = normalized.includes('production') || normalized.includes('operations');
      return isPartialMatch;
    });
  }

  const processedRows = await Promise.all(filteredData.map(async (row: any) => {
    const result = await processRow(row);
    return result;
  }));
  
  const validRows = processedRows.filter((r) => r.isValid);
  const errorRows = processedRows.filter((r) => !r.isValid && !r.isSkipped); // Exclude skipped rows from errors
  const skippedRows = processedRows.filter((r) => r.isSkipped); // Track skipped rows separately

  // Save upload history first to get the uploadHistoryId
  const uploadHistoryId = await saveUploadHistory({
    userId: userId,
    filename: filename,
    status: errorRows.length > 0 ? 'error' : 'success',
    totalRows: rawData.length,
    validRows: validRows.length,
    errorRows: errorRows.length,
    skippedRows: skippedRows.length,
    insertedRows: 0, // Will be updated after insertion
    hasErrors: errorRows.length > 0,
  });

  let insertedCount = 0;
  let firstId: number | null = null;
  let lastId: number | null = null;
  
  for (const validRow of validRows) {
    try {
      const result = await db.insert(smartCardObservations).values(validRow.observationData!).returning({ id: smartCardObservations.id });
      const insertedId = result[0].id;
      
      if (firstId === null) {
        firstId = insertedId;
      }
      lastId = insertedId;
      
      insertedCount++;
    } catch (err) {
      errorRows.push({
        isValid: false,
        error: { type: 'Insert Error', message: err instanceof Error ? err.message : 'Unknown' },
        originalRow: validRow.originalRow
      });
    }
  }

  const errorResults = [];
  for (const errorRow of errorRows) {
    const insertedError = await saveErrorRow(errorRow, uploadHistoryId);
    errorResults.push(insertedError);
  }

  // Update upload history with final insertion count and IDs
  await db.update(uploadHistory).set({
    insertedRows: insertedCount,
    firstId: firstId,
    lastId: lastId,
  }).where(eq(uploadHistory.id, uploadHistoryId));

  // Get employees without observations after upload
  const employeesWithoutObservations = await getEmployeesWithoutObservations();
  const observationStats = await getObservationStatistics();

  return {
    success: true,
    uploadHistoryId: uploadHistoryId, // Return the upload history ID for tracking
    summary: {
      totalRows: rawData.length,
      validRows: validRows.length,
      errorRows: errorRows.length,
      skippedRows: skippedRows.length, // Add skipped count
      insertedRows: insertedCount,
      firstId: firstId, // First ID inserted
      lastId: lastId, // Last ID inserted
    },
    errors: errorResults,
    employeesWithoutObservations,
    observationStatistics: observationStats,
  };
}

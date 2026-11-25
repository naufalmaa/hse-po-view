import { db } from '../../db/index.ts';
import { smartCardObservations } from '../../db/schema/employee.schema.ts';
import { eq, and } from 'drizzle-orm';
import { parseExcelDate, parseBoolean } from './excelUtils.ts';
import { findEmployeeMatch } from './employeeMatcher.ts';

export async function checkDuplicateObservation(employeeId: string, date: string, time?: string) {
  let whereCondition = and(
    eq(smartCardObservations.employeeId, employeeId), 
    eq(smartCardObservations.observationDate, date)
  );
  
  // If time is provided, include it in the duplicate check
  if (time && time.trim()) {
    whereCondition = and(
      whereCondition,
      eq(smartCardObservations.observationTime, time.trim())
    );
  }
  
  const existing = await db
    .select({ id: smartCardObservations.id })
    .from(smartCardObservations)
    .where(whereCondition)
    .limit(1);
  return existing.length > 0;
}

export async function processRow(row: any) {
  if (!row.Nama?.trim()) {
    return { isValid: false, error: { type: 'Validation Error', message: 'Employee name required' }, originalRow: row };
  }
  if (!row['Nama Perusahaan']?.trim()) {
    return { isValid: false, error: { type: 'Validation Error', message: 'Company name required' }, originalRow: row };
  }

  const observationDate = parseExcelDate(row.Tanggal);
  
  if (!observationDate) {
    return { isValid: false, error: { type: 'Validation Error', message: 'Invalid date' }, originalRow: row };
  }

  const { employee, suggestions } = await findEmployeeMatch(
    row.Nama.trim(),
    row['Nama Perusahaan'].trim()
  );

  if (!employee) {
    return {
      isValid: false,
      error: { type: 'Employee Not Found', message: 'No matching employee', suggestions },
      originalRow: row,
    };
  }

  const observationTime = row['Waktu/Jam']?.toString().trim() || null;
  const isDuplicate = await checkDuplicateObservation(employee.id, observationDate, observationTime);
  
  if (isDuplicate) {
    return {
      isValid: false,
      isSkipped: true, // Mark as skipped rather than error
      error: { 
        type: 'Duplicate', 
        message: `Observation already exists for ${row.Nama} on ${observationDate}${observationTime ? ` at ${observationTime}` : ''}`, 
        skipReason: 'duplicate_datetime' 
      },
      originalRow: row,
    };
  }

  const observationData = {
    employeeId: employee.id,
    observationDate,
    observationTime: row['Waktu/Jam'] || null,
    observationFunction: row['Fungsi / Bagian'] || null,
    observationArea: row['Area Pengamatan'] || null,
    specificLocation: row['Lokasi Spesifik'] || null,
    reportCategory: row['Pilih Kategori Laporan'] || null,
    observedBehavior: row['Perilaku yang Anda amati'] || null,
    observedAspectCategory: row['Kategori aspek yang Anda amati'] || null,
    worker: row['PEKERJA'] || null,
    ppeTypeObserved: row['Jenis APD yang diamati'] || null,
    unsafePpeCause: row['Penyebab APD Tidak Aman'] || null,
    equipmentTools: row['PERALATAN & PERLENGKAPAN'] || null,
    material: row['MATERIAL'] || null,
    proceduresAdminControl: row['PROSEDUR & PENGENDALIAN ADMINISTRATIF'] || null,
    workEnvironment: row['LINGKUNGAN KERJA'] || null,
    unsafeBehaviorDescription: row['Deskripsikan temuan perilaku TIDAK AMAN yang Anda intervensi'] || null,
    agreedFollowUp: row['Tindak lanjut yang disepakati'] || null,
    clsr: row['CLSR'] || null,
    stopWorkAuthority: parseBoolean(row['Apakah anda memberhentikan pekerjaan ketika melihat perilaku dan atau kondisi lingkungan kerja tidak selamat (menjalankan STOP WORK AUTHORITY / SWA)']),
    currentInterventionStatus: row['Status Intervensi (saat ini)'] || null,
    findingDescription: row['Uraian Temuan'] || null,
    rootCause: row['Penyebab Dasar'] || null,
    potentialImpact: row['Potensi Dampak'] || null,
    currentHandling: row['Penanganan Saat Ini'] || null,
    followUpHandling: row['Penanganan Lanjutan (jika ada)'] || null,
    followUpPriority: row['Prioritas Tindak Lanjut'] || null,
    responsiblePerson: row['Penanganggung Jawab'] || null,
    ucFindingStatus: row['Status Temuan UC'] || null,
    what: row['WHAT'] || null,
    who: row['WHO'] || null,
    how: row['HOW'] || null,
    nearMissHandling: row['Penanganan Near Miss'] || null,
    nearMissCategory: row['Kategori Near Miss'] || null,
    nearMissPotentialImpact: row['Potensi Dampak Near Miss'] || null,
    additionalNotes: row['Catatan / Keterangan Tambahan'] || null,
    clsr2: row['CLSR2'] || null,
    currentNearMissStatus: row['Status Near Miss (saat ini)'] || null,
  };

  return { isValid: true, employeeId: employee.id, observationData, originalRow: row };
}

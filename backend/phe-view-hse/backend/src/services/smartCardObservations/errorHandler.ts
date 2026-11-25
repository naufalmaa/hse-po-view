import { db } from '../../db/index.ts';
import { uploadObservationErrors, smartCardObservations, employees, uploadHistory } from '../../db/schema/employee.schema.ts';
import { subContractors, userContractors } from '../../db/schema/auth.schema.ts';
import { eq, and } from 'drizzle-orm';
import { processRow, checkDuplicateObservation } from './rowProcessor.ts';
import { parseExcelDate, parseBoolean } from './excelUtils.ts';

export async function saveErrorRow(errorRow: any, uploadHistoryId?: string) {
  const [insertedError] = await db
    .insert(uploadObservationErrors)
    .values({
      uploadHistoryId: uploadHistoryId || null,
      originalRow: JSON.stringify(errorRow.originalRow),
      errorType: errorRow.error?.type || 'Unknown Error',
      suggestions: JSON.stringify(errorRow.error?.suggestions || []),
      status: 'error',
    })
    .returning({ id: uploadObservationErrors.id });

  return {
    id: insertedError.id,
    errorType: errorRow.error?.type || 'Unknown Error',
    suggestions: errorRow.error?.suggestions || [],
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () => [] as number[]);
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

export async function getUploadErrors(userId?: string, role?: string) {
  // Query joined with uploadHistory
  const errors = await db
    .select({
      id: uploadObservationErrors.id,
      uploadHistoryId: uploadObservationErrors.uploadHistoryId,
      originalRow: uploadObservationErrors.originalRow,
      errorType: uploadObservationErrors.errorType,
      suggestions: uploadObservationErrors.suggestions,
      status: uploadObservationErrors.status,
      createdAt: uploadObservationErrors.createdAt,
      uploadUserId: uploadHistory.userId,
    })
    .from(uploadObservationErrors)
    .leftJoin(uploadHistory, eq(uploadObservationErrors.uploadHistoryId, uploadHistory.id))
    .where(eq(uploadObservationErrors.status, 'error'));

  const processedErrors = errors.map((e) => ({
    ...e,
    originalRow: typeof e.originalRow === 'string' ? JSON.parse(e.originalRow) : e.originalRow,
    suggestions: typeof e.suggestions === 'string' ? JSON.parse(e.suggestions) : e.suggestions,
  }));

  let filteredErrors = processedErrors;

  if (role === 'contractor' && userId) {
    const contractorAccess = await db
      .select({ id: subContractors.id })
      .from(userContractors)
      .innerJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(userContractors.userId, userId));
    const allowedIds = contractorAccess.map(row => row.id);

    // Fetch all contractors list to resolve names to ID using similarity
    const contractorsList = await db.select({ id: subContractors.id, name: subContractors.name }).from(subContractors);
    const contractorsMap = new Map<string, string>();
    contractorsList.forEach(c => {
      contractorsMap.set(c.name.toLowerCase().trim(), c.id);
    });

    filteredErrors = processedErrors.filter(error => {
      const compName = error.originalRow?.['Nama Perusahaan']?.trim() || '';
      if (!compName) {
        // If there's no company name, fallback to check if it's uploaded by this user
        return error.uploadUserId === userId;
      }

      const compKey = compName.toLowerCase().trim();
      let companyId = contractorsMap.get(compKey);

      if (!companyId) {
        let bestId = '';
        let bestSim = 0;
        contractorsList.forEach(c => {
          const sim = calculateSimilarity(c.name, compName);
          if (sim > bestSim) {
            bestSim = sim;
            bestId = c.id;
          }
        });
        if (bestSim > 0.5) {
          companyId = bestId;
        }
      }

      const isCompanyMatch = companyId ? allowedIds.includes(companyId) : false;
      const isUserMatch = error.uploadUserId === userId;
      return isCompanyMatch || isUserMatch;
    });
  }

  // Group errors by employee name and company
  const groupedErrors = new Map();

  filteredErrors.forEach(error => {
    const employeeName = error.originalRow?.Nama?.trim() || 'Unknown';
    const companyName = error.originalRow?.['Nama Perusahaan']?.trim() || 'Unknown';
    const key = `${employeeName}|${companyName}`;

    if (!groupedErrors.has(key)) {
      groupedErrors.set(key, {
        id: error.id, // Use first error ID as representative
        employeeName,
        companyName,
        errorType: error.errorType,
        suggestions: error.suggestions,
        uploadHistoryId: error.uploadHistoryId, // Include upload history ID
        count: 0,
        errorIds: [],
        sampleRow: error.originalRow,
        createdAt: error.createdAt
      });
    }

    const group = groupedErrors.get(key);
    group.count++;
    group.errorIds.push(error.id);
  });

  return Array.from(groupedErrors.values()).sort((a, b) => b.count - a.count); // Sort by count descending
}

export async function getUploadErrorsByHistoryId(uploadHistoryId: string) {
  const errors = await db.select().from(uploadObservationErrors)
    .where(and(
      eq(uploadObservationErrors.status, 'error'),
      eq(uploadObservationErrors.uploadHistoryId, uploadHistoryId)
    ));

  return errors.map((e) => ({
    ...e,
    originalRow: typeof e.originalRow === 'string' ? JSON.parse(e.originalRow) : e.originalRow,
    suggestions: typeof e.suggestions === 'string' ? JSON.parse(e.suggestions) : e.suggestions,
  }));
}

export async function reprocessErrorRow(errorId: string, employeeId?: string) {
  const [errorRow] = await db.select().from(uploadObservationErrors).where(eq(uploadObservationErrors.id, errorId));
  if (!errorRow) {
    throw new Error('Error row not found');
  }

  const originalRow = typeof errorRow.originalRow === 'string' ? JSON.parse(errorRow.originalRow) : errorRow.originalRow;

  let processedRow: any;

  if (employeeId) {
    // Manual employee ID provided - bypass normal matching and create observation data directly

    // Verify the employee exists
    const [employee] = await db.select({ id: employees.id, employeeName: employees.employeeName }).from(employees).where(eq(employees.id, employeeId)).limit(1);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    // Create observation data directly without employee matching
    const observationDate = parseExcelDate(originalRow.Tanggal);
    if (!observationDate) {
      throw new Error('Invalid date in original row');
    }

    // Check for duplicates with both date and time
    const observationTime = originalRow['Waktu/Jam']?.toString().trim() || null;
    const isDuplicate = await checkDuplicateObservation(employeeId, observationDate, observationTime);
    if (isDuplicate) {
      // Delete the error row since the data already exists (not actually an error)
      await db.delete(uploadObservationErrors).where(eq(uploadObservationErrors.id, errorId));

      const message = 'Data already exists in smart card observations. Error record has been automatically removed.';
      return { success: true, message, isDuplicate: true };
    }

    const observationData = {
      employeeId: employeeId,
      observationDate,
      observationTime: originalRow['Waktu/Jam'] || null,
      observationFunction: originalRow['Fungsi / Bagian'] || null,
      observationArea: originalRow['Area Pengamatan'] || null,
      specificLocation: originalRow['Lokasi Spesifik'] || null,
      reportCategory: originalRow['Pilih Kategori Laporan'] || null,
      observedBehavior: originalRow['Perilaku yang Anda amati'] || null,
      observedAspectCategory: originalRow['Kategori aspek yang Anda amati'] || null,
      worker: originalRow['PEKERJA'] || null,
      ppeTypeObserved: originalRow['Jenis APD yang diamati'] || null,
      unsafePpeCause: originalRow['Penyebab APD Tidak Aman'] || null,
      equipmentTools: originalRow['PERALATAN & PERLENGKAPAN'] || null,
      material: originalRow['MATERIAL'] || null,
      proceduresAdminControl: originalRow['PROSEDUR & PENGENDALIAN ADMINISTRATIF'] || null,
      workEnvironment: originalRow['LINGKUNGAN KERJA'] || null,
      unsafeBehaviorDescription: originalRow['Deskripsikan temuan perilaku TIDAK AMAN yang Anda intervensi'] || null,
      agreedFollowUp: originalRow['Tindak lanjut yang disepakati'] || null,
      clsr: originalRow['CLSR'] || null,
      stopWorkAuthority: parseBoolean(originalRow['Apakah anda memberhentikan pekerjaan ... STOP WORK AUTHORITY / SWA']),
      currentInterventionStatus: originalRow['Status Intervensi (saat ini)'] || null,
      findingDescription: originalRow['Uraian Temuan'] || null,
      rootCause: originalRow['Penyebab Dasar'] || null,
      potentialImpact: originalRow['Potensi Dampak'] || null,
      currentHandling: originalRow['Penanganan Saat Ini'] || null,
      followUpHandling: originalRow['Penanganan Lanjutan (jika ada)'] || null,
      followUpPriority: originalRow['Prioritas Tindak Lanjut'] || null,
      responsiblePerson: originalRow['Penanganggung Jawab'] || null,
      ucFindingStatus: originalRow['Status Temuan UC'] || null,
      what: originalRow['WHAT'] || null,
      who: originalRow['WHO'] || null,
      how: originalRow['HOW'] || null,
      nearMissHandling: originalRow['Penanganan Near Miss'] || null,
      nearMissCategory: originalRow['Kategori Near Miss'] || null,
      nearMissPotentialImpact: originalRow['Potensi Dampak Near Miss'] || null,
      additionalNotes: originalRow['Catatan / Keterangan Tambahan'] || null,
      clsr2: originalRow['CLSR2'] || null,
      currentNearMissStatus: originalRow['Status Near Miss (saat ini)'] || null,
    };

    processedRow = {
      isValid: true,
      employeeId: employeeId,
      observationData,
      originalRow
    };

  } else {
    // No manual employee ID - use normal processing
    processedRow = await processRow(originalRow);
  }

  if (!processedRow.isValid) {
    throw new Error(processedRow.error?.message || 'Row still invalid');
  }

  await db.insert(smartCardObservations).values(processedRow.observationData!);
  await db.update(uploadObservationErrors).set({ status: 'resolved' }).where(eq(uploadObservationErrors.id, errorId));

  return { success: true, message: 'Row successfully reprocessed' };
}

export async function autoResolveSimilarErrors(resolvedErrorId: string, originalRow: any, employeeId: string) {
  const employeeName = originalRow.Nama?.trim();
  const companyName = originalRow['Nama Perusahaan']?.trim();

  if (!employeeName) {
    return { autoResolvedCount: 0 };
  }

  // Find all other error rows with the same employee name and company
  const similarErrors = await db
    .select()
    .from(uploadObservationErrors)
    .where(eq(uploadObservationErrors.status, 'error'));

  const matchingSimilarErrors = similarErrors.filter(error => {
    if (error.id === resolvedErrorId) return false; // Skip the one we just resolved

    const errorRow = typeof error.originalRow === 'string' ? JSON.parse(error.originalRow) : error.originalRow;
    const errorName = errorRow.Nama?.trim();
    const errorCompany = errorRow['Nama Perusahaan']?.trim();

    // Exact name match and company match (or both empty)
    const nameMatch = errorName === employeeName;
    const companyMatch = errorCompany === companyName || (!errorCompany && !companyName);

    return nameMatch && companyMatch;
  });

  let autoResolvedCount = 0;

  for (const similarError of matchingSimilarErrors) {
    try {
      const similarOriginalRow = typeof similarError.originalRow === 'string' ? JSON.parse(similarError.originalRow) : similarError.originalRow;

      // Check for date parsing
      const observationDate = parseExcelDate(similarOriginalRow.Tanggal);
      if (!observationDate) {
        continue;
      }

      // Check for duplicates with both date and time
      const observationTime = similarOriginalRow['Waktu/Jam']?.toString().trim() || null;
      const isDuplicate = await checkDuplicateObservation(employeeId, observationDate, observationTime);
      if (isDuplicate) {
        // Delete the error row since the data already exists
        await db.delete(uploadObservationErrors).where(eq(uploadObservationErrors.id, similarError.id));
        autoResolvedCount++;
        continue;
      }

      // Create observation data
      const observationData = {
        employeeId: employeeId,
        observationDate,
        observationTime: similarOriginalRow['Waktu/Jam'] || null,
        observationFunction: similarOriginalRow['Fungsi / Bagian'] || null,
        observationArea: similarOriginalRow['Area Pengamatan'] || null,
        specificLocation: similarOriginalRow['Lokasi Spesifik'] || null,
        reportCategory: similarOriginalRow['Pilih Kategori Laporan'] || null,
        observedBehavior: similarOriginalRow['Perilaku yang Anda amati'] || null,
        observedAspectCategory: similarOriginalRow['Kategori aspek yang Anda amati'] || null,
        worker: similarOriginalRow['PEKERJA'] || null,
        ppeTypeObserved: similarOriginalRow['Jenis APD yang diamati'] || null,
        unsafePpeCause: similarOriginalRow['Penyebab APD Tidak Aman'] || null,
        equipmentTools: similarOriginalRow['PERALATAN & PERLENGKAPAN'] || null,
        material: similarOriginalRow['MATERIAL'] || null,
        proceduresAdminControl: similarOriginalRow['PROSEDUR & PENGENDALIAN ADMINISTRATIF'] || null,
        workEnvironment: similarOriginalRow['LINGKUNGAN KERJA'] || null,
        unsafeBehaviorDescription: similarOriginalRow['Deskripsikan temuan perilaku TIDAK AMAN yang Anda intervensi'] || null,
        agreedFollowUp: similarOriginalRow['Tindak lanjut yang disepakati'] || null,
        clsr: similarOriginalRow['CLSR'] || null,
        stopWorkAuthority: parseBoolean(similarOriginalRow['Apakah anda memberhentikan pekerjaan ... STOP WORK AUTHORITY / SWA']),
        currentInterventionStatus: similarOriginalRow['Status Intervensi (saat ini)'] || null,
        findingDescription: similarOriginalRow['Uraian Temuan'] || null,
        rootCause: similarOriginalRow['Penyebab Dasar'] || null,
        potentialImpact: similarOriginalRow['Potensi Dampak'] || null,
        currentHandling: similarOriginalRow['Penanganan Saat Ini'] || null,
        followUpHandling: similarOriginalRow['Penanganan Lanjutan (jika ada)'] || null,
        followUpPriority: similarOriginalRow['Prioritas Tindak Lanjut'] || null,
        responsiblePerson: similarOriginalRow['Penanganggung Jawab'] || null,
        ucFindingStatus: similarOriginalRow['Status Temuan UC'] || null,
        what: similarOriginalRow['WHAT'] || null,
        who: similarOriginalRow['WHO'] || null,
        how: similarOriginalRow['HOW'] || null,
        nearMissHandling: similarOriginalRow['Penanganan Near Miss'] || null,
        nearMissCategory: similarOriginalRow['Kategori Near Miss'] || null,
        nearMissPotentialImpact: similarOriginalRow['Potensi Dampak Near Miss'] || null,
        additionalNotes: similarOriginalRow['Catatan / Keterangan Tambahan'] || null,
        clsr2: similarOriginalRow['CLSR2'] || null,
        currentNearMissStatus: similarOriginalRow['Status Near Miss (saat ini)'] || null,
      };

      // Insert observation and mark as resolved
      await db.insert(smartCardObservations).values(observationData);
      await db.update(uploadObservationErrors).set({ status: 'resolved' }).where(eq(uploadObservationErrors.id, similarError.id));

      autoResolvedCount++;

    } catch (error) {
      // Silent error handling
    }
  }

  return { autoResolvedCount };
}

export async function reprocessErrorGroup(groupRepresentativeId: string, employeeId?: string) {
  // Get the representative error to find group information
  const [representativeError] = await db.select().from(uploadObservationErrors).where(eq(uploadObservationErrors.id, groupRepresentativeId));
  if (!representativeError) {
    throw new Error('Representative error row not found');
  }

  const representativeRow = typeof representativeError.originalRow === 'string' ? JSON.parse(representativeError.originalRow) : representativeError.originalRow;
  const employeeName = representativeRow.Nama?.trim();
  const companyName = representativeRow['Nama Perusahaan']?.trim();

  // Find all errors in the same group
  const allErrors = await db.select().from(uploadObservationErrors).where(eq(uploadObservationErrors.status, 'error'));
  const groupErrors = allErrors.filter(error => {
    const errorRow = typeof error.originalRow === 'string' ? JSON.parse(error.originalRow) : error.originalRow;
    const errorName = errorRow.Nama?.trim();
    const errorCompany = errorRow['Nama Perusahaan']?.trim();

    return errorName === employeeName && errorCompany === companyName;
  });

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const groupError of groupErrors) {
    try {
      const originalRow = typeof groupError.originalRow === 'string' ? JSON.parse(groupError.originalRow) : groupError.originalRow;

      let processedRow: any;

      if (employeeId) {
        // Manual employee ID provided - create observation data directly
        const observationDate = parseExcelDate(originalRow.Tanggal);
        if (!observationDate) {
          skipCount++;
          continue;
        }

        // Check for duplicates with both date and time
        const observationTime = originalRow['Waktu/Jam']?.toString().trim() || null;
        const isDuplicate = await checkDuplicateObservation(employeeId, observationDate, observationTime);
        if (isDuplicate) {
          // Delete the error row since the data already exists
          await db.delete(uploadObservationErrors).where(eq(uploadObservationErrors.id, groupError.id));
          skipCount++;
          continue;
        }

        const observationData = {
          employeeId: employeeId,
          observationDate,
          observationTime: originalRow['Waktu/Jam'] || null,
          observationFunction: originalRow['Fungsi / Bagian'] || null,
          observationArea: originalRow['Area Pengamatan'] || null,
          specificLocation: originalRow['Lokasi Spesifik'] || null,
          reportCategory: originalRow['Pilih Kategori Laporan'] || null,
          observedBehavior: originalRow['Perilaku yang Anda amati'] || null,
          observedAspectCategory: originalRow['Kategori aspek yang Anda amati'] || null,
          worker: originalRow['PEKERJA'] || null,
          ppeTypeObserved: originalRow['Jenis APD yang diamati'] || null,
          unsafePpeCause: originalRow['Penyebab APD Tidak Aman'] || null,
          equipmentTools: originalRow['PERALATAN & PERLENGKAPAN'] || null,
          material: originalRow['MATERIAL'] || null,
          proceduresAdminControl: originalRow['PROSEDUR & PENGENDALIAN ADMINISTRATIF'] || null,
          workEnvironment: originalRow['LINGKUNGAN KERJA'] || null,
          unsafeBehaviorDescription: originalRow['Deskripsikan temuan perilaku TIDAK AMAN yang Anda intervensi'] || null,
          agreedFollowUp: originalRow['Tindak lanjut yang disepakati'] || null,
          clsr: originalRow['CLSR'] || null,
          stopWorkAuthority: parseBoolean(originalRow['Apakah anda memberhentikan pekerjaan ... STOP WORK AUTHORITY / SWA']),
          currentInterventionStatus: originalRow['Status Intervensi (saat ini)'] || null,
          findingDescription: originalRow['Uraian Temuan'] || null,
          rootCause: originalRow['Penyebab Dasar'] || null,
          potentialImpact: originalRow['Potensi Dampak'] || null,
          currentHandling: originalRow['Penanganan Saat Ini'] || null,
          followUpHandling: originalRow['Penanganan Lanjutan (jika ada)'] || null,
          followUpPriority: originalRow['Prioritas Tindak Lanjut'] || null,
          responsiblePerson: originalRow['Penanganggung Jawab'] || null,
          ucFindingStatus: originalRow['Status Temuan UC'] || null,
          what: originalRow['WHAT'] || null,
          who: originalRow['WHO'] || null,
          how: originalRow['HOW'] || null,
          nearMissHandling: originalRow['Penanganan Near Miss'] || null,
          nearMissCategory: originalRow['Kategori Near Miss'] || null,
          nearMissPotentialImpact: originalRow['Potensi Dampak Near Miss'] || null,
          additionalNotes: originalRow['Catatan / Keterangan Tambahan'] || null,
          clsr2: originalRow['CLSR2'] || null,
          currentNearMissStatus: originalRow['Status Near Miss (saat ini)'] || null,
        };

        processedRow = {
          isValid: true,
          employeeId: employeeId,
          observationData,
          originalRow
        };

      } else {
        // Auto-match attempt
        processedRow = await processRow(originalRow);
      }

      if (processedRow.isValid) {
        await db.insert(smartCardObservations).values(processedRow.observationData!);
        await db.update(uploadObservationErrors).set({ status: 'resolved' }).where(eq(uploadObservationErrors.id, groupError.id));
        successCount++;
      } else {
        errorCount++;
      }

    } catch (error) {
      errorCount++;
    }
  }

  const message = `Group processing complete: ${successCount} observations created${skipCount > 0 ? `, ${skipCount} duplicates automatically removed` : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}.`;

  return { success: true, message, stats: { successCount, skipCount, errorCount } };
}

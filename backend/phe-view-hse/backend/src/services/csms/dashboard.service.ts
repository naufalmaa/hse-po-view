import { db } from "../../db/index.ts";
import { contract, contractFolder, qualification_assessment } from "../../db/schema/csms.schema.ts";
import { subContractors, vessels } from "../../db/schema/auth.schema.ts";
import { count, eq, and, or, sql, inArray, like, notLike, gte, lte } from "drizzle-orm";
import { isFolderStructureComplete } from "./contract/folder-completion.service.ts";
import { getK3LLScoreableFolders } from "./contract/k3ll-structure.service.ts";

/**
 * Get dashboard metrics for CSMS
 * @param year Optional year or array of years to filter contracts
 * @param contractorId Optional contractor ID or array of contractor IDs to filter contracts
 * @returns Object containing all dashboard metrics
 */
export async function getCSMSDashboardMetrics(year?: number | number[], contractorId?: string | string[]) {
  // Build conditions for filtering
  const conditions = [];

  // Add year condition if provided
  const years = year ? (Array.isArray(year) ? year : [year]) : [];
  if (years.length > 0) {
    const yearConditions = years.map(y =>
      and(
        gte(contract.endDate, `${y}-01-01`),
        lte(contract.startDate, `${y}-12-31`)
      )
    );
    conditions.push(or(...yearConditions));
  }

  // Add contractor ID condition if provided
  if (contractorId) {
    const contractorIds = Array.isArray(contractorId) ? contractorId : [contractorId];
    if (contractorIds.length > 0) {
      conditions.push(inArray(contract.contractorId, contractorIds));
    }
  }

  // 1. Get filtered contracts
  const filteredContracts = await db.query.contract.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined
  });

  const filteredContractIds = filteredContracts.map(c => c.id);

  // 2. Initial counts
  let totalFiles = 0;
  let notExpiredQualifications = 0;
  let expiredQualifications = 0;
  let contractsWithOngoingAssessments = 0;
  let contractsWithAllFoldersComplete = 0;
  let contractsWithPaFinal = 0;

  if (filteredContractIds.length > 0) {
    // 2.1 Count total files in one query
    const totalFilesResult = await db
      .select({ count: count() })
      .from(contractFolder)
      .where(and(
        eq(contractFolder.fileType, 'file'),
        inArray(contractFolder.contractId, filteredContractIds)
      ));
    totalFiles = totalFilesResult[0]?.count ?? 0;

    // 2.2 Count qualifications in bulk
    const currentDate = new Date();
    const contractorIds = Array.isArray(contractorId) ? contractorId : (contractorId ? [contractorId] : []);

    const qualConditions = [];
    if (contractorIds.length > 0) {
      qualConditions.push(inArray(qualification_assessment.contractorId, contractorIds));
    }

    const qualResults = await db
      .select({ expiredDate: qualification_assessment.expiredDate })
      .from(qualification_assessment)
      .where(qualConditions.length > 0 ? and(...qualConditions) : undefined);

    qualResults.forEach(r => {
      if (r.expiredDate && new Date(r.expiredDate) < currentDate) expiredQualifications++;
      else notExpiredQualifications++;
    });

    // 3. Batch process contracts for assessments and folder completion
    // Fetch all relevant assessment folders for ALL contracts in one query
    const allFolders = await db.query.contractFolder.findMany({
      where: inArray(contractFolder.contractId, filteredContractIds)
    });

    // Group folders by contract for processing
    const foldersByContract = allFolders.reduce((acc: Record<string, any[]>, f) => {
      if (!acc[f.contractId]) acc[f.contractId] = [];
      acc[f.contractId].push(f);
      return acc;
    }, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each contract in memory
    for (const contractId of filteredContractIds) {
      const contractFolders = foldersByContract[contractId] || [];
      const assessmentFolders = contractFolders.filter(f =>
        f.name.endsWith(' - PB') || f.name.endsWith(' - PA') || f.name.endsWith(' - PSB')
      );

      let hasOngoing = false;
      let allComp = true;

      for (const folder of assessmentFolders) {
        // Calculate isEnabled based on folder date (assuming name starts with DD-MM-YYYY)
        const dateStr = folder.name.substring(0, 10);
        const [day, month, year] = dateStr.split('-');
        const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        folderDate.setHours(0, 0, 0, 0);
        const isEnabled = folderDate <= today;

        // Use database value if present, fallback to folder check (optimization: trust DB status if available)
        let isComplete = folder.isComplete;
        if (isComplete === null || isComplete === undefined) {
          // This is still a bit heavy, but it's now only for folders with NULL status
          isComplete = await isFolderStructureComplete(folder.id);
        }

        if (isEnabled && !isComplete) hasOngoing = true;
        if (isEnabled && !isComplete) allComp = false;
      }

      // Also check non-assessment folders for "allComp"
      if (allComp) {
        for (const folder of contractFolders) {
          const isAssessment = folder.name.endsWith(' - PB') || folder.name.endsWith(' - PA') || folder.name.endsWith(' - PSB');
          if (isAssessment) continue;
          if (!folder.parentId) continue; // skip root

          if (folder.isComplete === false) {
            allComp = false;
            break;
          }
          if (folder.isComplete === null) {
            // Check if folder has files (one more small query, still better than full loop)
            const filesInFolder = contractFolders.some(f => f.parentId === folder.id && f.fileType === 'file');
            if (!filesInFolder) {
              allComp = false;
              break;
            }
          }
        }
      }

      if (hasOngoing) contractsWithOngoingAssessments++;
      if (allComp && contractFolders.length > 0) contractsWithAllFoldersComplete++;

      const hasPaFinal = contractFolders.some(f => f.name.endsWith(' - PA') && f.isFinal === true);
      if (hasPaFinal) {
        contractsWithPaFinal++;
      }
    }
  }

  // 4. Count unique contractors
  let totalContractors = 0;
  const hasContractorFilter = contractorId && (Array.isArray(contractorId) ? contractorId.length > 0 : true);

  if (hasContractorFilter) {
    totalContractors = Array.isArray(contractorId) ? contractorId.length : 1;
  } else {
    const uniqueContractorsResult = await db
      .select({ count: count() })
      .from(
        db.selectDistinct({ contractorId: contract.contractorId })
          .from(contract)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .as('distinct_contractors')
      );
    totalContractors = uniqueContractorsResult[0]?.count ?? 0;
  }

  // 5. Completion Percentage
  const totalContractCount = filteredContracts.length;
  const completionPercentage = totalContractCount > 0 ? (contractsWithPaFinal / totalContractCount) * 100 : 0;

  // 6. Parallel fetch for activity counts
  const [ongoingActivitiesCount, incomingActivitiesCount] = await Promise.all([
    getOngoingActivitiesCount(filteredContractIds, years),
    getIncomingActivitiesCount(filteredContractIds, years)
  ]);

  return {
    totalFilesUploaded: totalFiles,
    qualificationAssessments: {
      notExpired: notExpiredQualifications,
      expired: expiredQualifications
    },
    contracts: {
      withOngoingAssessments: contractsWithOngoingAssessments,
      withAllFoldersComplete: contractsWithPaFinal
    },
    totalContractors,
    completionPercentage: parseFloat(completionPercentage.toFixed(2)),
    ongoingActivitiesCount,
    incomingActivitiesCount
  };
}

/**
 * Get incoming activities (folders that are not enabled yet but will be soon)
 * @param contractIds 
 * @param filteredYears Optional array of years to filter by
 * @param page Optional page number (0-based)
 * @param limit Optional number of items per page
 * @returns Array of incoming activity logs with metadata
 */
export async function getIncomingActivities(contractIds: string[], filteredYears?: number[], page?: number, limit?: number) {
  if (contractIds.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        folderCount: 0,
        page: page || 0,
        view: limit || 0,
        totalPages: 0
      }
    };
  }

  const incomingLogs = [];
  const folderIds = new Set<string>(); // To track unique folders

  // Get assessment folders that are not enabled yet
  const folders = await db.query.contractFolder.findMany({
    where: (fields, { inArray, and, or, like }) =>
      and(
        inArray(fields.contractId, contractIds),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      )
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsFromNow = new Date(today);
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  // Set to end of day to be inclusive
  threeMonthsFromNow.setHours(23, 59, 59, 999);

  // Process folders that are not enabled yet but will be within 3 months
  for (const folder of folders) {
    // Calculate isEnabled based on folder date
    const dateStr = folder.name.substring(0, 10); // DD-MM-YYYY
    const [day, month, year] = dateStr.split('-');
    const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    folderDate.setHours(0, 0, 0, 0);

    // Check if the activity's year is within the filtered years
    if (filteredYears && filteredYears.length > 0) {
      if (!filteredYears.includes(parseInt(year))) {
        continue;
      }
    }

    const isEnabled = folderDate <= today;

    // Get isComplete status
    let isComplete = folder.isComplete;
    if (isComplete === null || isComplete === undefined) {
      isComplete = await isFolderStructureComplete(folder.id);
    }

    // If folder is not enabled yet but will be within 3 months, add to incoming logs
    // This matches the logic in getIncomingActivitiesCount
    if (!isEnabled && folderDate <= threeMonthsFromNow && !isComplete) {
      folderIds.add(folder.id); // Track this folder

      incomingLogs.push({
        id: `${folder.id}-segera_aktif`,
        folderId: folder.id,
        folderName: folder.name,
        contractId: folder.contractId,
        action: 'segera_aktif',
        timestamp: folderDate,
        user: 'system',
        details: `Folder "${folder.name}" akan segera aktif.`
      });
    }
  }

  // Sort by timestamp ascending (soonest first)
  incomingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate metadata
  const total = incomingLogs.length;
  const folderCount = folderIds.size;

  // Apply pagination only if limit is provided
  if (limit && limit > 0) {
    const p = page || 0;
    const offset = p * limit;
    const paginatedLogs = incomingLogs.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        folderCount,
        page: p,
        view: limit,
        totalPages
      }
    };
  }

  return {
    data: incomingLogs,
    meta: {
      total,
      folderCount,
      page: 0,
      view: total,
      totalPages: 1
    }
  };
}


/**
 * Get count of ongoing activities
 * @param contractIds 
 * @param filteredYears Optional array of years to filter by
 * @returns Count of ongoing activities (logs)
 */
async function getOngoingActivitiesCount(contractIds: string[], filteredYears?: number[]) {
  if (contractIds.length === 0) return 0;
  const result = await getOngoingActivities(contractIds, filteredYears);
  return result.meta.total;
}

/**
 * Get count of incoming activities (folders that are not enabled but will be in 3 months)
 * @param contractIds 
 * @param filteredYears Optional array of years to filter by
 * @returns Count of incoming activities
 */
async function getIncomingActivitiesCount(contractIds: string[], filteredYears?: number[]) {
  if (contractIds.length === 0) return 0;
  const result = await getIncomingActivities(contractIds, filteredYears);
  return result.meta.total;
}

/**
 * Get folder ongoingLogs logs (created, updated, deleted, file uploads)
 * @param contractIds 
 * @param filteredYears Optional array of years to filter by
 * @param page Optional page number (0-based)
 * @param limit Optional number of items per page
 * @returns Array of folder activity logs with pagination metadata
 */
export async function getOngoingActivities(contractIds: string[], filteredYears?: number[], page?: number, limit?: number) {
  if (contractIds.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        folderCount: 0,
        page: page || 0,
        view: limit || 0,
        totalPages: 0
      }
    };
  }

  // Get assessment folders that are enabled but not complete (matching getOngoingActivitiesCount logic)
  const folders = await db.query.contractFolder.findMany({
    where: (fields, { inArray, and, or, like }) =>
      and(
        inArray(fields.contractId, contractIds),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      )
  });

  const ongoingLogs = [];
  const folderIds = new Set<string>(); // To track unique folders

  // Process folders that are enabled but not complete (matching getOngoingActivitiesCount logic)
  for (const folder of folders) {
    // Calculate isEnabled based on folder date
    const dateStr = folder.name.substring(0, 10); // DD-MM-YYYY
    const [day, month, year] = dateStr.split('-');
    const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Check if the activity's year is within the filtered years
    if (filteredYears && filteredYears.length > 0) {
      if (!filteredYears.includes(parseInt(year))) {
        continue;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isEnabled = folderDate <= today;

    // Get isComplete status
    let isComplete = folder.isComplete;
    if (isComplete === null || isComplete === undefined) {
      isComplete = await isFolderStructureComplete(folder.id);
    }

    // If folder is enabled but not complete, add to ongoing logs (matching getOngoingActivitiesCount logic)
    if (isEnabled && !isComplete) {
      folderIds.add(folder.id); // Track this folder

      // Add creation log
      ongoingLogs.push({
        id: `${folder.id}-dibuat`,
        folderId: folder.id,
        folderName: folder.name,
        contractId: folder.contractId,
        action: 'dibuat',
        timestamp: folder.createdAt,
        user: 'system',
        details: `Folder "${folder.name}" telah dibuat`
      });

      // Add update log if folder was updated
      if (folder.updatedAt > folder.createdAt) {
        ongoingLogs.push({
          id: `${folder.id}-diperbarui`,
          folderId: folder.id,
          folderName: folder.name,
          contractId: folder.contractId,
          action: 'diperbarui',
          timestamp: folder.updatedAt,
          user: 'system',
          details: `Folder "${folder.name}" telah diperbarui`
        });
      }

      // Add file upload logs if folder has files
      if (folder.fileType === 'file' && folder.filePath) {
        ongoingLogs.push({
          id: `${folder.id}-diunggah`,
          folderId: folder.id,
          folderName: folder.name,
          contractId: folder.contractId,
          action: 'unggah_file',
          timestamp: folder.updatedAt,
          user: 'user',
          details: `File telah diunggah ke folder "${folder.name}"`
        });
      }

      // Add completion status change logs
      if (folder.isComplete !== null) {
        ongoingLogs.push({
          id: `${folder.id}-ubah_status_penyelesaian`,
          folderId: folder.id,
          folderName: folder.name,
          contractId: folder.contractId,
          action: 'ubah_status_penyelesaian',
          timestamp: folder.updatedAt,
          user: 'system',
          details: `Status penyelesaian folder "${folder.name}" berubah menjadi ${folder.isComplete ? 'selesai' : 'belum selesai'}`
        });
      }
    }
  }

  // Sort by timestamp ascending
  ongoingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate pagination metadata
  const total = ongoingLogs.length;
  const folderCount = folderIds.size; // Number of unique folders

  // Apply pagination only if limit is provided
  if (limit && limit > 0) {
    const p = page || 0;
    const offset = p * limit;
    const paginatedLogs = ongoingLogs.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        folderCount,
        page: p,
        view: limit,
        totalPages
      }
    };
  }

  return {
    data: ongoingLogs,
    meta: {
      total,
      folderCount,
      page: 0,
      view: total,
      totalPages: 1
    }
  };
}

/**
 * Get completion rate breakdown by year and semester
 * @param year Optional year or array of years to filter contracts
 * @param contractorId Optional contractor ID or array of contractor IDs to filter contracts
 * @returns Completion rate breakdown by year and semester
 */
export async function getCompletionRateBreakdown(year?: number | number[], contractorId?: string | string[]) {
  // Build conditions for filtering
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

  // 1. Get filtered contracts
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

  const contractIds = filteredContracts.map(c => c.id);
  if (contractIds.length === 0) return { breakdown: [], performance: { pbSemester1: 0, pbSemester2: 0, paYearly: 0, totalPerformance: 0 } };

  // 2. Fetch all assessment folders in bulk
  const allAssessmentFolders = await db.query.contractFolder.findMany({
    where: and(
      inArray(contractFolder.contractId, contractIds),
      like(contractFolder.name, '% - %'),
      notLike(contractFolder.name, '% - PSB')
    )
  });

  const yearsToInclude = (year && Array.isArray(year) && year.length > 0) ? year :
    (year && !Array.isArray(year)) ? [year] : null;

  // 3. Fetch all element scores in bulk for these folders
  // First, find all "A. RENCANA K3LL" folders
  const rencanaFolders = await db.query.contractFolder.findMany({
    where: and(
      inArray(contractFolder.parentId, allAssessmentFolders.map(f => f.id)),
      eq(contractFolder.name, "A. RENCANA K3LL")
    )
  });

  // Group descendants by assessment folder for filling progress and element scores
  const descendantsByFolderId: Record<string, any[]> = {};
  const elementScoresByFolderId: Record<string, Record<string, number | null>> = {};

  if (rencanaFolders.length > 0) {
    const allDescendants = await db.query.contractFolder.findMany({
      where: or(...rencanaFolders.map(rf => sql`${contractFolder.path} <@ ${rf.path}::ltree`))
    });

    for (const rf of rencanaFolders) {
      const assessmentFolderId = rf.parentId!;
      const rfDescendants = allDescendants.filter(d => d.path.startsWith(rf.path));
      descendantsByFolderId[assessmentFolderId] = rfDescendants;

      elementScoresByFolderId[assessmentFolderId] = {};
      for (const d of rfDescendants) {
        if (d.score !== null && d.score !== undefined) {
          const s = parseFloat(d.score.toString());
          elementScoresByFolderId[assessmentFolderId][d.name] = (!isNaN(s) && s !== -1) ? s : null;
        }
      }
    }
  }

  // 4. Process categorization in memory
  const assessmentsByYear: Record<number, { semester1Items: any[], semester2Items: any[] }> = {};
  const currentYear = new Date().getFullYear();

  for (const folder of allAssessmentFolders) {
    const contractItem = filteredContracts.find(c => c.id === folder.contractId);
    if (!contractItem) continue;

    const dateStr = folder.name.substring(0, 10);
    const [day, month, folderYear] = dateStr.split('-');
    const assessmentYear = parseInt(folderYear);
    if (isNaN(assessmentYear) || assessmentYear > currentYear) continue;
    if (yearsToInclude && !yearsToInclude.includes(assessmentYear)) continue;

    if (!assessmentsByYear[assessmentYear]) {
      assessmentsByYear[assessmentYear] = { semester1Items: [], semester2Items: [] };
    }

    const folderDate = new Date(assessmentYear, parseInt(month) - 1, parseInt(day));
    const folderMonth = folderDate.getMonth() + 1;

    let scoreNum = (folder.score !== null && folder.score !== undefined) ? parseFloat(folder.score.toString()) : null;
    if (scoreNum !== null && (isNaN(scoreNum) || scoreNum === -1)) scoreNum = null;

    // Calculate filling progress (1-8) in-memory
    let filledCount = 0;
    const folderDescendants = descendantsByFolderId[folder.id] || [];
    const rencanaK3LLRoot = rencanaFolders.find(rf => rf.parentId === folder.id);

    if (rencanaK3LLRoot) {
      for (let i = 1; i <= 8; i++) {
        const prefix = `${i} `;
        const k3llFolder = folderDescendants.find(d => d.parentId === rencanaK3LLRoot.id && d.name.startsWith(prefix));
        if (k3llFolder) {
          const hasFiles = folderDescendants.some(d => d.fileType === 'file' && d.path.startsWith(k3llFolder.path));
          if (hasFiles) filledCount++;
        }
      }
    }
    const fillingProgress = Math.round((filledCount / 8) * 100);

    const completionItem = {
      contractId: contractItem.id,
      contractTitle: contractItem.title,
      contractNumber: contractItem.numberContract,
      contractfolderName: folder.name,
      dateAssessment: `${assessmentYear}-${String(folderMonth).padStart(2, '0')}-${String(folderDate.getDate()).padStart(2, '0')}`,
      isComplete: folder.isComplete ?? false,
      fillingProgress,
      isFinal: !!folder.isFinal,
      vendorName: contractItem.vendorName ?? null,
      vesselName: contractItem.vesselName ?? null,
      score: scoreNum,
      passStatus: scoreNum !== null ? (scoreNum >= 60 ? 'lulus' : 'tidak lulus') : null,
      elementScores: elementScoresByFolderId[folder.id] || {}
    };

    if (folderMonth <= 6) assessmentsByYear[assessmentYear].semester1Items.push(completionItem);
    else assessmentsByYear[assessmentYear].semester2Items.push(completionItem);
  }

  // Finalize result structure
  if (yearsToInclude) {
    for (const y of yearsToInclude) {
      if (!assessmentsByYear[y]) assessmentsByYear[y] = { semester1Items: [], semester2Items: [] };
    }
  }

  const result = [];
  const sortedYears = Object.keys(assessmentsByYear).map(Number).sort((a, b) => a - b);

  for (const yearNum of sortedYears) {
    const { semester1Items, semester2Items } = assessmentsByYear[yearNum];

    semester1Items.sort((a, b) => new Date(a.dateAssessment).getTime() - new Date(b.dateAssessment).getTime());
    semester2Items.sort((a, b) => new Date(a.dateAssessment).getTime() - new Date(b.dateAssessment).getTime());

    const calculateRate = (items: any[]) => {
      const unique = new Set(items.map(i => i.contractTitle)).size;
      const finalized = new Set(items.filter(i => i.isFinal).map(i => i.contractTitle)).size;
      return unique > 0 ? Math.round((finalized / unique) * 100) : 0;
    };

    result.push({
      year: yearNum,
      semester1: { completionRate: calculateRate(semester1Items), items: semester1Items },
      semester2: { completionRate: calculateRate(semester2Items), items: semester2Items }
    });
  }
  // Calculate Performance Metrics (Aggregate across all years/filtered data)
  const allS1Items = result.flatMap(y => y.semester1.items);
  const allS2Items = result.flatMap(y => y.semester2.items);

  const calculatePerformance = (items: any[]) => {
    if (items.length === 0) return 0;
    const finalizedCount = items.filter(i => i.isFinal).length;
    return Math.round((finalizedCount / items.length) * 100);
  };

  const pbS1Items = allS1Items.filter(i => i.contractfolderName.endsWith(' - PB'));
  const pbS2Items = allS2Items.filter(i => i.contractfolderName.endsWith(' - PB'));
  const paItems = [...allS1Items, ...allS2Items].filter(i => i.contractfolderName.endsWith(' - PA'));

  const pbS1Performance = calculatePerformance(pbS1Items);
  const pbS2Performance = calculatePerformance(pbS2Items);
  const paPerformance = calculatePerformance(paItems);
  const totalPerformance = Math.round((pbS1Performance + pbS2Performance + paPerformance) / 3);

  return {
    breakdown: result,
    performance: {
      pbSemester1: pbS1Performance,
      pbSemester2: pbS2Performance,
      paYearly: paPerformance,
      totalPerformance
    }
  };
}

/**
 * Get element breakdown by company
 */
export async function getElementBreakdownByCompany(year?: number | number[], contractorId?: string | string[]) {
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
    if (contractorIds.length > 0) conditions.push(inArray(contract.contractorId, contractorIds));
  }

  const filteredContracts = await db
    .select({
      id: contract.id,
      vendorName: subContractors.name,
      vesselName: vessels.vesselName,
    })
    .from(contract)
    .leftJoin(subContractors, eq(contract.contractorId, subContractors.id))
    .innerJoin(vessels, eq(contract.vesselId, vessels.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  if (filteredContracts.length === 0) return { elements: [], semester1: [], semester2: [], penilaianAkhir: [] };

  const contractIds = filteredContracts.map(c => c.id);
  const allFolders = await db.query.contractFolder.findMany({
    where: and(
      inArray(contractFolder.contractId, contractIds),
      eq(contractFolder.depth, 0),
      or(
        like(contractFolder.name, '% - PB'),
        like(contractFolder.name, '% - PA')
      )
    )
  });

  const pbFolders = allFolders.filter(f => f.name.endsWith(' - PB'));
  const paFolders = allFolders.filter(f => f.name.endsWith(' - PA'));

  const yearsToInclude = year ? (Array.isArray(year) ? year : [year]) : null;
  const filteredPbFolders = pbFolders.filter(f => {
    const folderYear = parseInt(f.name.substring(6, 10)); // DD-MM-YYYY
    return !yearsToInclude || yearsToInclude.includes(folderYear);
  });
  const filteredPaFolders = paFolders.filter(f => {
    const folderYear = parseInt(f.name.substring(6, 10)); // DD-MM-YYYY
    return !yearsToInclude || yearsToInclude.includes(folderYear);
  });

  // Bulk fetch "A. RENCANA K3LL" descendants
  const elementScoresByFolderId: Record<string, Record<string, number | null>> = {};
  const rencanaK3LLScoreByFolderId: Record<string, number | null> = {};

  const allTargetFolders = [...filteredPbFolders, ...filteredPaFolders];
  if (allTargetFolders.length > 0) {
    const rencanaFolders = await db.query.contractFolder.findMany({
      where: and(inArray(contractFolder.parentId, allTargetFolders.map(f => f.id)), eq(contractFolder.name, "A. RENCANA K3LL"))
    });

    if (rencanaFolders.length > 0) {
      for (const rf of rencanaFolders) {
        const parentFolderId = rf.parentId!;
        rencanaK3LLScoreByFolderId[parentFolderId] = rf.score ? parseFloat(rf.score.toString()) : null;
      }

      const descendants = await db.query.contractFolder.findMany({
        where: or(...rencanaFolders.map(rf => sql`${contractFolder.path} <@ ${rf.path}::ltree`))
      });

      for (const rf of rencanaFolders) {
        const parentFolderId = rf.parentId!;
        elementScoresByFolderId[parentFolderId] = {};
        const rfDescendants = descendants.filter(d => d.path.startsWith(rf.path) && d.fileType !== 'file');
        for (const d of rfDescendants) {
          if (d.score !== null) {
            const s = parseFloat(d.score.toString());
            elementScoresByFolderId[parentFolderId][d.name] = !isNaN(s) ? s : null;
          }
        }
      }
    }
  }

  const k3llElements = getK3LLScoreableFolders();
  const flattenElements = (items: any[]): any[] => items.reduce((acc, i) => [...acc, i, ...(i.children ? flattenElements(i.children) : [])], []);
  const allScoreableNames = flattenElements(k3llElements).map(e => e.name);

  const s1Contracts: any[] = [];
  const s2Contracts: any[] = [];
  const paContracts: any[] = [];

  const parseDate = (name: string) => {
    const [d, m, y] = name.substring(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  for (const cItem of filteredContracts) {
    const cPbFolders = filteredPbFolders.filter(f => f.contractId === cItem.id);
    const cPaFolders = filteredPaFolders.filter(f => f.contractId === cItem.id);

    const s1F = cPbFolders
      .filter(f => {
        const m = parseInt(f.name.substring(3, 5));
        return m >= 1 && m <= 6;
      })
      .sort((a, b) => parseDate(b.name).getTime() - parseDate(a.name).getTime())[0];

    const s2F = cPbFolders
      .filter(f => {
        const m = parseInt(f.name.substring(3, 5));
        return m >= 7 && m <= 12;
      })
      .sort((a, b) => parseDate(b.name).getTime() - parseDate(a.name).getTime())[0];

    const paF = cPaFolders
      .sort((a, b) => parseDate(b.name).getTime() - parseDate(a.name).getTime())[0];

    const format = (f: any) => ({
      id: cItem.id,
      score: f.score ? parseFloat(f.score.toString()) : null,
      rencanaK3LLScore: rencanaK3LLScoreByFolderId[f.id] !== undefined ? rencanaK3LLScoreByFolderId[f.id] : null,
      vendorName: cItem.vendorName || 'N/A',
      vesselName: cItem.vesselName || '—',
      elementScores: elementScoresByFolderId[f.id] || {}
    });

    if (s1F) {
      let isComplete = s1F.isComplete;
      if (isComplete === null || isComplete === undefined) {
        isComplete = await isFolderStructureComplete(s1F.id);
      }
      const scores = elementScoresByFolderId[s1F.id] || {};
      const allZeroOrNull = allScoreableNames.every(name => {
        const val = scores[name];
        return val === null || val === undefined || val === 0;
      });

      if (isComplete !== false && !allZeroOrNull) {
        s1Contracts.push(format(s1F));
      }
    }

    if (s2F) {
      let isComplete = s2F.isComplete;
      if (isComplete === null || isComplete === undefined) {
        isComplete = await isFolderStructureComplete(s2F.id);
      }
      const scores = elementScoresByFolderId[s2F.id] || {};
      const allZeroOrNull = allScoreableNames.every(name => {
        const val = scores[name];
        return val === null || val === undefined || val === 0;
      });

      if (isComplete !== false && !allZeroOrNull) {
        s2Contracts.push(format(s2F));
      }
    }

    if (paF) {
      let isComplete = paF.isComplete;
      if (isComplete === null || isComplete === undefined) {
        isComplete = await isFolderStructureComplete(paF.id);
      }
      const scores = elementScoresByFolderId[paF.id] || {};
      const allZeroOrNull = allScoreableNames.every(name => {
        const val = scores[name];
        return val === null || val === undefined || val === 0;
      });

      if (isComplete !== false && !allZeroOrNull) {
        paContracts.push(format(paF));
      }
    }
  }

  const activeElementNames = allScoreableNames.filter(name => [...s1Contracts, ...s2Contracts, ...paContracts].some(c => c.elementScores[name] !== undefined));

  return { elements: activeElementNames, semester1: s1Contracts, semester2: s2Contracts, penilaianAkhir: paContracts };
}


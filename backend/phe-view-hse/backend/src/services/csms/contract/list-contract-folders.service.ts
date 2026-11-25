import { db } from "../../../db/index.ts";
import { contract, contractFolder, evaluationEmailLog } from "../../../db/schema/csms.schema.ts";
import { subContractors, vessels } from "../../../db/schema/auth.schema.ts";
import { eq, asc, sql, and, or, inArray } from "drizzle-orm";
import { isFolderStructureComplete, updateFolderCompletionStatus, isK3LLFolderComplete } from "./folder-completion.service.ts";
import { getApprovalSummary } from "./approval.service.ts";
import type { BaseFolder } from '../../../types/contract.ts';
import { getK3LLScoreableNames } from './k3ll-structure.service.ts';
import { buildFolderTree } from "../../../utils/tree.ts";
import { users } from "../../../db/schema/auth.schema.ts";
import { collectNoteAuthorIds, noteAuthorOf } from "./note-author.rules.ts";
/**
 * Check if all scoreable folders within a hierarchy have been assessed.
 * A folder is scoreable if its name matches the pattern in line 219:
 * /^([12])\s/ or /^([1-8])\.(\d+)/
 * 
 * @param folderId The ID of the folder to check (usually depth 0 assessment folder)
 * @returns Boolean indicating if all scoreable descendants have scores and non-pending status
 */
async function areAllChildrenAssessedWithValues(folderId: string, existingAllItems?: any[]): Promise<boolean> {
  let allItems = existingAllItems;
  if (!allItems) {
    const folder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, folderId)
    });
    if (!folder) return false;
    allItems = await db.query.contractFolder.findMany({
      where: eq(contractFolder.contractId, folder.contractId)
    });
  }

  const childFolders = allItems.filter(f => f.parentId === folderId && f.fileType === 'folder');
  const rencanaK3LL = childFolders.find(f => f.name === 'A. RENCANA K3LL');

  const catFolders = (rencanaK3LL
    ? allItems.filter(f => f.parentId === rencanaK3LL.id && f.fileType === 'folder')
    : childFolders
  ).filter(f => /^[1-8]\s/.test(f.name));

  if (catFolders.length === 0) {
    return false;
  }

  // 1. Categories 1 and 2
  const cat1and2 = catFolders.filter(f => /^[12]\s/.test(f.name));

  // 2. Standard subcategories under categories 3..8 (only direct children matching /^[3-8]\.\d+/)
  const cat3to8 = catFolders.filter(f => /^[3-8]\s/.test(f.name));
  const standardSubcats = allItems.filter(f =>
    f.fileType === 'folder' &&
    cat3to8.some(cat => cat.id === f.parentId) &&
    /^[3-8]\.\d+/.test(f.name)
  );

  const standardScoreable = [...cat1and2, ...standardSubcats];
  if (standardScoreable.length === 0) {
    return false;
  }

  // Verify each standard scoreable item has a valid numeric score (status does not block finalization)
  for (const item of standardScoreable) {
    if (item.score === null || item.score === undefined) {
      return false;
    }
    const val = typeof item.score === 'string' ? parseFloat(item.score) : item.score;
    if (isNaN(val)) {
      return false;
    }
  }

  return true;
}

/**
 * Get contract with assessment dates
 * @param contractId 
 * @returns Contract data or null if not found
 */
export async function getContractWithAssessmentDates(contractId: string) {
  const [result] = await db
    .select({
      id: contract.id,
      contractorId: contract.contractorId,
      contractorName: subContractors.name,
      category: subContractors.category,
      vesselId: contract.vesselId,
      vesselName: vessels.vesselName,
      title: contract.title,
      numberContract: contract.numberContract,
      riskAssessmentId: contract.riskAssessmentId,
      riskLevel: contract.riskLevel,
      startDate: contract.startDate,
      endDate: contract.endDate,
      nearestOngoingAssessmentDate: contract.nearestOngoingAssessmentDate,
      finalAssessmentDate: contract.finalAssessmentDate,
      note: contract.note,
      extra: contract.extra,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
    .from(contract)
    .leftJoin(subContractors, eq(contract.contractorId, subContractors.id))
    .leftJoin(vessels, eq(contract.vesselId, vessels.id))
    .where(eq(contract.id, contractId));

  return result || null;
}

/**
 * Get contract folders with custom sorting
 * @param contractId 
 * @returns Sorted folders
 */
export async function getContractFoldersSorted(contractId: string) {
  return await db.query.contractFolder.findMany({
    where: eq(contractFolder.contractId, contractId),
    orderBy: [
      asc(contractFolder.path), // Primary sort by path to maintain hierarchy
      asc(
        sql`CASE 
          WHEN name = 'A. RENCANA K3LL' THEN '00'
          WHEN name LIKE '1 %' AND name NOT LIKE '1.%' THEN '01'
          WHEN name LIKE '2 %' AND name NOT LIKE '2.%' THEN '02'
          WHEN name LIKE '3 %' AND name NOT LIKE '3.%' THEN '03'
          WHEN name LIKE '4 %' AND name NOT LIKE '4.%' THEN '04'
          WHEN name LIKE '5 %' AND name NOT LIKE '5.%' THEN '05'
          WHEN name LIKE '6 %' AND name NOT LIKE '6.%' THEN '06'
          WHEN name LIKE '7 %' AND name NOT LIKE '7.%' THEN '07'
          WHEN name LIKE '8 %' AND name NOT LIKE '8.%' THEN '08'
          WHEN name LIKE '1.%' THEN '10'
          WHEN name LIKE '2.%' THEN '20'
          WHEN name LIKE '3.%' THEN '30'
          WHEN name LIKE '4.%' THEN '40'
          WHEN name LIKE '5.%' THEN '50'
          WHEN name LIKE '6.%' THEN '60'
          WHEN name LIKE '7.%' THEN '70'
          WHEN name LIKE '8.%' THEN '80'
          -- For assessment folders, sort by type first, then by date
          -- All PB folders come first (prefix '90'), then all PA folders (prefix '91'), then all PSB folders (prefix '92')
          WHEN name LIKE '% - PB' THEN 
            CONCAT('90', SUBSTRING(name, 7, 4), SUBSTRING(name, 4, 2), SUBSTRING(name, 1, 2))
          WHEN name LIKE '% - PA' THEN 
            CONCAT('91', SUBSTRING(name, 7, 4), SUBSTRING(name, 4, 2), SUBSTRING(name, 1, 2))
          WHEN name LIKE '% - PSB' THEN 
            CONCAT('92', SUBSTRING(name, 7, 4), SUBSTRING(name, 4, 2), SUBSTRING(name, 1, 2))
          ELSE name
        END`
      ),
    ],
  });
}

/**
 * Get all descendant folder IDs from an in-memory list (no DB query)
 */
function getAllDescendantIds(parentId: string, allFolders: any[]): string[] {
  const result: string[] = [];
  const children = allFolders.filter(f => f.parentId === parentId);
  for (const child of children) {
    result.push(child.id);
    result.push(...getAllDescendantIds(child.id, allFolders));
  }
  return result;
}

/**
 * Calculate completion status for folders
 * @param folders 
 * @param exportStatistics Optional export statistics for DOKUMEN EVALUASI folder
 * @param dokumenEvaluasiPathPrefix Optional path prefix for DOKUMEN EVALUASI folder to identify its children
 * @returns Folders with completion status
 */
export async function calculateFoldersCompletion(
  folders: any[], 
  exportStatistics?: { totalAssessmentFolders: number; fullyApprovedFolders: number; exportedFiles: number },
  dokumenEvaluasiPathPrefix?: string | null
): Promise<BaseFolder[]> {
  const foldersWithCompletion: BaseFolder[] = [];

  // Authors of the notes (one query for the whole contract)
  const noteAuthorIds = collectNoteAuthorIds(folders);
  const noteAuthorUsers = new Map<string, { name: string | null; role: string | null }>(
    noteAuthorIds.length > 0
      ? (await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, noteAuthorIds)))
          .map((u) => [u.id, { name: u.name, role: u.role }])
      : [],
  );
  
  // Helper to check if folder is DOKUMEN EVALUASI or its child
  const isDokumenEvaluasi = (folder: any) => {
    return folder.name === 'DOKUMEN EVALUASI' || 
           (dokumenEvaluasiPathPrefix && folder.path.startsWith(dokumenEvaluasiPathPrefix));
  };

  // Recalculate isComplete for all non-assessment folders to fix stale data
  for (const folder of folders) {
    // Skip assessment folders (PB/PA/PSB) - they're handled separately
    if (folder.name.endsWith(' - PB') || folder.name.endsWith(' - PA') || folder.name.endsWith(' - PSB')) {
      continue;
    }
    // Skip files - their isComplete is set on upload
    if (folder.fileType === 'file') {
      continue;
    }
    // Skip DOKUMEN EVALUASI folders
    if (isDokumenEvaluasi(folder)) {
      continue;
    }

    // Check if this folder is part of K3LL structure
    const isK3LLFolder = folder.name === 'A. RENCANA K3LL' || 
                        /^([1-8])\s/.test(folder.name) ||
                        /^([1-8])\.(\d+)/.test(folder.name);

    let actualIsComplete: boolean;
    if (isK3LLFolder) {
      actualIsComplete = await isK3LLFolderComplete(folder.id, folders);
    } else {
      // For regular folders, check if they have at least one file in descendants
      const children = folders.filter(f => f.parentId === folder.id);
      if (children.length > 0) {
        // Check if any descendant is a file
        const allDescendantIds = getAllDescendantIds(folder.id, folders);
        actualIsComplete = allDescendantIds.some(id => {
          const f = folders.find(x => x.id === id);
          return f && f.fileType === 'file';
        });
      } else {
        actualIsComplete = folder.fileType === 'file';
      }
    }

    // Update DB if stale
    if (folder.isComplete !== actualIsComplete) {
      updateFolderCompletionStatus(folder.id, actualIsComplete).catch(err => {
        console.error(`Failed to update folder completion status in background: ${err}`);
      });
      folder.isComplete = actualIsComplete;
    }
  }

  // Auto-heal parent scores (Categories 3-8, A. RENCANA K3LL, and Root Assessment folders)
  const childrenByParent = new Map<string, any[]>();
  for (const f of folders) {
    if (f.parentId) {
      if (!childrenByParent.has(f.parentId)) {
        childrenByParent.set(f.parentId, []);
      }
      childrenByParent.get(f.parentId)!.push(f);
    }
  }

  // 1. Categories 3 to 8: calculate average of active standard subcategories
  for (const f of folders) {
    if (f.fileType === 'folder' && /^[3-8]\s/.test(f.name)) {
      const catNum = f.name.match(/^([3-8])/)?.[1];
      const children = childrenByParent.get(f.id) || [];
      const standardSubs = children.filter(c => 
        c.fileType === 'folder' && new RegExp(`^${catNum}\\.\\d+`).test(c.name)
      );

      if (standardSubs.length > 0) {
        let sum = 0;
        let activeCount = 0;
        for (const sub of standardSubs) {
          const s = sub.score !== null && sub.score !== undefined ? parseFloat(sub.score) : 0;
          if (s !== -1 && !isNaN(s)) {
            sum += s;
            activeCount++;
          }
        }
        const expectedScore = activeCount > 0 ? Math.round((sum / activeCount) * 10) / 10 : -1;
        const currentScore = f.score !== null && f.score !== undefined ? parseFloat(f.score) : 0;
        if (expectedScore !== -1 && Math.abs(expectedScore - currentScore) > 0.001) {
          f.score = expectedScore.toFixed(2);
          db.update(contractFolder).set({ score: expectedScore.toString(), updatedAt: new Date() })
            .where(eq(contractFolder.id, f.id))
            .catch(err => console.error(`Failed to heal category score for ${f.name}:`, err));
        }
      }
    }
  }

  // 2. A. RENCANA K3LL: sum active categories 1 to 8
  for (const f of folders) {
    if (f.fileType === 'folder' && f.name === 'A. RENCANA K3LL') {
      const children = childrenByParent.get(f.id) || [];
      const catFolders = children.filter(c => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));
      let sum = 0;
      let hasActive = false;
      for (const cat of catFolders) {
        const s = cat.score !== null && cat.score !== undefined ? parseFloat(cat.score) : 0;
        if (s !== -1 && !isNaN(s)) {
          sum += s;
          hasActive = true;
        }
      }
      if (hasActive) {
        const expectedScore = Math.round(sum * 10) / 10;
        const currentScore = f.score !== null && f.score !== undefined ? parseFloat(f.score) : 0;
        if (Math.abs(expectedScore - currentScore) > 0.001) {
          f.score = expectedScore.toFixed(2);
          db.update(contractFolder).set({ score: expectedScore.toString(), updatedAt: new Date() })
            .where(eq(contractFolder.id, f.id))
            .catch(err => console.error(`Failed to heal A. RENCANA K3LL score:`, err));
        }
      }
    }
  }

  // 3. Root Assessment Folders (depth 0, ends with - PB / - PA / - PSB)
  for (const f of folders) {
    if (f.depth === 0 && (f.name.endsWith(' - PB') || f.name.endsWith(' - PA') || f.name.endsWith(' - PSB'))) {
      const children = childrenByParent.get(f.id) || [];
      const rencanaK3LL = children.find(c => c.name === 'A. RENCANA K3LL' && c.fileType === 'folder');
      const sourceFolders = rencanaK3LL ? (childrenByParent.get(rencanaK3LL.id) || []) : children;
      const catFolders = sourceFolders.filter(c => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));

      if (catFolders.length > 0) {
        let totalPureScore = 0;
        let activeCount = 0;
        for (const cat of catFolders) {
          const s = cat.score !== null && cat.score !== undefined ? parseFloat(cat.score) : 0;
          if (s !== -1 && !isNaN(s)) {
            totalPureScore += s;
            activeCount++;
          }
        }
        if (activeCount > 0) {
          const divisor = activeCount * 10;
          const expectedScore = Math.round(((totalPureScore / divisor) * 100) * 10) / 10;
          const currentScore = f.score !== null && f.score !== undefined ? parseFloat(f.score) : 0;
          if (Math.abs(expectedScore - currentScore) > 0.001) {
            f.score = expectedScore.toFixed(2);
            db.update(contractFolder).set({ score: expectedScore.toString(), updatedAt: new Date() })
              .where(eq(contractFolder.id, f.id))
              .catch(err => console.error(`Failed to heal root assessment score for ${f.name}:`, err));
          }
        }
      }
    }
  }
  
  // Create a map of assessment folders (PB/PA/PSB) by their ID for quick lookup
  const assessmentFoldersMap = new Map<string, any>();
  for (const folder of folders) {
    if (folder.depth === 0 && (folder.name.endsWith(' - PB') || folder.name.endsWith(' - PA') || folder.name.endsWith(' - PSB'))) {
      assessmentFoldersMap.set(folder.id, folder);
    }
  }
  
  // Helper to check if a file should be displayed (based on parent assessment folder status)
  const shouldDisplayFile = (folder: any): boolean => {
    // If not a file or not in DOKUMEN EVALUASI, show it
    if (folder.fileType !== 'file' || !isDokumenEvaluasi(folder)) {
      return true;
    }
    
    // For files in DOKUMEN EVALUASI, check if the corresponding assessment folder has isComplete && isFinal
    // Extract assessment type from filename (e.g., "Hasil Evaluasi - Penilaian Berjalan - DD-MM-YYYY.pdf")
    const assessmentTypeMatch = folder.name.match(/(Penilaian Berjalan|Penilaian Akhir)/);
    if (!assessmentTypeMatch) {
      return true; // If cannot determine type, show the file
    }
    
    const assessmentType = assessmentTypeMatch[1] === 'Penilaian Berjalan' ? 'PB' : 'PA';
    
    // Extract date from filename (e.g., "DD-MM-YYYY")
    const dateMatch = folder.name.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!dateMatch) {
      return true; // If cannot extract date, show the file
    }
    
    // Find the corresponding assessment folder
    for (const assessmentFolder of assessmentFoldersMap.values()) {
      if (assessmentFolder.name.includes(dateMatch[0]) && assessmentFolder.name.endsWith(` - ${assessmentType}`)) {
        // Found the assessment folder - only show file if BOTH isComplete and isFinal are true
        return assessmentFolder.isComplete === true && assessmentFolder.isFinal === true;
      }
    }
    
    // If cannot find matching assessment folder, show the file
    return true;
  };
  
  // First, let's identify all folders that are descendants of final folders
  const finalFolderIds = folders
    .filter(folder => folder.depth === 0 && folder.isFinal)
    .map(folder => folder.id);
  
  // Create a set of folder paths that are descendants of final folders
  const descendantPathsOfFinalFolders = new Set<string>();
  
  // Create a set of root paths for final folders (to mark all folders under them as complete)
  const finalFolderRootPaths = new Set<string>();
  
  for (const folder of folders) {
    // Check if this folder is a descendant of any final folder
    for (const finalFolderId of finalFolderIds) {
      const finalFolder = folders.find(f => f.id === finalFolderId);
      if (finalFolder) {
        if (folder.path.startsWith(finalFolder.path + '.')) {
          descendantPathsOfFinalFolders.add(folder.path);
        }
        // Store the root path of final folders
        if (folder.id === finalFolderId) {
          finalFolderRootPaths.add(finalFolder.path);
        }
      }
    }
  }
  
  // Pre-fetch data for depth 0 folders to avoid N+1 queries in the loop
  const depth0Folders = folders.filter(f => f.depth === 0);
  const depth0FolderIds = depth0Folders.map(f => f.id);

  // Pre-fetch user names
  const allUserIds = Array.from(new Set(
    depth0Folders
      .filter(f => Array.isArray(f.userId))
      .flatMap(f => f.userId as string[])
  ));
  const userMap = new Map<string, { id: string; name: string }>();
  if (allUserIds.length > 0) {
    const userRecords = await db.query.users.findMany({
      where: (fields, { inArray }) => inArray(fields.id, allUserIds),
      columns: {
        id: true,
        name: true
      }
    });
    userRecords.forEach(u => userMap.set(u.id, u));
  }

  // Pre-fetch approval summaries in parallel
  const depth0NonDokumenFolders = depth0Folders.filter(f => !isDokumenEvaluasi(f));
  const approvalMap = new Map<string, any>();
  await Promise.all(
    depth0NonDokumenFolders.map(async f => {
      try {
        const summary = await getApprovalSummary(f.id);
        approvalMap.set(f.id, summary);
      } catch (error) {
        // default fallback will be used
      }
    })
  );

  // Pre-fetch email logs for all depth 0 folders in a single query
  const emailLogsMap = new Map<string, any[]>();
  if (depth0FolderIds.length > 0) {
    try {
      const emailLogs = await db.query.evaluationEmailLog.findMany({
        where: inArray(evaluationEmailLog.folderId, depth0FolderIds),
        orderBy: asc(evaluationEmailLog.sentAt),
      });
      for (const log of emailLogs) {
        if (!emailLogsMap.has(log.folderId)) {
          emailLogsMap.set(log.folderId, []);
        }
        emailLogsMap.get(log.folderId)!.push(log);
      }
    } catch (error) {
      console.error('Error prefetching email logs:', error);
    }
  }

  // Identify all Category 1 and Category 2 folders and collect all their descendant IDs
  const cat1and2FolderIds = new Set<string>();
  for (const f of folders) {
    if (f.fileType === 'folder' && (/^[12]\s/.test(f.name) || f.name === '1 Kepemimpinan dan Komitmen' || f.name === '2 Kebijakan dan Sasaran Strategis K3LL')) {
      cat1and2FolderIds.add(f.id);
    }
  }

  const cat1and2DescendantIds = new Set<string>();
  for (const catId of cat1and2FolderIds) {
    const descendantIds = getAllDescendantIds(catId, folders);
    for (const dId of descendantIds) {
      cat1and2DescendantIds.add(dId);
    }
  }

  for (const folder of folders) {
    // Skip files in DOKUMEN EVALUASI that don't meet the display criteria
    if (isDokumenEvaluasi(folder) && folder.fileType === 'file' && !shouldDisplayFile(folder)) {
      continue;
    }
    
    const k3llScoreableNames = getK3LLScoreableNames();
    const isScore = folder.fileType === 'folder' && k3llScoreableNames.has(folder.name) && !cat1and2DescendantIds.has(folder.id);

    // For assessment folders (PB/PA/PSB), always recalculate isComplete to fix stale data
    if (folder.name.endsWith(' - PB') || folder.name.endsWith(' - PA') || folder.name.endsWith(' - PSB')) {
      let isComplete = folder.isFinal === true ? true : await isFolderStructureComplete(folder.id, folders);
      // Update DB if stale
      if (folder.isComplete !== isComplete) {
        updateFolderCompletionStatus(folder.id, isComplete).catch(err => {
          console.error(`Failed to update folder completion status in background: ${err}`);
        });
        folder.isComplete = isComplete;
      }
      // Extract date from folder name (format: DD-MM-YYYY - PB/PA/PSB)
      const dateStr = folder.name.substring(0, 10); 
      const [day, month, year] = dateStr.split('-');
      const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // month is 0-indexed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // For past dates, always enable
      // For future dates, enable only if within 3 months
      let isEnabled;
      if (folderDate <= today) {
        // Past dates or today are always enabled
        isEnabled = true;
      } else {
        // Future dates are enabled only if within 3 months
        const threeMonthsAfter = new Date(today);
        threeMonthsAfter.setMonth(threeMonthsAfter.getMonth() + 3);
        isEnabled = folderDate <= threeMonthsAfter;
      }
      
      // PSB folders are always enabled
      if (folder.name.endsWith(' - PSB')) {
        isEnabled = true;
      }
      
      // Check if folder is marked as final (only for depth 0)
      const isFinal = folder.depth === 0 ? folder.isFinal : undefined;
      
      // Root assessment folders (depth 0) should not be editable if isFinal is true
      // Also, any folder that is a descendant of a final folder should not be editable
      const isDescendantOfFinalFolder = descendantPathsOfFinalFolders.has(folder.path);
      const isEnabledEdit = (folder.depth !== 0 || !isFinal) && !isDescendantOfFinalFolder;
      
      const folderData: any = {
        id: folder.id,
        contractId: folder.contractId,
        parentId: folder.parentId,
        name: folder.name,
        description: folder.description,
        path: folder.path,
        depth: folder.depth,
        fileType: folder.fileType,
        filePath: folder.filePath,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        assessmentDate: folder.assessmentDate,
        isComplete,
        isEnabled,
        isScore,
        isEnabledEdit,
      };
      
      // Determine isCopy status based on children if this is a folder and depth is 2 or more
      if (folder.fileType === 'folder' && folder.depth !== 0 && folder.depth !== 1) {
        // Get all children of this folder to determine the isCopy status
        const children = folders.filter(f => f.parentId === folder.id);
        
        if (children.length > 0) {
          // Determine the isCopy status for the folder based on its children
          let folderIsCopy = 0;
          if (children.some(c => (c.isCopy ?? 0) === 0)) folderIsCopy = 0;
          else if (children.some(c => (c.isCopy ?? 0) === 2)) folderIsCopy = 2;
          else if (children.every(c => (c.isCopy ?? 0) === 1)) folderIsCopy = 1;
          
          folderData.isCopy = folderIsCopy;
        } else {
          // If folder has no children, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      } else {
        // For files, only add isCopy for depth 2 and deeper
        if (folder.depth !== 0 && folder.depth !== 1) {
          // For files, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      }
      
      // Only add isFinal for depth 0 folders (skip for DOKUMEN EVALUASI)
      if (folder.depth === 0 && !isDokumenEvaluasi(folder)) {
        folderData.isFinal = isFinal;
      }
      
      // For depth 0 assessment folders, check if all children are assessed with values (skip for DOKUMEN EVALUASI and PSB)
      if (folder.depth === 0 && !isDokumenEvaluasi(folder)) {
        const isPSB = folder.name.endsWith(' - PSB');
        folderData.isCompleteAssessment = isPSB ? false : await areAllChildrenAssessedWithValues(folder.id, folders);
        
        // Add user names for depth 0 folders
        if (Array.isArray(folder.userId) && folder.userId.length > 0) {
          folderData.auditorNames = (folder.userId as string[])
            .map((uid: string) => userMap.get(uid))
            .filter((u): u is { id: string; name: string } => Boolean(u));
        }
        
        // Add approval status for depth 0 folders (skip for DOKUMEN EVALUASI)
        if (!isDokumenEvaluasi(folder)) {
          const approvalSummary = approvalMap.get(folder.id);
          if (approvalSummary) {
            folderData.approvalStatus = {
              currentApprovalLevel: approvalSummary.currentApprovalLevel,
              nextRequiredLevel: approvalSummary.nextRequiredLevel,
              isFullyApproved: approvalSummary.isFullyApproved,
              approvalHistory: Object.fromEntries(
                Object.entries(approvalSummary.approvalHistory).map(([level, logs]: [string, any]) => [
                  level,
                  logs.map((item: any) => ({
                    status: item.status,
                    note: item.note,
                    approvedAt: item.approvedAt instanceof Date ? item.approvedAt.toISOString() : String(item.approvedAt),
                    userName: item.userName,
                  }))
                ])
              ),
            };
          } else {
            folderData.approvalStatus = {
              currentApprovalLevel: null,
              nextRequiredLevel: null,
              isFullyApproved: false,
              approvalHistory: {
                evaluator: [],
                verifikator: [],
                manager: []
              },
            };
          }
        } else if (exportStatistics) {
          // Add export statistics for DOKUMEN EVALUASI folder
          folderData.exportStatistics = {
            totalAssessmentFolders: exportStatistics.totalAssessmentFolders,
            fullyApprovedFolders: exportStatistics.fullyApprovedFolders,
            exportedFiles: exportStatistics.exportedFiles
          };
        }
        
        // Add email sending summary for depth 0 assessment folders
        const emailLogs = emailLogsMap.get(folder.id) || [];
        if (emailLogs.length > 0) {
          // Group logs by sentAt timestamp to show batch sends
          const groupedByTime = new Map<string, any[]>();
          for (const log of emailLogs) {
            const timeKey = log.sentAt instanceof Date ? log.sentAt.toISOString() : String(log.sentAt);
            if (!groupedByTime.has(timeKey)) {
              groupedByTime.set(timeKey, []);
            }
            groupedByTime.get(timeKey)!.push(log);
          }
          
          // Create summary showing who received and when
          folderData.emailSendingSummary = Array.from(groupedByTime.entries()).map(([sentAt, logs]) => ({
            sentAt: new Date(sentAt).toLocaleString('id-ID', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            recipients: logs.map(log => ({
              userId: log.userId,
              email: log.email,
              status: log.status,
            })),
            totalSent: logs.filter(l => l.status === 'sent').length,
            totalFailed: logs.filter(l => l.status === 'failed').length,
          }));
        }
      }
      
      
      // Determine isCopy status based on children if this is a folder and depth is 2 or more
      if (folder.fileType === 'folder' && folder.depth !== 0 && folder.depth !== 1) {
        // Get all children of this folder to determine the isCopy status
        const children = folders.filter(f => f.parentId === folder.id);
        
        if (children.length > 0) {
          // Determine the isCopy status for the folder based on its children
          let folderIsCopy = 0;
          if (children.some(c => (c.isCopy ?? 0) === 0)) folderIsCopy = 0;
          else if (children.some(c => (c.isCopy ?? 0) === 2)) folderIsCopy = 2;
          else if (children.every(c => (c.isCopy ?? 0) === 1)) folderIsCopy = 1;
          
          folderData.isCopy = folderIsCopy;
        } else {
          // If folder has no children, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      } else if (folder.depth !== 0 && folder.depth !== 1) {
        // For files at depth 2+, use the original isCopy value
        folderData.isCopy = folder.isCopy ?? 0;
      }
      
      // Only add status, score, and note for folders, not for files
      if (folder.fileType !== 'file') {
        // Determine if this is a PSB folder
        const isPSB = folder.name.endsWith(' - PSB');
        
        // For depth 0 and 1, don't include status UNLESS it's a PSB folder
        if (folder.depth !== 0 && folder.depth !== 1) {
          folderData.status = folder.status;
        } else if (isPSB) {
          // PSB folders always have status
          folderData.status = folder.status;
        }
        
        // For PSB folders, don't include score but keep status and note
        if (!isPSB) {
          // Ensure score is a number, default to 0 if null/undefined/NaN
          const scoreValue = folder.score !== null && folder.score !== undefined ? parseFloat(folder.score) : 0;
          const score = isNaN(scoreValue) ? 0 : scoreValue;
          // Format score: for depth 0 and 1, return as string with 2 decimals; for others, use number with 1 decimal
          if (Number(folder.depth) === 0 || Number(folder.depth) === 1) {
            folderData.score = score.toFixed(2);
          } else {
            folderData.score = Number(score.toFixed(1));
          }
        }
        folderData.note = folder.note;
        folderData.noteContractor = folder.noteContractor || null;
        folderData.noteAuthor = noteAuthorOf(folder.noteUpdatedBy, folder.noteUpdatedAt, noteAuthorUsers);
        folderData.noteContractorAuthor = noteAuthorOf(folder.noteContractorUpdatedBy, folder.noteContractorUpdatedAt, noteAuthorUsers);
      }
      folderData.aiScore = folder.aiScore;
      folderData.aiStatus = folder.aiStatus;
      
      const hasSubfolders = folders.some(f => f.parentId === folder.id && f.fileType === 'folder');
      if (hasSubfolders && folder.aiReasoning?.startsWith('PROCESSING:')) {
        folderData.aiReasoning = null;
      } else {
        folderData.aiReasoning = folder.aiReasoning;
      }
      
      folderData.aiProcessedAt = folder.aiProcessedAt;
      
      if (cat1and2DescendantIds.has(folder.id)) {
        folderData.score = undefined;
        folderData.aiScore = undefined;
        folderData.aiStatus = undefined;
        folderData.status = undefined;
        folderData.isScore = false;
      }
      
      // Add pass/fail status based on score >= 60 for depth 0 (only for PB and PA, not PSB)
      if (folder.depth === 0 && folderData.score !== undefined) {
        const isPSB = folder.name.endsWith(' - PSB');
        if (!isPSB) {
          const scoreNum = typeof folderData.score === 'string' ? parseFloat(folderData.score) : folderData.score;
          folderData.passStatus = scoreNum >= 60 ? 'lulus' : 'tidak lulus';
        }
      }
      
      foldersWithCompletion.push(folderData);
    } else {
      let isEnabled = true;
      
      // If the folder has a date in its name (DD-MM-YYYY format at the beginning), apply date logic
      if (/^\d{2}-\d{2}-\d{4}/.test(folder.name)) {
        const dateStr = folder.name.substring(0, 10); // DD-MM-YYYY
        const [day, month, year] = dateStr.split('-');
        const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // month is 0-indexed
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for comparison
        
        // For past dates, always enable
        // For future dates, enable only if within 3 months
        if (folderDate <= today) {
          isEnabled = true;
        } else {
          // Future dates are enabled only if within 3 months
          const threeMonthsAfter = new Date(today);
          threeMonthsAfter.setMonth(threeMonthsAfter.getMonth() + 3);
          isEnabled = folderDate <= threeMonthsAfter;
        }
      }
      
      // Check if folder is marked as final (only for depth 0)
      const isFinal = folder.depth === 0 ? folder.isFinal : undefined;
      
      // Check if this folder is a descendant of a final folder
      const isDescendantOfFinalFolder = descendantPathsOfFinalFolders.has(folder.path);
      
      let isEnabledEdit = true;
      // Disable editing if folder is depth 0 and isFinal is true
      // Also disable editing if folder is a descendant of a final folder
      if ((folder.depth === 0 && isFinal) || isDescendantOfFinalFolder) {
        isEnabledEdit = false;
      } else if (folder.fileType === 'folder') {
        // Check if this specific folder is part of K3LL structure (not its parents)
        const isK3LLFolder = folder.name === 'A. RENCANA K3LL' || 
                            /^([1-8])\s/.test(folder.name) ||  
                            /^([1-8])\.(\d+)/.test(folder.name); 
        isEnabledEdit = !isK3LLFolder; 
      }
      
      const folderData: any = {
        id: folder.id,
        contractId: folder.contractId,
        parentId: folder.parentId,
        name: folder.name,
        description: folder.description,
        path: folder.path,
        depth: folder.depth,
        fileType: folder.fileType,
        filePath: folder.filePath,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        assessmentDate: folder.assessmentDate,
      };
      
      // Add isComplete, isEnabled, isScore, isEnabledEdit only for non-DOKUMEN EVALUASI folders
      if (!isDokumenEvaluasi(folder)) {
        // Always recalculate isComplete for non-assessment folders too
        if (folder.fileType === 'folder' && folder.depth >= 2) {
          const actualIsComplete = await isFolderStructureComplete(folder.id, folders);
          if (folder.isComplete !== actualIsComplete) {
            updateFolderCompletionStatus(folder.id, actualIsComplete).catch(err => {
              console.error(`Failed to update folder completion status in background: ${err}`);
            });
            folder.isComplete = actualIsComplete;
          }
        }
        folderData.isComplete = folder.isComplete;
        folderData.isEnabled = isEnabled;
        folderData.isScore = isScore;
        folderData.isEnabledEdit = isEnabledEdit;
      } else {
        // For DOKUMEN EVALUASI folder
        folderData.isEnabled = true;
        folderData.isEnabledEdit = false;
        
        // Add export statistics for DOKUMEN EVALUASI folder
        if (exportStatistics) {
          folderData.exportStatistics = {
            totalAssessmentFolders: exportStatistics.totalAssessmentFolders,
            fullyApprovedFolders: exportStatistics.fullyApprovedFolders,
            exportedFiles: exportStatistics.exportedFiles
          };
        }
      }
      
      // Determine isCopy status based on children if this is a folder and depth is 2 or more
      if (folder.fileType === 'folder' && folder.depth !== 0 && folder.depth !== 1) {
        // Get all children of this folder to determine the isCopy status
        const children = folders.filter(f => f.parentId === folder.id);
        
        if (children.length > 0) {
          // Determine the isCopy status for the folder based on its children
          let folderIsCopy = 0;
          if (children.some(c => (c.isCopy ?? 0) === 0)) folderIsCopy = 0;
          else if (children.some(c => (c.isCopy ?? 0) === 2)) folderIsCopy = 2;
          else if (children.every(c => (c.isCopy ?? 0) === 1)) folderIsCopy = 1;
          
          folderData.isCopy = folderIsCopy;
        } else {
          // If folder has no children, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      } else {
        // For files, only add isCopy for depth 2 and deeper
        if (folder.depth !== 0 && folder.depth !== 1) {
          // For files, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      }
      
      // Only add isFinal for depth 0 folders (skip for DOKUMEN EVALUASI)
      if (folder.depth === 0 && !isDokumenEvaluasi(folder)) {
        folderData.isFinal = isFinal;
      }
      
      // For depth 0 non-assessment folders, check if all children are assessed with values (skip for DOKUMEN EVALUASI and PSB)
      if (folder.depth === 0 && !isDokumenEvaluasi(folder)) {
        const isPSB = folder.name.endsWith(' - PSB');
        folderData.isCompleteAssessment = isPSB ? false : await areAllChildrenAssessedWithValues(folder.id, folders);
        
        // Add user names for depth 0 folders
        if (Array.isArray(folder.userId) && folder.userId.length > 0) {
          folderData.auditorNames = (folder.userId as string[])
            .map((uid: string) => userMap.get(uid))
            .filter((u): u is { id: string; name: string } => Boolean(u));
        }
        
        // Add approval status for depth 0 folders (skip for DOKUMEN EVALUASI)
        if (!isDokumenEvaluasi(folder)) {
          const approvalSummary = approvalMap.get(folder.id);
          if (approvalSummary) {
            folderData.approvalStatus = {
              currentApprovalLevel: approvalSummary.currentApprovalLevel,
              nextRequiredLevel: approvalSummary.nextRequiredLevel,
              isFullyApproved: approvalSummary.isFullyApproved,
              approvalHistory: Object.fromEntries(
                Object.entries(approvalSummary.approvalHistory).map(([level, logs]: [string, any]) => [
                  level,
                  logs.map((item: any) => ({
                    status: item.status,
                    note: item.note,
                    approvedAt: item.approvedAt instanceof Date ? item.approvedAt.toISOString() : String(item.approvedAt),
                    userName: item.userName,
                  }))
                ])
              ),
            };
          } else {
            folderData.approvalStatus = {
              currentApprovalLevel: null,
              nextRequiredLevel: null,
              isFullyApproved: false,
              approvalHistory: {
                evaluator: [],
                verifikator: [],
                manager: []
              },
            };
          }
        } else if (exportStatistics) {
          // Add export statistics for DOKUMEN EVALUASI folder
          folderData.exportStatistics = {
            totalAssessmentFolders: exportStatistics.totalAssessmentFolders,
            fullyApprovedFolders: exportStatistics.fullyApprovedFolders,
            exportedFiles: exportStatistics.exportedFiles
          };
        }
        
        // Add email sending summary for depth 0 non-assessment folders
        const emailLogs = emailLogsMap.get(folder.id) || [];
        if (emailLogs.length > 0) {
          // Group logs by sentAt timestamp to show batch sends
          const groupedByTime = new Map<string, any[]>();
          for (const log of emailLogs) {
            const timeKey = log.sentAt instanceof Date ? log.sentAt.toISOString() : String(log.sentAt);
            if (!groupedByTime.has(timeKey)) {
              groupedByTime.set(timeKey, []);
            }
            groupedByTime.get(timeKey)!.push(log);
          }
          
          // Create summary showing who received and when
          folderData.emailSendingSummary = Array.from(groupedByTime.entries()).map(([sentAt, logs]) => ({
            sentAt: new Date(sentAt).toLocaleString('id-ID', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            recipients: logs.map(log => ({
              userId: log.userId,
              email: log.email,
              status: log.status,
            })),
            totalSent: logs.filter(l => l.status === 'sent').length,
            totalFailed: logs.filter(l => l.status === 'failed').length,
          }));
        }
      }
      
      
      // Determine isCopy status based on children if this is a folder and depth is 2 or more
      if (folder.fileType === 'folder' && folder.depth !== 0 && folder.depth !== 1) {
        // Get all children of this folder to determine the isCopy status
        const children = folders.filter(f => f.parentId === folder.id);
        
        if (children.length > 0) {
          // Determine the isCopy status for the folder based on its children
          let folderIsCopy = 0;
          if (children.some(c => (c.isCopy ?? 0) === 0)) folderIsCopy = 0;
          else if (children.some(c => (c.isCopy ?? 0) === 2)) folderIsCopy = 2;
          else if (children.every(c => (c.isCopy ?? 0) === 1)) folderIsCopy = 1;
          
          folderData.isCopy = folderIsCopy;
        } else {
          // If folder has no children, use the original isCopy value
          folderData.isCopy = folder.isCopy ?? 0;
        }
      } else if (folder.depth !== 0 && folder.depth !== 1) {
        // For files at depth 2+, use the original isCopy value
        folderData.isCopy = folder.isCopy ?? 0;
      }
      
      // Only add status, score, and note for folders, not for files, and skip for DOKUMEN EVALUASI
      if (folder.fileType !== 'file' && !isDokumenEvaluasi(folder)) {
        // Determine if this is a PSB folder
        const isPSB = folder.name.endsWith(' - PSB');
        
        // For depth 0 and 1, don't include status UNLESS it's a PSB folder
        if (folder.depth !== 0 && folder.depth !== 1) {
          folderData.status = folder.status;
        } else if (isPSB) {
          // PSB folders always have status
          folderData.status = folder.status;
        }
        
        // For PSB folders, don't include score but keep status and note
        if (!isPSB) {
          // Ensure score is a number, default to 0 if null/undefined/NaN
          const scoreValue = folder.score !== null && folder.score !== undefined ? parseFloat(folder.score) : 0;
          const score = isNaN(scoreValue) ? 0 : scoreValue;
          // Format score: for root, A. RENCANA K3LL, and categories 1-8, format with 2 decimals
          const isCategoryOrRoot = Number(folder.depth) === 0 || folder.name === 'A. RENCANA K3LL' || /^[1-8]\s/.test(folder.name);
          if (isCategoryOrRoot) {
            folderData.score = score.toFixed(2);
          } else {
            folderData.score = score % 1 === 0 ? Math.floor(score) : Number(score.toFixed(2));
          }
        }
        folderData.note = folder.note;
        folderData.noteContractor = folder.noteContractor || null;
        folderData.noteAuthor = noteAuthorOf(folder.noteUpdatedBy, folder.noteUpdatedAt, noteAuthorUsers);
        folderData.noteContractorAuthor = noteAuthorOf(folder.noteContractorUpdatedBy, folder.noteContractorUpdatedAt, noteAuthorUsers);
      }
      folderData.aiScore = folder.aiScore;
      folderData.aiStatus = folder.aiStatus;
      folderData.aiReasoning = folder.aiReasoning;
      folderData.aiProcessedAt = folder.aiProcessedAt;
      
      if (cat1and2DescendantIds.has(folder.id)) {
        folderData.score = undefined;
        folderData.aiScore = undefined;
        folderData.aiStatus = undefined;
        folderData.status = undefined;
        folderData.isScore = false;
      }
      
      foldersWithCompletion.push(folderData);
    }
  }
  
  return foldersWithCompletion;
}

/**
 * Calculate export statistics for DOKUMEN EVALUASI folder
 * @param contractId 
 * @returns Object with export statistics
 */
async function calculateExportStatistics(contractId: string) {
  // Get all assessment folders (PB/PA/PSB) for this contract
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { and, eq, like }) =>
      and(
        eq(fields.contractId, contractId),
        eq(fields.fileType, 'folder'),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      )
  });

  // Filter to only include depth 0 folders (path = id in ltree)
  const depth0AssessmentFolders = assessmentFolders.filter(f => f.path === f.id);

  // For each assessment folder, check if it's fully approved
  const eligibleFolders = depth0AssessmentFolders.filter(
    folder => folder.isComplete === true && folder.isFinal === true
  );
  const approvalSummaries = await Promise.all(
    eligibleFolders.map(folder =>
      getApprovalSummary(folder.id).catch(() => null)
    )
  );
  const fullyApprovedFolders = approvalSummaries.filter(
    summary => summary?.isFullyApproved
  ).length;

  // Get files in DOKUMEN EVALUASI folder to count exported files
  const dokumenEvaluasiFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, like }) =>
      and(
        eq(fields.contractId, contractId),
        like(fields.name, 'DOKUMEN EVALUASI')
      )
  });

  let exportedFiles = 0;
  if (dokumenEvaluasiFolders.length > 0) {
    // Count all files in DOKUMEN EVALUASI folder and its descendants
    // Use ltree <@ operator to find descendants (paths that are under the folder's path)
    const allDescendants = await db.query.contractFolder.findMany({
      where: (fields, { sql }) => 
        sql`${fields.path} <@ ${dokumenEvaluasiFolders[0].path}::ltree`,
    });
    
    const allFiles = allDescendants.filter(f => f.fileType === 'file');
    
    // Create a map of assessment folders for quick lookup
    const assessmentFoldersMap = new Map<string, any>();
    for (const folder of depth0AssessmentFolders) {
      assessmentFoldersMap.set(folder.id, folder);
    }
    
    // Count only files where the corresponding assessment folder has BOTH isComplete and isFinal true
    for (const file of allFiles) {
      // Extract assessment type from filename (e.g., "Hasil Evaluasi - Penilaian Berjalan - DD-MM-YYYY.pdf")
      const assessmentTypeMatch = file.name.match(/(Penilaian Berjalan|Penilaian Akhir)/);
      if (!assessmentTypeMatch) {
        exportedFiles++; // If cannot determine type, count it
        continue;
      }
      
      const assessmentType = assessmentTypeMatch[1] === 'Penilaian Berjalan' ? 'PB' : 'PA';
      
      // Extract date from filename (e.g., "DD-MM-YYYY")
      const dateMatch = file.name.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (!dateMatch) {
        exportedFiles++; // If cannot extract date, count it
        continue;
      }
      
      // Find the corresponding assessment folder
      let foundAndComplete = false;
      for (const assessmentFolder of assessmentFoldersMap.values()) {
        if (assessmentFolder.name.includes(dateMatch[0]) && assessmentFolder.name.endsWith(` - ${assessmentType}`)) {
          // Found the assessment folder - only count file if BOTH isComplete and isFinal are true
          if (assessmentFolder.isComplete === true && assessmentFolder.isFinal === true) {
            foundAndComplete = true;
          }
          break;
        }
      }
      
      if (foundAndComplete) {
        exportedFiles++;
      }
    }
  }

  return {
    totalAssessmentFolders: depth0AssessmentFolders.length,
    fullyApprovedFolders,
    exportedFiles
  };
}

/**
 * List contract folders with hierarchical structure
 * @param contractId 
 * @returns Object containing folder tree and contract data
 */
export async function listContractFolders(contractId: string) {
  // Get contract with assessment dates
  const contractData = await getContractWithAssessmentDates(contractId);
  
  if (!contractData) {
    throw new Error('Contract not found');
  }
  
  // Get folders with custom sorting
  const folders = await getContractFoldersSorted(contractId);

  // Auto-heal: If contract has no PA folder, check if an end PB folder should be converted to PA
  const hasPA = folders.some(f => f.depth === 0 && f.name.endsWith(' - PA'));
  if (!hasPA && contractData) {
    const finalDateStr = contractData.finalAssessmentDate ? new Date(contractData.finalAssessmentDate) : new Date(contractData.endDate);
    const formattedFinalDate = `${String(finalDateStr.getDate()).padStart(2, '0')}-${String(finalDateStr.getMonth() + 1).padStart(2, '0')}-${finalDateStr.getFullYear()}`;
    
    // Find PB folder matching the final/end date
    const endPBFolder = folders.find(f => f.depth === 0 && f.name.endsWith(' - PB') && (
      f.name.startsWith(formattedFinalDate) ||
      (f.assessmentDate && new Date(f.assessmentDate).toISOString().split('T')[0] === contractData.finalAssessmentDate) ||
      (f.assessmentDate && new Date(f.assessmentDate).toISOString().split('T')[0] === contractData.endDate)
    ));
    
    if (endPBFolder) {
      const newName = `${formattedFinalDate} - PA`;
      const newDesc = `Penilaian Akhir for ${formattedFinalDate}`;
      await db.update(contractFolder).set({
        name: newName,
        description: newDesc,
        updatedAt: new Date()
      }).where(eq(contractFolder.id, endPBFolder.id));
      
      endPBFolder.name = newName;
      endPBFolder.description = newDesc;
    }
  }
  
  // Calculate export statistics for DOKUMEN EVALUASI folder
  const exportStatistics = await calculateExportStatistics(contractId);
  
  // Check if a folder is or is a child of DOKUMEN EVALUASI
  const dokumenEvaluasiFolder = folders.find(f => f.name === 'DOKUMEN EVALUASI');
  const dokumenEvaluasiPathPrefix = dokumenEvaluasiFolder ? dokumenEvaluasiFolder.path + '.' : null;
  
  // Calculate completion status for all folders
  const foldersWithCompletion = await calculateFoldersCompletion(folders, exportStatistics, dokumenEvaluasiPathPrefix);
  
  // Build hierarchical structure
  const folderTree = buildFolderTree(foldersWithCompletion);
  
  return {
    folderTree,
    contract: {
      id: contractData.id,
      title: contractData.title,
      numberContract: contractData.numberContract,
      riskAssessmentId: contractData.riskAssessmentId,
      riskLevel: contractData.riskLevel,
      contractorId: contractData.contractorId,
      contractorName: contractData.contractorName,
      category: contractData.category,
      vesselId: contractData.vesselId,
      vesselName: contractData.vesselName,
      startDate: contractData.startDate,
      endDate: contractData.endDate,
      nearestOngoingAssessmentDate: contractData.nearestOngoingAssessmentDate,
      finalAssessmentDate: contractData.finalAssessmentDate,
      note: contractData.note,
      createdAt: contractData.createdAt,
      updatedAt: contractData.updatedAt,
    }
  };
}
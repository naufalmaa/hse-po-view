import { db } from "../../../db/index.ts";
import { contract, contractFolder, approvalLog } from "../../../db/schema/csms.schema.ts";
import { subContractors, vessels } from "../../../db/schema/auth.schema.ts";
import { eq, desc, asc, ilike, and, count, inArray, or, sql } from "drizzle-orm";
import { getContractsAssessmentMetrics } from "./metrics.service.ts";
import { getApprovalSummary, 
  getContractsRelevantToLevel,
  getContractsWithFullyApprovedFolders,
  getHighestApprovedLevel,
  getApprovalMetricsByUser,
  getLatestApprovalLog,
  type ApprovalLevel 
} from "./approval.service.ts";
import type { User } from "../../../auth.ts";
type SessionUser = User;
import type { ListContractsParams, ListContractsResult } from "../../../types/contract.ts";

/**
 * Calculate if a folder is enabled based on its name and date
 * @param folderName 
 * @returns boolean indicating if folder is enabled
 */
function isFolderEnabled(folderName: string): boolean {
  // Extract date from folder name (format: DD-MM-YYYY - PB/PA/PSB)
  const dateStr = folderName.substring(0, 10); // DD-MM-YYYY
  const [day, month, year] = dateStr.split('-');
  const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // month is 0-indexed
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison
  
  // Apply the same isEnabled logic as in list-contract-folders.service.ts
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
  if (folderName.endsWith(' - PSB')) {
    isEnabled = true;
  }
  
  return isEnabled;
}

/**
 * Get contract by ID
 * @param id Contract ID
 * @returns Contract or null if not found
 */
export async function getContractById(id: string) {
  return await db.query.contract.findFirst({
    where: eq(contract.id, id),
  });
}

/**
 * Get file information associated with a contract folder
 * @param folderId 
 * @returns File information associated with the folder
 */
export async function getFilesForContractFolder(folderId: string) {
  // Get all child items (files) of the folder
  const files = await db.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, folderId)
  })

  // Return file information for all child items
  return files.map(file => ({
    fileName: file.name || 'Unknown File',
    filePath: file.filePath || '',
    fileType: file.fileType || 'application/octet-stream',
    folderId: file.id
  }));
}

export async function listAllContracts(
  input: ListContractsParams,
  user?: SessionUser,
  approvalLevel?: ApprovalLevel,
  userId?: string
): Promise<{
  success: true;
  data: ListContractsResult[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
  };
  // Add overallMetrics to return type
  overallMetrics: {
    ongoingAssessmentsCompleted: number;
    finalAssessmentsCompleted: number;
    totalContracts: number;
    completionRate: number;
  };
  approvalMetrics: {
    pendingForUser: number;
    approvedByUser: number;
    fullyApproved: number;
    awaitingReview: number;
  };
}> {
  let {
    search = '',
    subContractorId = [],
    vesselId = [],
    sort = 'createdAt',
    order = 'desc',
    page = 0,
    view = 10,
    status,
  } = input;

  const offset = page * view;
  const conditions = [];

  // Compute approvalMetrics upfront so it is preserved in all early-return paths
  const approvalMetrics = await getApprovalMetricsByUser(
    userId || '',
    approvalLevel || null
  );

  // If approval level is specified, filter contracts
  if (approvalLevel) {
    let relevantContractIds: string[] = [];
    if (status === 'complete') {
      relevantContractIds = await getContractsWithFullyApprovedFolders();
    } else if (status === 'rejected' || status === 'waiting') {
      relevantContractIds = await getContractsRelevantToLevel(approvalLevel, status);
    } else {
      // No status filter - get all contracts (complete, rejected, waiting)
      const completeContracts = await getContractsWithFullyApprovedFolders();
      const otherContracts = await getContractsRelevantToLevel(approvalLevel);
      relevantContractIds = [...new Set([...completeContracts, ...otherContracts])];
    }

    if (relevantContractIds.length > 0) {
      conditions.push(inArray(contract.id, relevantContractIds));
    } else {
      // No contracts matching criteria — list is empty but keep real approvalMetrics
      return {
        success: true,
        data: [],
        meta: {
          total: 0,
          page,
          view,
          totalPages: 0,
        },
        overallMetrics: {
          ongoingAssessmentsCompleted: 0,
          finalAssessmentsCompleted: 0,
          totalContracts: 0,
          completionRate: 0
        },
        approvalMetrics
      };  
    }
  }

  // Search filter
  if (search?.trim()) {
    const searchTerm = `%${search}%`;
    conditions.push(
      or(
        ilike(contract.title, searchTerm),
        ilike(subContractors.name, searchTerm)
      )
    );
  }

  // SubContractor filter
  if (subContractorId.length > 0) {
    conditions.push(inArray(contract.contractorId, subContractorId));
  }
  
  // Vessel filter
  if (vesselId.length > 0) {
    conditions.push(inArray(contract.vesselId, vesselId));
  }

  // Rejected filter
  if (status === 'rejected') {
    // Subquery to find the latest log status for each folder
    const latestStatusSubquery = db
      .select({
        folderId: approvalLog.folderId,
        status: approvalLog.status,
        rn: sql`row_number() over (partition by ${approvalLog.folderId} order by ${approvalLog.createdAt} desc)`.as('rn')
      })
      .from(approvalLog)
      .as('ls');

    const rejectedFolders = await db
      .select({ folderId: latestStatusSubquery.folderId })
      .from(latestStatusSubquery)
      .where(and(eq(latestStatusSubquery.rn, 1), eq(latestStatusSubquery.status, 'rejected')));

    const rejectedFolderIds = rejectedFolders.map(f => f.folderId);

    if (rejectedFolderIds.length > 0) {
      // Get contract IDs associated with these rejected folders
      const folders = await db
        .select({ contractId: contractFolder.contractId })
        .from(contractFolder)
        .where(inArray(contractFolder.id, rejectedFolderIds));
      
      const rejectedContractIds = [...new Set(folders.map(f => f.contractId))];

      if (rejectedContractIds.length > 0) {
        conditions.push(inArray(contract.id, rejectedContractIds));
      } else {
        return { success: true, data: [], meta: { total: 0, page, view, totalPages: 0 }, overallMetrics: { ongoingAssessmentsCompleted: 0, finalAssessmentsCompleted: 0, totalContracts: 0, completionRate: 0 }, approvalMetrics };
      }
    } else {
      return { success: true, data: [], meta: { total: 0, page, view, totalPages: 0 }, overallMetrics: { ongoingAssessmentsCompleted: 0, finalAssessmentsCompleted: 0, totalContracts: 0, completionRate: 0 }, approvalMetrics };
    }
  }

  const orderBy = order === 'asc' ? asc : desc;
  const sortColumn = {
    title: contract.title,
    contractorName: subContractors.name,
    vesselName: vessels.vesselName,
    startDate: contract.startDate,
    endDate: contract.endDate,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }[sort] ?? contract.createdAt;

  // Base query for contracts
  const baseQuery = db
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
    .$dynamic();

  // Apply conditions
  if (conditions.length > 0) {
    baseQuery.where(and(...conditions));
  }

  // Apply ordering, limit and offset
  baseQuery.orderBy(orderBy(sortColumn)).limit(view).offset(offset);

  // Count query for pagination
  const countQuery = db
    .select({ count: count() })
    .from(contract)
    .leftJoin(subContractors, eq(contract.contractorId, subContractors.id))
    .leftJoin(vessels, eq(contract.vesselId, vessels.id))
    .$dynamic();

  if (conditions.length > 0) {
    countQuery.where(and(...conditions));
  }

  const countRes = await countQuery;
  const total = countRes[0]?.count ?? 0;
  const totalPages = Math.ceil(total / view);

  const contracts = await baseQuery;

  // Get ALL matching contract IDs (not paginated) using the same conditions for overall metrics calculation
  const filteredContractIdsQuery = db
    .select({ id: contract.id })
    .from(contract)
    .leftJoin(subContractors, eq(contract.contractorId, subContractors.id))
    .leftJoin(vessels, eq(contract.vesselId, vessels.id))
    .$dynamic();

  if (conditions.length > 0) {
    filteredContractIdsQuery.where(and(...conditions));
  }

  const matchingContracts = await filteredContractIdsQuery;
  const filteredContractIds = matchingContracts.map(c => c.id);

  // Get metrics for filtered contracts (fast batch query on depth 0 folders)
  const filteredMetricsMap = await getContractsAssessmentMetrics(filteredContractIds);
  
  // Calculate overall metrics from filtered data
  let filteredOngoingTotal = 0;
  let filteredFinalTotal = 0;
  
  for (const contractId of filteredContractIds) {
    const metrics = filteredMetricsMap[contractId];
    if (metrics) {
      filteredOngoingTotal += metrics.ongoingAssessmentsCompleted;
      filteredFinalTotal += metrics.finalAssessmentsCompleted;
    }
  }
  
  const filteredCompletionRate = (filteredOngoingTotal + filteredFinalTotal) > 0
    ? (filteredFinalTotal / (filteredOngoingTotal + filteredFinalTotal)) * 100
    : 0;
  
  const overallMetrics = {
    ongoingAssessmentsCompleted: filteredOngoingTotal,
    finalAssessmentsCompleted: filteredFinalTotal,
    totalContracts: total,
    completionRate: isNaN(filteredCompletionRate) ? 0 : filteredCompletionRate
  };

  // Add metrics to each contract - calculated from folderInfo below
  const contractsWithMetrics = contracts.map(contract => ({
    ...contract,
    metrics: {
      ongoingAssessmentsCompleted: 0,
      finalAssessmentsCompleted: 0
    }
  }));

  const pageContractIds = contracts.map(c => c.id);

  // Fetch all depth 0 assessment folders for the current page contracts in a single batch query
  const allPageAssessmentFolders = pageContractIds.length > 0
    ? await db.query.contractFolder.findMany({
        where: (fields, { and, inArray, or, like, eq }) => and(
          eq(fields.depth, 0),
          inArray(fields.contractId, pageContractIds),
          or(
            like(fields.name, '% - PB'),
            like(fields.name, '% - PA'),
            like(fields.name, '% - PSB')
          )
        ),
        orderBy: [asc(contractFolder.path), asc(contractFolder.name)],
      })
    : [];

  const foldersByContract = new Map<string, typeof allPageAssessmentFolders>();
  for (const f of allPageAssessmentFolders) {
    if (!foldersByContract.has(f.contractId)) {
      foldersByContract.set(f.contractId, []);
    }
    foldersByContract.get(f.contractId)!.push(f);
  }

  // Get depth 0 folders information for each contract
  const contractsWithFolderInfo = await Promise.all(
    contractsWithMetrics.map(async (contract) => {
      let depth0Folders = foldersByContract.get(contract.id) || [];

      // Enrich all folders with approval status and filter based on status if needed
      const enrichedFolders: any[] = [];
      for (const folder of depth0Folders) {
        const approveSummary = await getApprovalSummary(folder.id);
        const folderWithApproval = { ...folder, approvalStatus: approveSummary };

        // Determine if this folder should be included based on status filter
        if (status === 'rejected') {
          const latestLog = await db.query.approvalLog.findFirst({
            where: eq(approvalLog.folderId, folder.id),
            orderBy: (fields, { desc }) => [desc(fields.createdAt)],
          });
          
          if (!latestLog || latestLog.status !== 'rejected') {
            continue; // Skip this folder
          }
        }

        // Further filter based on approval level and role logic
        if (approvalLevel) {
          const currentLevel = approveSummary.currentApprovalLevel;
          const highestApproved = await getHighestApprovedLevel(folder.id);
          
          let roleBasedInclude = false;
          
          // First check if folder is relevant to user's role
          if (approvalLevel === 'evaluator') {
            if (folder.isFinal || currentLevel !== null) roleBasedInclude = true;
          } else if (approvalLevel === 'verifikator') {
            if (highestApproved === 'evaluator' || highestApproved === 'verifikator' || highestApproved === 'manager') roleBasedInclude = true;
          } else if (approvalLevel === 'manager') {
            if (highestApproved === 'verifikator' || highestApproved === 'manager') roleBasedInclude = true;
          }
          
          // Then apply status filter
          let shouldInclude = false;
          if (status === 'complete') {
            if (roleBasedInclude && approveSummary.isFullyApproved) shouldInclude = true;
          } else if (status === 'waiting') {
            // Only include folders where the user's level has NOT yet acted (no log at their level)
            // and the folder is not fully approved and not rejected
            const latestLog = await getLatestApprovalLog(folder.id);
            const lastIsRejected = latestLog && latestLog.status === 'rejected';
            if (!approveSummary.isFullyApproved && !lastIsRejected) {
              let myLevelNotActed = false;
              if (approvalLevel === 'evaluator') {
                // isFinal and evaluator has NOT approved or rejected yet (pending log may exist)
                const evalHistory = approveSummary.approvalHistory?.['evaluator'] ?? [];
                const evaluatorActed = evalHistory.some((h: any) => h.status === 'accept' || h.status === 'rejected');
                myLevelNotActed = !!folder.isFinal && !evaluatorActed;
              } else if (approvalLevel === 'verifikator') {
                const vHistory = approveSummary.approvalHistory?.['verifikator'] ?? [];
                const verifikatorActed = vHistory.some((h: any) => h.status === 'accept' || h.status === 'rejected');
                myLevelNotActed = !verifikatorActed;
              } else if (approvalLevel === 'manager') {
                const mHistory = approveSummary.approvalHistory?.['manager'] ?? [];
                const managerActed = mHistory.some((h: any) => h.status === 'accept' || h.status === 'rejected');
                myLevelNotActed = !managerActed;
              }
              if (roleBasedInclude && myLevelNotActed) shouldInclude = true;
            }
          } else if (status === 'rejected') {
            // Already filtered above, just check role
            if (roleBasedInclude) shouldInclude = true;
          } else {
            // No status filter - include all folders relevant to role
            if (roleBasedInclude) shouldInclude = true;
          }
          
          if (shouldInclude) {
            enrichedFolders.push(folderWithApproval);
          }
        } else {
          // If no specific approval role, include based on status filter (which we already checked)
          enrichedFolders.push(folderWithApproval);
        }
      }
      depth0Folders = enrichedFolders;
      
      // Map folder info with isComplete, isCompleteAssessment, score, and approvalStatus
      const folderInfoMap = new Map();
      const tempFolders: any[] = []; // Temporary storage for colorType adjustment
      
      depth0Folders.forEach((folder: any) => {
        const folderDate = folder.name.substring(0, 10); // DD-MM-YYYY
        // Convert DD-MM-YYYY to YYYY-MM-DDTHH:MM:SS.sssZ format
        const [day, month, year] = folderDate.split('-');
        const isoDate = `${year}-${month}-${day}T00:00:00.000Z`;
        
        if (!folderInfoMap.has(isoDate)) {
          folderInfoMap.set(isoDate, []);
        }
        
        // Determine colorType based on folder status
        // 0=Dark Blue: First incomplete folder (isEnabled=true, isComplete=false) - paling pertama
        // 1=Light Blue: Subsequent incomplete folders (isEnabled=true, isComplete=false) - setelahnya
        // 2=Green: isEnabled=true, isComplete=true, isAssessment=true, isFinal=true (sudah selesai)
        // 3=Yellow: isEnabled=true, isComplete=true, but isAssessment/isFinal=false (nunggu dinilai)
        // 4=Gray: isEnabled=false (masih dikunci)
        const isEnabled = isFolderEnabled(folder.name);
        let colorType: 0 | 1 | 2 | 3 | 4;
        
        if (!isEnabled) {
          colorType = 4; // Gray - locked
        } else if (!folder.isComplete) {
          colorType = 0; // Dark Blue - being filled (will adjust to light blue for subsequent ones)
        } else if (folder.isComplete && folder.isFinal) {
          colorType = 2; // Green - complete
        } else if (folder.isComplete && !folder.isFinal) {
          colorType = 3; // Yellow - waiting for assessment
        } else {
          colorType = 3; // Yellow - default for other incomplete assessment states
        }
        
        const folderInfo: any = {
          folderId: folder.id,
          folderName: folder.name,
          folderDate,
          isFinal: folder.isFinal,
          status: folder.status,
          note: folder.note,
          colorType,
          isIncomplete: !folder.isComplete, // Track incomplete folders
        };
        
        // For non-approval roles, add isComplete and isCompleteAssessment
        if (!approvalLevel) {
          folderInfo.isComplete = folder.isComplete;
          folderInfo.isCompleteAssessment = !!folder.isFinal;
        }
        
        // Always add score
        folderInfo.score = folder.score;
        
        // Add approvalStatus if available
        if (folder.approvalStatus) {
          folderInfo.approvalStatus = {
            currentApprovalLevel: folder.approvalStatus.currentApprovalLevel,
            nextRequiredLevel: folder.approvalStatus.nextRequiredLevel,
            isFullyApproved: folder.approvalStatus.isFullyApproved,
            approvalHistory: folder.approvalStatus.approvalHistory
          };
        }
        
        tempFolders.push({ isoDate, folderInfo });
      });
      
      // Process tempFolders and adjust colorType for subsequent incomplete folders
      tempFolders.forEach(({ isoDate, folderInfo }) => {
        if (!folderInfoMap.has(isoDate)) {
          folderInfoMap.set(isoDate, []);
        }
        folderInfoMap.get(isoDate).push(folderInfo);
      });
      
      // Sort folderInfoMap by date (ascending - oldest first)
      const sortedFolderEntries = Array.from(folderInfoMap.entries()).sort((a, b) => {
        return new Date(a[0]).getTime() - new Date(b[0]).getTime();
      });
      
      // Adjust colorType: mark FIRST incomplete globally as dark blue (0), rest as light blue (1)
      let firstIncompleteFound = false;
      sortedFolderEntries.forEach(([_, folders]) => {
        folders.forEach((folder: any) => {
          if (folder.colorType === 0) { // Dark blue
            if (!firstIncompleteFound) {
              folder.colorType = 0; // Keep as dark blue (first globally)
              firstIncompleteFound = true;
            } else {
              folder.colorType = 1; // Change to light blue (subsequent)
            }
          }
        });
      });
      
      // Create nearestOngoingAssessmentDate structure with folder info
      interface FolderInfo {
        folderId: string;
        folderName: string;
        folderDate: string;
        isComplete: boolean;
        isCompleteAssessment: boolean;
        score: number | string;
        colorType: 0 | 1 | 2 | 3 | 4; // 0=Dark Blue, 1=Light Blue, 2=Green, 3=Yellow, 4=Gray
      }
      
      const nearestOngoingAssessmentDateWithFolders = Array.from(folderInfoMap.entries()).map(([date, folders]) => ({
        date,
        folderInfo: folders.sort((a: FolderInfo, b: FolderInfo) => {
          // PSB folders first
          const aIsPSB = a.folderName.endsWith(' - PSB');
          const bIsPSB = b.folderName.endsWith(' - PSB');
          if (aIsPSB && !bIsPSB) return -1;
          if (!aIsPSB && bIsPSB) return 1;
          // Then PB, then PA
          const aIsPB = a.folderName.endsWith(' - PB');
          const bIsPB = b.folderName.endsWith(' - PB');
          if (aIsPB && !bIsPB) return -1;
          if (!aIsPB && bIsPB) return 1;
          return 0;
        })
      })).sort((a: { date: string; folderInfo: FolderInfo[] }, b: { date: string; folderInfo: FolderInfo[] }) => {
        // Sort dates in ascending order (oldest first)
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Calculate metrics from folderInfo
      let ongoingAssessmentsCompleted = 0;
      let finalAssessmentsCompleted = 0;
      
      for (const assessment of nearestOngoingAssessmentDateWithFolders) {
        for (const folder of assessment.folderInfo) {
          // Skip PSB folders
          if (folder.folderName.endsWith(' - PSB')) {
            continue;
          }
          
          // Check if folder is enabled
          const isEnabled = isFolderEnabled(folder.folderName);
          
          // Count based on isComplete status
          if (folder.isComplete) {
            finalAssessmentsCompleted++;
          } else if (isEnabled) {
            ongoingAssessmentsCompleted++;
          }
        }
      }
      
      return {
        ...contract,
        metrics: {
          ongoingAssessmentsCompleted,
          finalAssessmentsCompleted
        },
        nearestOngoingAssessmentDate: nearestOngoingAssessmentDateWithFolders.length > 0 
          ? nearestOngoingAssessmentDateWithFolders 
          : contract.nearestOngoingAssessmentDate
      };
    })
  );

  return {
    success: true,
    data: contractsWithFolderInfo as any,
    meta: {
      total,
      page,
      view,
      totalPages,
    },
    overallMetrics,
    approvalMetrics
  };
}



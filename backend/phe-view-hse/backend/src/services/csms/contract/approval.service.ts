import { db } from "../../../db/index.ts";
import { approvalLog, contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, and, sql, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../db/schema/index.ts";

type DbOrTx = NodePgDatabase<typeof schema.schema>;

// Approval levels in hierarchical order
export const APPROVAL_LEVELS = ['evaluator', 'verifikator', 'manager'] as const;
export type ApprovalLevel = typeof APPROVAL_LEVELS[number];

/**
 * Map user role to approval level
 * @param role User role from database
 * @returns ApprovalLevel or null if role is not an approval role
 */
export function mapRoleToApprovalLevel(role: string): ApprovalLevel | null {
  if (role === 'evaluator' || role === 'verifikator' || role === 'manager') {
    return role as ApprovalLevel;
  }
  return null;
}

export interface ApprovalLogEntry {
  id: string;
  folderId: string;
  contractId: string;
  userId: string | null;
  approvalLevel: ApprovalLevel;
  status: 'approved' | 'rejected' | 'pending';
  note: string | null; // Allow null from database
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the next approval level in the hierarchy
 * @param currentLevel Current approval level
 * @returns Next approval level or null if at final level
 */
export function getNextApprovalLevel(currentLevel: ApprovalLevel): ApprovalLevel | null {
  const currentIndex = APPROVAL_LEVELS.indexOf(currentLevel);
  if (currentIndex === -1 || currentIndex === APPROVAL_LEVELS.length - 1) {
    return null;
  }
  return APPROVAL_LEVELS[currentIndex + 1];
}

/**
 * Get all approval logs for a specific folder
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns List of approval logs for the folder
 */
export async function getApprovalLogsForFolder(
  folderId: string,
  tx: DbOrTx = db
): Promise<ApprovalLogEntry[]> {
  const logs = await tx.query.approvalLog.findMany({
    where: eq(approvalLog.folderId, folderId),
    orderBy: (fields, { asc }) => [asc(fields.createdAt)],
  });
  return logs.map(log => ({
    id: log.id,
    folderId: log.folderId,
    contractId: log.contractId,
    userId: log.userId,
    approvalLevel: log.approvalLevel as ApprovalLevel,
    status: log.status as 'approved' | 'rejected' | 'pending',
    note: log.note,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  }));
}

/**
 * Get the latest approval log for a specific folder at a given approval level
 * @param folderId Folder ID
 * @param approvalLevel Approval level to check
 * @param tx Optional database transaction
 * @returns Latest approval log at that level or null
 */
export async function getLatestApprovalAtLevel(
  folderId: string,
  approvalLevel: ApprovalLevel,
  tx: DbOrTx = db
): Promise<ApprovalLogEntry | null> {
  const logs = await tx.query.approvalLog.findMany({
    where: and(
      eq(approvalLog.folderId, folderId),
      eq(approvalLog.approvalLevel, approvalLevel)
    ),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 1,
  });

  if (logs.length === 0) return null;
  
  const log = logs[0];
  return {
    id: log.id,
    folderId: log.folderId,
    contractId: log.contractId,
    userId: log.userId,
    approvalLevel: log.approvalLevel as ApprovalLevel,
    status: log.status as 'approved' | 'rejected' | 'pending',
    note: log.note,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

/**
 * Get the single most recent approval log for a folder (across all levels)
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns Latest approval log or null
 */
export async function getLatestApprovalLog(
  folderId: string,
  tx: DbOrTx = db
): Promise<ApprovalLogEntry | null> {
  const logs = await tx.query.approvalLog.findMany({
    where: eq(approvalLog.folderId, folderId),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 1,
  });

  if (logs.length === 0) return null;

  const log = logs[0];
  return {
    id: log.id,
    folderId: log.folderId,
    contractId: log.contractId,
    userId: log.userId,
    approvalLevel: log.approvalLevel as ApprovalLevel,
    status: log.status as 'approved' | 'rejected' | 'pending',
    note: log.note,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

/**
 * Get the highest level that has been approved for a folder
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns Highest approved level or null
 */
export async function getHighestApprovedLevel(
  folderId: string,
  tx: DbOrTx = db
): Promise<ApprovalLevel | null> {
  // Check from highest to lowest level if any have been approved
  for (let i = APPROVAL_LEVELS.length - 1; i >= 0; i--) {
    const level = APPROVAL_LEVELS[i];
    const latestLog = await getLatestApprovalAtLevel(folderId, level, tx);
    
    if (latestLog && latestLog.status === 'approved') {
      return level;
    }
  }

  return null;
}

/**
 * Get the current approval status for a folder
 * Returns the highest level that has been acted upon (approved or rejected)
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns Current approval level or null if no logs yet
 */
export async function getCurrentApprovalLevel(
  folderId: string,
  tx: DbOrTx = db
): Promise<ApprovalLevel | null> {
  // Check from highest to lowest level if any have been acted upon
  for (let i = APPROVAL_LEVELS.length - 1; i >= 0; i--) {
    const level = APPROVAL_LEVELS[i];
    const latestLog = await getLatestApprovalAtLevel(folderId, level, tx);
    
    if (latestLog) {
      return level;
    }
  }

  return null;
}

/**
 * Get the next required approval level for a folder
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns Next approval level needed or 'evaluator' if none approved yet
 */
export async function getNextRequiredApprovalLevel(
  folderId: string,
  tx: DbOrTx = db
): Promise<ApprovalLevel | null> {
  // Find the highest approved level
  const highestApprovedLevel = await getHighestApprovedLevel(folderId, tx);

  if (!highestApprovedLevel) {
    return 'evaluator'; // Workflow starts with evaluator
  }

  // Return the next level after the highest approved level
  return getNextApprovalLevel(highestApprovedLevel);
}

/**
 * Submit an approval for a folder at a specific level
 * @param folderId Folder ID
 * @param contractId Contract ID
 * @param userId User ID submitting the approval
 * @param userRole User role (will be mapped to approvalLevel: evaluator, verifikator, manager)
 * @param status Approval status (approved or rejected)
 * @param note Optional note
 * @param tx Optional database transaction
 * @returns Created approval log entry
 */
export async function submitApproval(
  folderId: string,
  contractId: string,
  userId: string,
  userRole: string,
  status: 'approved' | 'rejected',
  note?: string,
  tx: DbOrTx = db
): Promise<ApprovalLogEntry> {
  // Map user role to approval level
  const approvalLevel = mapRoleToApprovalLevel(userRole);
  
  if (!approvalLevel) {
    throw new Error(`User role '${userRole}' is not allowed to submit approval. Must be: evaluator, verifikator, or manager`);
  }
  // Validate folder exists
  const folder = await tx.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId),
  });

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }

  // Validate it's a depth 0 folder
  if (folder.depth !== 0) {
    throw new Error('Only depth 0 folders can be approved');
  }

  // Validate approval level is valid
  if (!APPROVAL_LEVELS.includes(approvalLevel)) {
    throw new Error(`Invalid approval level: ${approvalLevel}`);
  }

  // Validate status
  if (status !== 'approved' && status !== 'rejected') {
    throw new Error(`Invalid status: ${status}`);
  }

  // Check if this level has already been approved
  const latestAtLevel = await getLatestApprovalAtLevel(folderId, approvalLevel, tx);
  if (latestAtLevel && latestAtLevel.status === 'approved') {
    throw new Error(`Approval at level '${approvalLevel}' has already been submitted and approved for this folder`);
  }

  // Check if the required prerequisite level has been approved
  if (approvalLevel !== 'evaluator') {
    const currentLevel = await getCurrentApprovalLevel(folderId, tx);
    
    if (!currentLevel) {
      throw new Error(`Cannot submit approval at level '${approvalLevel}' without prior evaluator approval`);
    }

    // Check if all previous levels are approved
    const requiredLevelIndex = APPROVAL_LEVELS.indexOf(approvalLevel);
    for (let i = 0; i < requiredLevelIndex; i++) {
      const checkLevel = APPROVAL_LEVELS[i];
      const checkLog = await getLatestApprovalAtLevel(folderId, checkLevel, tx);
      
      if (!checkLog || checkLog.status !== 'approved') {
        throw new Error(`Cannot submit approval at level '${approvalLevel}' until all previous levels are approved`);
      }
    }
  }

  // If rejecting, we need to allow contractor to fix
  if (status === 'rejected') {
    // Update folder status to allow contractor to fix
    await tx.update(contractFolder)
      .set({
        isFinal: false,
        status: 'reject',
        updatedAt: new Date(),
      })
      .where(eq(contractFolder.id, folderId));
  }

  // Check if there is a pending log for this level to update
  const existingPendingLog = await tx.query.approvalLog.findFirst({
    where: and(
      eq(approvalLog.folderId, folderId),
      eq(approvalLog.approvalLevel, approvalLevel),
      eq(approvalLog.status, 'pending')
    ),
  });

  let createdLog;
  if (existingPendingLog) {
    // Update existing pending log
    [createdLog] = await tx.update(approvalLog)
      .set({
        userId,
        status,
        note: note || null,
        updatedAt: new Date(),
      })
      .where(eq(approvalLog.id, existingPendingLog.id))
      .returning();
  } else {
    // Create the approval log
    [createdLog] = await tx.insert(approvalLog).values({
      folderId,
      contractId,
      userId,
      approvalLevel,
      status,
      note: note || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  }

  if (!createdLog) {
    throw new Error('Failed to create/update approval log');
  }

  return {
    id: createdLog.id,
    folderId: createdLog.folderId,
    contractId: createdLog.contractId,
    userId: createdLog.userId,
    approvalLevel: createdLog.approvalLevel as ApprovalLevel,
    status: createdLog.status as 'approved' | 'rejected' | 'pending',
    note: createdLog.note,
    createdAt: createdLog.createdAt,
    updatedAt: createdLog.updatedAt,
  };
}

/**
 * Get approval summary for a folder (for display purposes)
 * @param folderId Folder ID
 * @param tx Optional database transaction
 * @returns Approval summary with current status and history
 */
/**
 * Get folder IDs that require approval for a specific approval level
 * Returns only folders where:
 * - All previous levels (if any) are approved
 * - Current level has NOT yet been submitted
 * @param approvalLevel The approval level to check for (evaluator, verifikator, or manager)
 * @param tx Optional database transaction
 * @returns Array of folder IDs requiring approval at this level
 */
export async function getFoldersRequiringApprovalAtLevel(
  approvalLevel: ApprovalLevel,
  tx: DbOrTx = db
): Promise<string[]> {
  // Get all depth 0 assessment folders using direct SQL for name filtering
  const depth0AssessmentFolders = await tx.query.contractFolder.findMany({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.depth, 0),
        sql`(${fields.name} LIKE '% - PB' OR ${fields.name} LIKE '% - PA' OR ${fields.name} LIKE '% - PSB')`
      ),
    columns: { id: true, isFinal: true },
  });

  const requiresApprovalFolders: string[] = [];

  for (const folder of depth0AssessmentFolders) {
    const folderId = folder.id;
    
    // Check if folder is marked as final (ready for evaluation)
    if (!folder.isFinal) {
      continue;
    }

    // Check if current level has already been approved
    const currentLevelLog = await getLatestApprovalAtLevel(folderId, approvalLevel, tx);
    if (currentLevelLog && currentLevelLog.status === 'approved') {
      // Already approved at this level
      continue;
    }

    // If evaluator level, we already checked isFinal above
    if (approvalLevel === 'evaluator') {
      requiresApprovalFolders.push(folderId);
      continue;
    }

    // For verifikator and manager, check if all previous levels are approved
    const levelIndex = APPROVAL_LEVELS.indexOf(approvalLevel);
    let allPreviousApproved = true;

    for (let i = 0; i < levelIndex; i++) {
      const checkLevel = APPROVAL_LEVELS[i];
      const checkLog = await getLatestApprovalAtLevel(folderId, checkLevel, tx);

      if (!checkLog || checkLog.status !== 'approved') {
        allPreviousApproved = false;
        break;
      }
    }

    if (allPreviousApproved) {
      requiresApprovalFolders.push(folderId);
    }
  }

  return requiresApprovalFolders;
}

/**
 * Get contract IDs that are relevant to a specific approval level
 * "Relevant" means the contract has at least one folder that:
 * - Needs approval at this level OR
 * - Has already been approved at this level (or higher)
 * @param approvalLevel The approval level to check for
 * @param tx Optional database transaction
 * @returns Array of contract IDs relevant to this level
 */
export async function getContractsRelevantToLevel(
  approvalLevel: ApprovalLevel,
  statusFilter?: 'waiting' | 'rejected',
  tx: DbOrTx = db
): Promise<string[]> {
  // Get all depth 0 assessment folders
  const depth0AssessmentFolders = await tx.query.contractFolder.findMany({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.depth, 0),
        sql`(${fields.name} LIKE '% - PB' OR ${fields.name} LIKE '% - PA' OR ${fields.name} LIKE '% - PSB')`
      ),
    columns: { id: true, contractId: true, isFinal: true },
  });

  const relevantContractIds: string[] = [];

  for (const folder of depth0AssessmentFolders) {
    const folderId = folder.id;
    const highestApproved = await getHighestApprovedLevel(folderId, tx);
    const currentLevel = await getCurrentApprovalLevel(folderId, tx);
    let isRelevant = false;

    // For 'waiting' filter, skip folders whose latest log is 'rejected'
    if (statusFilter === 'waiting') {
      const latestLog = await getLatestApprovalLog(folderId, tx);
      if (latestLog && latestLog.status === 'rejected') continue;
    }

    if (approvalLevel === 'evaluator') {
      if (statusFilter === 'waiting') {
        // Waiting: isFinal and evaluator has NOT approved or rejected yet
        // (a 'pending' log may exist automatically when folder becomes isFinal)
        const evaluatorLog = await getLatestApprovalAtLevel(folderId, 'evaluator', tx);
        const evaluatorActed = evaluatorLog && (evaluatorLog.status === 'approved' || evaluatorLog.status === 'rejected');
        if (folder.isFinal && !evaluatorActed) isRelevant = true;
      } else {
        // All: isFinal folders (ready for eval) OR already evaluated (by any level)
        if (folder.isFinal || currentLevel !== null) isRelevant = true;
      }
    } else if (approvalLevel === 'verifikator') {
      if (statusFilter === 'waiting') {
        // Waiting: evaluator approved AND verifikator has NOT approved or rejected yet
        const verifikatorLog = await getLatestApprovalAtLevel(folderId, 'verifikator', tx);
        const verifikatorActed = verifikatorLog && (verifikatorLog.status === 'approved' || verifikatorLog.status === 'rejected');
        if (highestApproved === 'evaluator' && !verifikatorActed) isRelevant = true;
      } else {
        // All: folders that have passed evaluator (at any level)
        if (highestApproved === 'evaluator' || highestApproved === 'verifikator' || highestApproved === 'manager') isRelevant = true;
      }
    } else if (approvalLevel === 'manager') {
      if (statusFilter === 'waiting') {
        // Waiting: verifikator approved AND manager has NOT approved or rejected yet
        const managerLog2 = await getLatestApprovalAtLevel(folderId, 'manager', tx);
        const managerActed = managerLog2 && (managerLog2.status === 'approved' || managerLog2.status === 'rejected');
        if (highestApproved === 'verifikator' && !managerActed) isRelevant = true;
      } else {
        // All: verifikator approved (at any stage)
        if (highestApproved === 'verifikator' || highestApproved === 'manager') isRelevant = true;
      }
    }

    if (isRelevant) {
      relevantContractIds.push(folder.contractId);
    }
  }

  return [...new Set(relevantContractIds)];
}

/**
 * Get contract IDs that have at least one fully approved folder
 * @param tx Optional database transaction
 * @returns Array of contract IDs with fully approved folders
 */
export async function getContractsWithFullyApprovedFolders(
  tx: DbOrTx = db
): Promise<string[]> {
  // Get all depth 0 assessment folders
  const depth0AssessmentFolders = await tx.query.contractFolder.findMany({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.depth, 0),
        sql`(${fields.name} LIKE '% - PB' OR ${fields.name} LIKE '% - PA' OR ${fields.name} LIKE '% - PSB')`
      ),
    columns: { id: true, contractId: true },
  });

  const fullyApprovedContractIds: string[] = [];

  for (const folder of depth0AssessmentFolders) {
    const managerLog = await getLatestApprovalAtLevel(folder.id, 'manager', tx);
    if (managerLog && managerLog.status === 'approved') {
      fullyApprovedContractIds.push(folder.contractId);
    }
  }

  return [...new Set(fullyApprovedContractIds)];
}

/**
 * Get approval metrics counts for a specific user and approval level
 * 1. Contracts with folders waiting for approval at user's level
 * 2. Contracts with folders already approved by the logged-in user (by userId)
 * 3. Contracts with folders fully approved by all roles (manager approved)
 * 4. Contracts with folders still pending (not fully approved by all roles)
 */
export async function getApprovalMetricsByUser(
  userId: string,
  approvalLevel: ApprovalLevel | null,
  tx: DbOrTx = db
): Promise<{
  pendingForUser: number;
  approvedByUser: number;
  fullyApproved: number;
  awaitingReview: number;
}> {
  // Get all depth 0 assessment folders
  const depth0AssessmentFolders = await tx.query.contractFolder.findMany({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.depth, 0),
        sql`(${fields.name} LIKE '% - PB' OR ${fields.name} LIKE '% - PA' OR ${fields.name} LIKE '% - PSB')`
      ),
    columns: { id: true, contractId: true, isFinal: true },
  });

  const folderIds = depth0AssessmentFolders.map(f => f.id);

  if (folderIds.length === 0) {
    return { pendingForUser: 0, approvedByUser: 0, fullyApproved: 0, awaitingReview: 0 };
  }

  // Fetch all approval logs for these folders in one query
  const allLogs = await tx.query.approvalLog.findMany({
    where: inArray(approvalLog.folderId, folderIds),
  });

  // Build a map: folderId -> logs
  const logsByFolder = new Map<string, typeof allLogs>();
  for (const log of allLogs) {
    if (!logsByFolder.has(log.folderId)) logsByFolder.set(log.folderId, []);
    logsByFolder.get(log.folderId)!.push(log);
  }

  const waitingContractIds = new Set<string>();
  const approvedByMeContractIds = new Set<string>();
  const fullyApprovedContractIds = new Set<string>();
  const pendingContractIds = new Set<string>();

  for (const folder of depth0AssessmentFolders) {
    const logs = logsByFolder.get(folder.id) || [];

    // Helper: get latest log at a specific level
    const getLatestAtLevel = (level: ApprovalLevel) => {
      return logs
        .filter(l => l.approvalLevel === level)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
    };

    const managerLog = getLatestAtLevel('manager');
    const isFullyApproved = !!(managerLog && managerLog.status === 'approved');

    // Only consider isFinal folders for approval metrics
    if (!folder.isFinal) continue;

    // Metric 3: fully approved by all roles
    if (isFullyApproved) {
      fullyApprovedContractIds.add(folder.contractId);
    } else {
      // Metric 4: awaitingReview — isFinal folders that are NOT fully approved
      // and have at least one log (i.e. approval process has started: pending, mid-approval, or rejected)
      if (logs.length > 0) {
        pendingContractIds.add(folder.contractId);
      }
    }

    if (approvalLevel) {
      // Metric 1: waiting for my approval
      // Folder is waiting if:
      // - Not yet approved or rejected at my level (only pending log may exist)
      // - All prerequisite levels are approved (or I am evaluator and folder is isFinal)
      const myLevelLog = getLatestAtLevel(approvalLevel);
      const alreadyActedByLevel = !!(myLevelLog && (myLevelLog.status === 'approved' || myLevelLog.status === 'rejected'));

      if (!alreadyActedByLevel) {
        let prerequisitesMet = false;
        if (approvalLevel === 'evaluator') {
          // Only pending if isFinal AND not yet fully approved by all roles
          prerequisitesMet = !!folder.isFinal && !isFullyApproved;
        } else {
          const levelIndex = APPROVAL_LEVELS.indexOf(approvalLevel);
          prerequisitesMet = true;
          for (let i = 0; i < levelIndex; i++) {
            const prevLog = getLatestAtLevel(APPROVAL_LEVELS[i]);
            if (!prevLog || prevLog.status !== 'approved') {
              prerequisitesMet = false;
              break;
            }
          }
        }
        if (prerequisitesMet) {
          waitingContractIds.add(folder.contractId);
        }
      }

      // Metric 2: approved at my role level (by any user with this approval level)
      if (myLevelLog && myLevelLog.status === 'approved') {
        approvedByMeContractIds.add(folder.contractId);
      }
    }
  }

  return {
    pendingForUser: waitingContractIds.size,
    approvedByUser: approvedByMeContractIds.size,
    fullyApproved: fullyApprovedContractIds.size,
    awaitingReview: pendingContractIds.size,
  };
}

export async function getApprovalSummary(
  folderId: string,
  tx: DbOrTx = db
): Promise<{
  folderId: string;
  currentApprovalLevel: ApprovalLevel | null;
  nextRequiredLevel: ApprovalLevel | null;
  approvalHistory: Record<ApprovalLevel, Array<{
    status: 'accept' | 'rejected' | 'pending' | 'reopened';
    note?: string;
    approvedAt: Date;
    userName?: string;
  }>>;
  isFullyApproved: boolean;
}> {
  const [logs, currentLevel, nextLevel] = await Promise.all([
    getApprovalLogsForFolder(folderId, tx),
    getCurrentApprovalLevel(folderId, tx),
    getNextRequiredApprovalLevel(folderId, tx),
  ]);
  const highestApproved = await getHighestApprovedLevel(folderId, tx);

  // Get user names for the logs
  const userIds = [...new Set(logs.map(log => log.userId).filter((id): id is string => id !== null))];
  const users = userIds.length > 0 
    ? await tx.query.users.findMany({
        where: (fields, { inArray }) => inArray(fields.id, userIds as string[]),
        columns: { id: true, name: true },
      })
    : [];

  const userMap = new Map(users.map(u => [u.id, u.name]));

  // Format approval history grouped by level
  const historyByLevel: Record<ApprovalLevel, any[]> = {
    evaluator: [],
    verifikator: [],
    manager: []
  };

  logs.forEach(log => {
    const level = log.approvalLevel as ApprovalLevel;
    if (historyByLevel[level]) {
      let displayStatus: 'accept' | 'rejected' | 'pending' | 'reopened' = 'pending';
      if (log.status === 'approved') displayStatus = 'accept';
      else if (log.status === 'rejected') displayStatus = 'rejected';
      else if ((log.status as string) === 'reopened') displayStatus = 'reopened';

      historyByLevel[level].push({
        status: displayStatus,
        note: log.note || undefined,
        approvedAt: log.createdAt,
        userName: userMap.get(log.userId || ''),
      });
    }
  });

  // Check if fully approved (manager level approved)
  const isFullyApproved = !!(highestApproved === 'manager');

  return {
    folderId,
    currentApprovalLevel: currentLevel,
    nextRequiredLevel: nextLevel,
    approvalHistory: historyByLevel,
    isFullyApproved,
  };
}

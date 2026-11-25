import { db } from "../../../db/index.ts";
import { count, inArray } from "drizzle-orm";
import { isFolderStructureComplete } from "./folder-completion.service.ts";
import { contract } from "../../../db/schema/csms.schema.ts";

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
 * Count completed assessments across all contracts or for specific contracts
 * @param contractIds Optional array of contract IDs to filter by
 * @param subcontractorIds Optional array of subcontractor IDs to filter by
 * @returns Object with counts for ongoing and final assessments, total contracts, and completion rate
 */
export async function countOverallAssessments(contractIds?: string[], subcontractorIds?: string[]) {
  // Build query for assessment folders with optional contract/subcontractor filtering
  let folderQuery = db.query.contractFolder.findMany({
    where: (fields, { or, like, inArray, eq }) => {
      // Base condition for assessment folders
      let conditions: any[] = [
        like(fields.name, '% - PB'),
        like(fields.name, '% - PA'),
        like(fields.name, '% - PSB')
      ];
      
      // Add contract ID filter if provided
      if (contractIds && contractIds.length > 0) {
        conditions.push(inArray(fields.contractId, contractIds));
      }
      
      // Add subcontractor ID filter if provided
      if (subcontractorIds && subcontractorIds.length > 0) {
        // Need to join with contract table to filter by subcontractor
        // This will be handled after we get the folders
      }
      
      return or(...conditions);
    },
  });

  let assessmentFolders = await folderQuery;
  
  // If subcontractor IDs are provided, filter folders by subcontractor
  if (subcontractorIds && subcontractorIds.length > 0) {
    // Get contract IDs for the specified subcontractors
    const contractsForSubcontractors = await db
      .select({ id: contract.id })
      .from(contract)
      .where(inArray(contract.contractorId, subcontractorIds));
    
    const contractIdsForSubcontractors = contractsForSubcontractors.map(c => c.id);
    
    // Filter assessment folders by these contract IDs
    assessmentFolders = assessmentFolders.filter(folder => 
      contractIdsForSubcontractors.includes(folder.contractId)
    );
  }
  
  // If we're filtering by subcontractor IDs but got no contracts, return zeros
  if (subcontractorIds && subcontractorIds.length > 0 && assessmentFolders.length === 0) {
    return {
      ongoingAssessmentsCompleted: 0,
      finalAssessmentsCompleted: 0,
      totalContracts: 0,
      completionRate: 0
    };
  }

  let ongoingAssessmentsCompleted = 0;
  let finalAssessmentsCompleted = 0;

  // For each assessment folder, check completion status based on isEnabled and isComplete/isCompleteAssessment
  for (const folder of assessmentFolders) {
    // Check if this is a PB, PA, or PSB folder
    const isPSB = folder.name.endsWith(' - PSB');

    // PSB folders don't need K3LL structure, so they're not counted in completion metrics
    if (isPSB) {
      continue;
    }

    // Calculate isEnabled using the helper function
    const isEnabled = isFolderEnabled(folder.name);
    
    // Get isComplete status
    let isComplete = folder.isComplete;
    if (isComplete === null || isComplete === undefined) {
      isComplete = await isFolderStructureComplete(folder.id);
    }
    
    // Count based on logic:
    // - finalAssessmentsCompleted: isComplete is true
    // - ongoingAssessmentsCompleted: isEnabled is true AND not complete
    if (isComplete) {
      finalAssessmentsCompleted++;
    } else if (isEnabled) {
      ongoingAssessmentsCompleted++;
    }
  }

  // Get total contract count based on filters
  let totalContracts = 0;
  if (subcontractorIds && subcontractorIds.length > 0) {
    // Count contracts for specified subcontractors
    const totalContractsResult = await db
      .select({ count: count() })
      .from(contract)
      .where(inArray(contract.contractorId, subcontractorIds));
    totalContracts = totalContractsResult[0]?.count ?? 0;
  } else if (contractIds && contractIds.length > 0) {
    // Count specified contracts
    totalContracts = contractIds.length;
  } else {
    // Count all contracts
    const totalContractsResult = await db.select({ count: count() }).from(contract);
    totalContracts = totalContractsResult[0]?.count ?? 0;
  }
  
  // Calculate completion rate percentage
  // Completion rate is based on final assessments completed
  let completionRate = finalAssessmentsCompleted / (ongoingAssessmentsCompleted + finalAssessmentsCompleted) * 100;
  if (isNaN(completionRate)) {
    completionRate = 0;
  } else {
    completionRate = (completionRate);
  }

  return {
    ongoingAssessmentsCompleted,
    finalAssessmentsCompleted,
    totalContracts,
    completionRate
  };
}

/**
 * Count completed assessments for a contract
 * @param contractId 
 * @returns Object with counts for ongoing and final assessments
 */
export async function countContractAssessments(contractId: string) {
  // Get all PB (Penilaian Berjalan), PA (Penilaian Akhir), and PSB folders for this contract
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, or, like }) => 
      and(
        eq(fields.contractId, contractId),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      ),
  });

  let ongoingAssessmentsCompleted = 0;
  let finalAssessmentsCompleted = 0;

  // For each assessment folder, check completion status based on isEnabled and isComplete/isCompleteAssessment
  for (const folder of assessmentFolders) {
    // Check if this is a PB, PA, or PSB folder
    const isPSB = folder.name.endsWith(' - PSB');

    // PSB folders don't need K3LL structure, so they're not counted in completion metrics
    if (isPSB) {
      continue;
    }

    // Calculate isEnabled using the helper function
    const isEnabled = isFolderEnabled(folder.name);
    
    // Get isComplete status
    let isComplete = folder.isComplete;
    if (isComplete === null || isComplete === undefined) {
      isComplete = await isFolderStructureComplete(folder.id);
    }
    
    // Count based on logic:
    // - finalAssessmentsCompleted: isComplete is true
    // - ongoingAssessmentsCompleted: isEnabled is true AND not complete
    if (isComplete) {
      finalAssessmentsCompleted++;
    } else if (isEnabled) {
      ongoingAssessmentsCompleted++;
    }
  }

  return {
    ongoingAssessmentsCompleted,
    finalAssessmentsCompleted
  };
}

/**
 * Get assessment metrics for multiple contracts (optimized batch query)
 * @param contractIds 
 * @returns Map of contract IDs to their assessment metrics
 */
export async function getContractsAssessmentMetrics(contractIds: string[]) {
  const metricsMap: Record<string, { ongoingAssessmentsCompleted: number, finalAssessmentsCompleted: number }> = {};
  
  if (contractIds.length === 0) {
    return metricsMap;
  }
  
  // Initialize all contracts with zero metrics
  for (const contractId of contractIds) {
    metricsMap[contractId] = {
      ongoingAssessmentsCompleted: 0,
      finalAssessmentsCompleted: 0
    };
  }
  
  // Fetch all assessment folders for all contracts in one query (avoid N+1)
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { inArray, or, like, and, eq }) => {
      const conditions: any[] = [
        like(fields.name, '% - PB'),
        like(fields.name, '% - PA'),
        like(fields.name, '% - PSB')
      ];
      return and(
        eq(fields.depth, 0),
        inArray(fields.contractId, contractIds),
        or(...conditions)
      );
    },
    columns: {
      id: true,
      contractId: true,
      name: true,
      isComplete: true,
    },
  });
  
  // Process all folders and group by contract
  for (const folder of assessmentFolders) {
    // Skip PSB folders
    const isPSB = folder.name.endsWith(' - PSB');
    if (isPSB) {
      continue;
    }
    
    // Calculate isEnabled using the helper function
    const isEnabled = isFolderEnabled(folder.name);
    
    // Use completion status directly from database without slow recursive traversal
    const isComplete = folder.isComplete === true;
    
    // Count based on logic:
    // - finalAssessmentsCompleted: isComplete is true
    // - ongoingAssessmentsCompleted: isEnabled is true AND not complete
    if (isComplete) {
      metricsMap[folder.contractId].finalAssessmentsCompleted++;
    } else if (isEnabled) {
      metricsMap[folder.contractId].ongoingAssessmentsCompleted++;
    }
  }
  
  return metricsMap;
}
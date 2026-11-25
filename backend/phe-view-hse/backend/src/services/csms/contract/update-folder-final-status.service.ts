import { db } from "../../../db/index.ts";
import { approvalLog, contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, sql, and } from "drizzle-orm";
import { getFolderById } from "./assessment.service.ts";
import { getNextRequiredApprovalLevel } from "./approval.service.ts";
import { getMissingMandatoryFolders } from "./folder-completion.service.ts";

/**
 * Update the final status of a depth 0 folder
 * When isFinal is set to true, all children folders and files will have editing disabled
 * @param folderId 
 * @param isFinal 
 * @returns Updated folder
 */
export async function updateFolderFinalStatus(folderId: string, isFinal: boolean) {
  // Get the folder to check if it's a depth 0 folder
  const folder = await getFolderById(folderId);
  
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }
  
  // Check if this is a depth 0 folder
  if (folder.depth !== 0) {
    throw new Error("Only depth 0 folders can have final status updated");
  }
  
  // When setting isFinal to true, check if all mandatory folders have files
  if (isFinal) {
    const missing = await getMissingMandatoryFolders(folderId);
    if (missing.length > 0) {
      throw new Error(`Penilaian belum dapat difinalisasi karena masih ada folder wajib yang belum terisi file: ${missing.join(', ')}`);
    }
  }
  
  // Update the isFinal status in the database
  try {
    await db.update(contractFolder).set({
      isFinal: isFinal,
      isComplete: isFinal ? true : folder.isComplete,
      updatedAt: new Date(),
    }).where(eq(contractFolder.id, folderId));
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to update folder final status: ${error.message}`);
    }
    throw new Error(`Failed to update folder final status: Unknown error occurred`);
  }
  
  // If setting to final, disable editing for all children and create/update evaluator log
  if (isFinal) {
    // Disable editing for all descendants of this folder (both folders and files)
    // Using ltree path to find descendants: folder.path.*
    try {
      await db.update(contractFolder).set({
        updatedAt: new Date(),
      }).where(
        sql`${contractFolder.path} <@ ${folder.path} AND ${contractFolder.id} != ${folderId}`
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to disable editing for descendants: ${error.message}`);
      }
      throw new Error(`Failed to disable editing for descendants: Unknown error occurred`);
    }

    // Create or update approval log with status 'pending' at the next required level
    try {
      const targetLevel = await getNextRequiredApprovalLevel(folderId);
      
      if (targetLevel) {
        const latestLog = await db.query.approvalLog.findFirst({
          where: and(
            eq(approvalLog.folderId, folderId),
            eq(approvalLog.approvalLevel, targetLevel)
          ),
          orderBy: (fields, { desc }) => [desc(fields.createdAt)],
        });

        if (latestLog && latestLog.status === 'pending') {
          // Already has a pending log, just update the timestamp
          await db.update(approvalLog)
            .set({
              updatedAt: new Date(),
            })
            .where(eq(approvalLog.id, latestLog.id));
        } else {
          // No log exists OR latest is already approved/rejected: create a NEW pending row to preserve history
          await db.insert(approvalLog).values({
            folderId,
            contractId: folder.contractId,
            approvalLevel: targetLevel,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create/update approval log: ${error.message}`);
      }
      throw new Error(`Failed to create/update approval log: Unknown error occurred`);
    }
  }
  
  // Return the updated folder
  try {
    return await getFolderById(folderId);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve updated folder: ${error.message}`);
    }
    throw new Error(`Failed to retrieve updated folder: Unknown error occurred`);
  }
}

/**
 * Get all descendant folders of a given folder
 * @param folderId 
 * @returns Array of descendant folders
 */
export async function getDescendantFolders(folderId: string) {
  const folder = await getFolderById(folderId);
  
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }
  
  // Get all folders that are descendants of this folder
  // Using ltree path to find descendants: folder.path.*
  try {
    const descendants = await db.query.contractFolder.findMany({
      where: (fields, { sql }) => 
        sql`${fields.path} <@ ${folder.path} AND ${fields.id} != ${folderId}`,
    });
    
    return descendants;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve descendant folders: ${error.message}`);
    }
    throw new Error(`Failed to retrieve descendant folders: Unknown error occurred`);
  }
}

/**
 * Disable editing for all descendant folders
 * @param folderId 
 */
export async function disableEditingForDescendants(folderId: string) {
  const folder = await getFolderById(folderId);
  
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }
  
  // Disable editing for all descendants of this folder (both folders and files)
  try {
    await db.update(contractFolder).set({
      updatedAt: new Date(),
    }).where(
      sql`${contractFolder.path} <@ ${folder.path} AND ${contractFolder.id} != ${folderId}`
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to disable editing for descendants: ${error.message}`);
    }
    throw new Error(`Failed to disable editing for descendants: Unknown error occurred`);
  }
}

/**
 * Check if a folder is marked as final
 * @param folderId 
 * @returns Boolean indicating if the folder is final
 */
export async function isFolderFinal(folderId: string): Promise<boolean> {
  try {
    const folder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, folderId),
    });
    
    return folder?.isFinal || false;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to check if folder is final: ${error.message}`);
    }
    throw new Error(`Failed to check if folder is final: Unknown error occurred`);
  }
}
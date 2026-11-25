import { db } from "../../../db/index.ts";
import { contract, contractFolder, alarmCsmsLog } from "../../../db/schema/csms.schema.ts";
import { userAlarmLog } from "../../../db/schema/auth.schema.ts";
import { eq, inArray } from "drizzle-orm";
import { isK3LLStructureFolder } from './folder.service.ts';
import fs from 'fs/promises'
import { getContractById } from "./list.service.ts";
import { deleteFolder } from "./folder.service.ts";
import { isFolderStructureComplete, updateAllAssessmentFoldersCompletionStatus, isK3LLFolderComplete, areAllChildrenComplete, updateAllParentFoldersCompletionStatus } from './folder-completion.service.ts'
import { calculateFolderScore, getAncestors } from './assessment.service.ts';
import { uploadsPath } from "../../../config/env.config.ts";

/**
 * Delete a contract and all associated folders/files
 * @param id Contract ID
 * @returns Deletion result
 */
export async function deleteContract(id: string) {
  try {
    // First, get the contract to be deleted
    const contractData = await getContractById(id);
    
    if (!contractData) {
      throw new Error("Contract not found");
    }
    
    // Delete all folders associated with this contract
    // This will cascade delete all files as well due to foreign key constraints
    const folders = await db.query.contractFolder.findMany({
      where: eq(contractFolder.contractId, id),
    });
    
    console.log(`Found ${folders.length} folders to delete for contract ${id}`);
    
    // Delete folders one by one to ensure proper cleanup
    // Skip K3LL structure folders as they are protected from deletion
    for (const folder of folders) {
      // Check if this is a K3LL structure folder (these root folders should not be deleted)
      if (isK3LLStructureFolder(folder.name)) {
        console.log(`Skipping deletion of protected K3LL folder: ${folder.name} (${folder.id})`);
        continue;
      }
        
      try {
        await deleteFolder(folder.id);
      } catch (error: unknown) {
        console.error(`Error deleting folder ${folder.id}:`, error);
        // Instead of continuing, let's re-throw the error to prevent partial deletion
        if (error instanceof Error) {
          throw new Error(`Failed to delete folder ${folder.id}: ${error.message}`);
        } else {
          throw new Error(`Failed to delete folder ${folder.id}: Unknown error occurred`);
        }
      }
    }
    
    // Verify all folders have been deleted (excluding protected K3LL structure folders)
    const remainingFolders = await db.query.contractFolder.findMany({
      where: eq(contractFolder.contractId, id),
    });
    
    // Filter out K3LL structure folders as these are protected and expected to remain
    const deletableFolders = remainingFolders.filter(folder => !isK3LLStructureFolder(folder.name));
    
    console.log(`Remaining deletable folders for contract ${id}: ${deletableFolders.length}`);
    
    if (deletableFolders.length > 0) {
      console.log('Remaining deletable folders details:', deletableFolders.map(f => ({ id: f.id, name: f.name, path: f.path })));
      throw new Error(`Failed to delete all folders. ${deletableFolders.length} folders still remain.`);
    }
    
    // Check if there are any remaining alarm logs for this contract
    const remainingAlarmLogs = await db.query.alarmCsmsLog.findMany({
      where: eq(alarmCsmsLog.contractId, id),
    });
    
    console.log(`Remaining alarm logs for contract ${id}: ${remainingAlarmLogs.length}`);
    
    // If there are alarm logs, we need to delete the user alarm logs that reference them first
    if (remainingAlarmLogs.length > 0) {
      console.log('Remaining alarm logs details:', remainingAlarmLogs.map(log => ({ id: log.id, title: log.title, type: log.type })));
      
      // Get the IDs of the alarm logs
      const alarmLogIds = remainingAlarmLogs.map(log => log.id);
      
      // Delete user alarm logs that reference these alarm CSMS logs
      console.log(`Deleting user alarm logs that reference ${alarmLogIds.length} alarm CSMS logs`);
      try {
        await db.delete(userAlarmLog).where(
          inArray(userAlarmLog.alarmCsmsId, alarmLogIds)
        );
        console.log(`Attempted to delete user alarm logs`);
      } catch (deleteUserAlarmError) {
        console.warn('Error deleting user alarm logs:', deleteUserAlarmError);
        // Continue anyway as the cascade delete might still work
      }
    }
    
    // Perform a more comprehensive check for any remaining references
    try {
      // Check contract folders again right before deletion
      const finalFolderCheck = await db.query.contractFolder.findMany({
        where: eq(contractFolder.contractId, id),
      });
      
      // Filter out K3LL structure folders for the final check
      const finalDeletableFolders = finalFolderCheck.filter(folder => !isK3LLStructureFolder(folder.name));
      
      if (finalDeletableFolders.length > 0) {
        console.log(`Final check - found ${finalDeletableFolders.length} deletable contract folders for contract ${id}`);
        console.log('Final deletable folder check details:', finalDeletableFolders.map(f => ({ id: f.id, name: f.name, path: f.path })));
      }
      
      // Check alarm logs again right before deletion
      const finalAlarmLogCheck = await db.query.alarmCsmsLog.findMany({
        where: eq(alarmCsmsLog.contractId, id),
      });
      
      if (finalAlarmLogCheck.length > 0) {
        console.log(`Final check - found ${finalAlarmLogCheck.length} alarm logs for contract ${id}`);
        console.log('Final alarm log check details:', finalAlarmLogCheck.map(l => ({ id: l.id, title: l.title, type: l.type })));
      }
    } catch (checkError) {
      console.warn('Error during final reference check:', checkError);
    }
    
    // Finally, delete the contract itself
    console.log(`Deleting contract ${id}`);
      
    // Log the exact query that will be executed
    console.log(`Executing DELETE query for contract ID: ${id}`);
    
    let deletedContract;
    try {
      [deletedContract] = await db.delete(contract).where(eq(contract.id, id)).returning();
      console.log(`Successfully deleted contract. Rows returned: ${deletedContract ? 1 : 0}`);
    } catch (error) {
      console.error('Error deleting contract:', error);
      // Log additional details about the contract that failed to delete
      try {
        const contractCheck = await db.query.contract.findFirst({
          where: eq(contract.id, id)
        });
        if (contractCheck) {
          console.log(`Contract still exists:`, {
            id: contractCheck.id,
            title: contractCheck.title,
            contractorId: contractCheck.contractorId
          });
        } else {
          console.log('Contract does not exist in database');
        }
      } catch (checkError) {
        console.warn('Error checking if contract still exists:', checkError);
      }
      throw new Error(`Failed to delete contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    if (!deletedContract) {
      throw new Error("Failed to delete contract - no rows returned from deletion");
    }
    
    return {
      success: true,
      message: `Contract ${deletedContract.title} and all associated data have been deleted`,
      contractId: deletedContract.id,
    };
  } catch (error) {
    console.error('Error in deleteContract:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred during contract deletion');
    }
  }
}

/**
 * Delete a file from a contract folder
 * @param fileId 
 * @returns Object with success status and deletion information
 */
export async function deleteContractFile(fileId: string) {
  // First, get the file to be deleted
  const file = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, fileId)
  });

  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }

  // Check if the item is actually a file (not a folder)
  if (file.fileType === 'folder') {
    throw new Error(`Item with ID ${fileId} is a folder, not a file. Use deleteFolder function instead.`);
  }

  // Check if root assessment folder is finalized
  let currentAncestor = file;
  while (currentAncestor.parentId) {
    const parent = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, currentAncestor.parentId)
    });
    if (!parent) break;
    currentAncestor = parent;
  }
  if (currentAncestor.isFinal) {
    throw new Error("Folder penilaian sudah difinalisasi. Berkas tidak dapat dihapus.");
  }

  // Delete the physical file from the filesystem
  if (file.filePath) {
    try {
      // Construct the full path to the file
      const fileUploadPath = uploadsPath('csms', 'contracts', file.contractId, file.id);
      
      // Delete the file and its thumbnail folder
      await fs.rm(fileUploadPath, { recursive: true, force: true });
    } catch (error: unknown) {
      // Log the error but don't stop the deletion process
      if (error instanceof Error) {
        console.warn(`Failed to delete physical files for file ${fileId}:`, error.message);
      } else {
        console.warn(`Failed to delete physical files for file ${fileId}: Unknown error occurred`);
      }
    }
  }

  // Store parent ID for completion status update
  const parentId = file.parentId;
  const contractId = file.contractId;

  // Delete the file record from the database
  await db.delete(contractFolder).where(eq(contractFolder.id, fileId));

  // Update the completion status of the parent folder
  if (parentId) {
    // Get the parent folder to determine its type
    const parentFolder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, parentId)
    });
    
    if (parentFolder) {
      let isComplete = false;
      let status: 'pending' | 'accept' | 'reject' | 'revision' = 'pending';
      
      // Check if this is an assessment folder (PB or PA or PSB)
      const isAssessmentFolder = parentFolder.name.endsWith(' - PB') || parentFolder.name.endsWith(' - PA') || parentFolder.name.endsWith(' - PSB');
      
      if (isAssessmentFolder) {
        // For assessment folders, use isFolderStructureComplete
        isComplete = await isFolderStructureComplete(parentId);
        // Set status to pending when file is deleted
        status = 'pending';
      } else {
        // For regular folders, check if all children are complete
        // If it's part of K3LL structure, use isK3LLFolderComplete, otherwise use areAllChildrenComplete
        const isK3LLFolder = parentFolder.name === 'A. RENCANA K3LL' || 
                            /^([1-8])\s/.test(parentFolder.name) ||  // Numbered K3LL folders (1, 2, 3, etc.)
                            /^([1-8])\.(\d+)/.test(parentFolder.name); // Sub-numbered K3LL folders (1.1, 1.2, etc.)
        
        if (isK3LLFolder) {
          isComplete = await isK3LLFolderComplete(parentId);
        } else {
          isComplete = await areAllChildrenComplete(parentId);
        }
      }
      
      await db.update(contractFolder).set({
        isComplete,
        status: status as 'pending' | 'accept' | 'reject' | 'revision',
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, parentId));
      
      // Recursively update all parent folders to ensure completion status propagates up the hierarchy
      await updateAllParentFoldersCompletionStatus(parentId);
      
      // Recalculate scores for the direct parent and all ancestors after deletion
      // Build the complete ancestor list including the direct parent
      const ancestors = await getAncestors(parentId);
      const allFoldersToUpdate = [parentId, ...ancestors];
      
      // Recalculate and update scores from child to parent (bottom-up)
      for (const folderId of allFoldersToUpdate) {
        const calculatedScore = await calculateFolderScore(folderId);
        await db.update(contractFolder).set({
          score: calculatedScore.toString(),
          updatedAt: new Date(),
        }).where(eq(contractFolder.id, folderId));
      }
    }
  }

  // Also update completion status for all assessment folders in the contract
  // to ensure the assessment folder completion status is properly updated
  if (contractId) {
    await updateAllAssessmentFoldersCompletionStatus(contractId);
  }

  return {
    fileId: file.id,
    fileName: file.name
  };
}

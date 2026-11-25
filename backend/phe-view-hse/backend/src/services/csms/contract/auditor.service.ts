import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, and } from "drizzle-orm";

/**
 * Add userId to depth 0 folders in a contract
 * @param contractId - The contract ID
 * @param userId - The user ID to add
 * @param folderId - Optional folder ID to target specific folder
 * @returns Object with success status and affected folders count
 */
export async function addUserIdToDepth0Folders(
  contractId: string,
  userId: string,
  folderId?: string
) {
  try {
    // Get depth 0 folders for this contract, optionally filtered by folderId
    const whereClause = folderId 
      ? and(eq(contractFolder.contractId, contractId), eq(contractFolder.depth, 0), eq(contractFolder.id, folderId))
      : and(eq(contractFolder.contractId, contractId), eq(contractFolder.depth, 0));
      
    const depth0Folders = await db.query.contractFolder.findMany({
      where: whereClause,
    });

    if (depth0Folders.length === 0) {
      return {
        success: true,
        message: folderId 
          ? "No depth 0 folder found with the specified ID for this contract"
          : "No depth 0 folders found for this contract",
        affectedFolders: 0
      };
    }

    // Update each depth 0 folder to add the userId to the userId array
    let affectedFolders = 0;
    
    for (const folder of depth0Folders) {
      // Get current userIds array or initialize as empty array
      const currentUsers = Array.isArray(folder.userId) ? folder.userId : [];
      
      // Check if userId is already in the array
      if (!currentUsers.includes(userId)) {
        // Add userId to the array
        const updatedUsers = [...currentUsers, userId];
        
        // Update the folder with the new userId array
        await db.update(contractFolder)
          .set({
            userId: updatedUsers,
            updatedAt: new Date()
          })
          .where(eq(contractFolder.id, folder.id));
          
        affectedFolders++;
      }
    }

    return {
      success: true,
      message: `Successfully added userId to ${affectedFolders} depth 0 folders`,
      affectedFolders
    };
  } catch (error: any) {
    throw new Error(`Failed to add userId to depth 0 folders: ${error.message}`);
  }
}

/**
 * Remove userId from depth 0 folders in a contract
 * @param contractId - The contract ID
 * @param userId - The user ID to remove
 * @param folderId - Optional folder ID to target specific folder
 * @returns Object with success status and affected folders count
 */
export async function removeUserIdFromDepth0Folders(
  contractId: string,
  userId: string,
  folderId?: string
) {
  try {
    // Get depth 0 folders for this contract, optionally filtered by folderId
    const whereClause = folderId 
      ? and(eq(contractFolder.contractId, contractId), eq(contractFolder.depth, 0), eq(contractFolder.id, folderId))
      : and(eq(contractFolder.contractId, contractId), eq(contractFolder.depth, 0));
      
    const depth0Folders = await db.query.contractFolder.findMany({
      where: whereClause,
    });

    if (depth0Folders.length === 0) {
      return {
        success: true,
        message: folderId 
          ? "No depth 0 folder found with the specified ID for this contract"
          : "No depth 0 folders found for this contract",
        affectedFolders: 0
      };
    }

    // Update each depth 0 folder to remove the userId from the userId array
    let affectedFolders = 0;
    
    for (const folder of depth0Folders) {
      // Get current userIds array or initialize as empty array
      const currentUsers = Array.isArray(folder.userId) ? folder.userId : [];
      
      // Check if userId is in the array
      if (currentUsers.includes(userId)) {
        // Remove userId from the array
        const updatedUsers = currentUsers.filter(id => id !== userId);
        
        // Update the folder with the new userId array
        await db.update(contractFolder)
          .set({
            userId: updatedUsers,
            updatedAt: new Date()
          })
          .where(eq(contractFolder.id, folder.id));
          
        affectedFolders++;
      }
    }

    return {
      success: true,
      message: `Successfully removed userId from ${affectedFolders} depth 0 folders`,
      affectedFolders
    };
  } catch (error: any) {
    throw new Error(`Failed to remove userId from depth 0 folders: ${error.message}`);
  }
}
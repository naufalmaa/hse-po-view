import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, and } from "drizzle-orm";

/**
 * Update assessmentDate for a specific depth 0 folder or all depth 0 folders in a contract
 * @param contractId - The contract ID
 * @param assessmentDate - The new assessment date
 * @param folderId - Optional folder ID to target specific folder
 * @returns Object with success status and affected folders count
 */
export async function updateAssessmentDateForDepth0Folders(
  contractId: string,
  assessmentDate: Date,
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

    // Update the folders
    await db.update(contractFolder)
      .set({
        assessmentDate: assessmentDate,
        updatedAt: new Date()
      })
      .where(whereClause);

    return {
      success: true,
      message: `Successfully updated assessmentDate for ${depth0Folders.length} folders`,
      affectedFolders: depth0Folders.length
    };
  } catch (error: any) {
    throw new Error(`Failed to update assessmentDate for depth 0 folders: ${error.message}`);
  }
}

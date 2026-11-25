import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import * as schema from "../../../db/schema/index.ts";
import { contract, contractFolder } from "../../../db/schema/csms.schema.ts";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getContractById } from "./list.service.ts";

type DbOrTx = NodePgDatabase<typeof schema.schema>;

/** "DD-MM-YYYY - PB" -> "YYYY-MM-DD", so folders sort chronologically. */
export function pbFolderSortKey(folderName: string): string {
  const [dd, mm, yyyy] = folderName.substring(0, 10).split('-');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Update assessment dates for a contract
 * @param contractId 
 * @param newFinalAssessmentDate 
 * @param newNearestOngoingAssessmentDate 
 * @param tx 
 * @param newPsbAssessmentDate
 * @param folderDates Explicit folder -> new date pairs. When given, only these PB
 *   folders are renamed, so a folder keeps its own contents whatever the order of
 *   the dates. Without it, PB folders are paired with the dates in chronological order.
 */
export async function updateAssessmentDates(
  contractId: string,
  newFinalAssessmentDate: string | undefined,
  newNearestOngoingAssessmentDate: any,
  tx: DbOrTx = db,
  newPsbAssessmentDate?: string,
  folderDates?: { folderId: string; date: string }[]
) {
  // Get contract details
  const contractData = await getContractById(contractId);

  if (!contractData) {
    throw new Error(`Contract with ID ${contractId} not found`);
  }

  // Validate final assessment date if provided
  if (newFinalAssessmentDate) {
    const start = new Date(contractData.startDate);
    const end = new Date(contractData.endDate);
    const finalAssessment = new Date(newFinalAssessmentDate);
    
    if (finalAssessment < start || finalAssessment > end) {
      throw new Error("Final assessment date must be between contract start and end dates");
    }
  }
  
  // Prepare update data
  const updateData: any = {
    nearestOngoingAssessmentDate: newNearestOngoingAssessmentDate,
    updatedAt: sql`NOW()`,
  };
  
  // Only include finalAssessmentDate in update if it's provided
  if (newFinalAssessmentDate !== undefined) {
    updateData.finalAssessmentDate = newFinalAssessmentDate;
  }

  // Only include startDate in update if newPsbAssessmentDate is provided
  if (newPsbAssessmentDate !== undefined) {
    updateData.startDate = newPsbAssessmentDate;
  }
  
  // Update contract with new assessment dates only
  const [updatedContract] = await tx.update(contract).set(updateData).where(eq(contract.id, contractId)).returning();

  // Get existing assessment folders for this contract (PB, PA, and PSB folders)
  const existingAssessmentFolders = await tx.query.contractFolder.findMany({
    where: (fields, { eq, and, or }) => 
      and(
        eq(fields.contractId, contractId),
        or(
          sql`name LIKE '% - PB'`,
          sql`name LIKE '% - PA'`,
          sql`name LIKE '% - PSB'`
        )
      ),
  });

  // Update folder names to match the new dates
  const updatedFolderNames: string[] = [];
  
  // Process PA folder only if final assessment date is provided
  const paFolder = existingAssessmentFolders.find(folder => folder.name.endsWith(' - PA'));
  if (paFolder && newFinalAssessmentDate) {
    // Extract current date from folder name (first 10 characters: DD-MM-YYYY)
    const currentFolderDate = paFolder.name.substring(0, 10);
    
    // Format the new final assessment date as DD-MM-YYYY
    const finalAssessment = new Date(newFinalAssessmentDate);
    const formattedFinalDate = `${String(finalAssessment.getDate()).padStart(2, '0')}-${String(finalAssessment.getMonth() + 1).padStart(2, '0')}-${finalAssessment.getFullYear()}`;
    
    const newFolderName = `${formattedFinalDate} - PA`;
    const newDescription = `Penilaian Akhir for ${formattedFinalDate}`;
    
    await tx.update(contractFolder).set({
      name: newFolderName,
      description: newDescription,
      assessmentDate: finalAssessment,
      updatedAt: new Date(),
    }).where(eq(contractFolder.id, paFolder.id));
    
    if (currentFolderDate !== formattedFinalDate) {
      updatedFolderNames.push(`${paFolder.name} → ${newFolderName}`);
    }
  }
  
  // Process PB folders - match them with nearest ongoing assessment dates
  const pbFolders = existingAssessmentFolders.filter(folder => folder.name.endsWith(' - PB'));
  if (Array.isArray(folderDates) && folderDates.length > 0) {
    // Rename only the folders the user edited, matched by id
    for (const { folderId, date } of folderDates) {
      const pbFolder = pbFolders.find(folder => folder.id === folderId);
      if (!pbFolder) {
        throw new Error(`PB folder ${folderId} does not belong to contract ${contractId}`);
      }

      const assessmentDate = new Date(date);
      const formattedAssessmentDate = `${String(assessmentDate.getDate()).padStart(2, '0')}-${String(assessmentDate.getMonth() + 1).padStart(2, '0')}-${assessmentDate.getFullYear()}`;
      const newFolderName = `${formattedAssessmentDate} - PB`;

      if (pbFolders.some(folder => folder.id !== folderId && folder.name === newFolderName)) {
        throw new Error(`PB folder already exists for date ${formattedAssessmentDate}`);
      }
      if (pbFolder.name === newFolderName) continue;

      await tx.update(contractFolder).set({
        name: newFolderName,
        description: `Penilaian Berjalan for ${formattedAssessmentDate}`,
        assessmentDate: assessmentDate,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, pbFolder.id));

      updatedFolderNames.push(`${pbFolder.name} → ${newFolderName}`);
    }
  } else if (Array.isArray(newNearestOngoingAssessmentDate) && pbFolders.length > 0) {
    // Sort PB folders by date (oldest first). Names are "DD-MM-YYYY - PB", so
    // compare as YYYY-MM-DD; comparing the raw string orders by day, not by date.
    pbFolders.sort((a, b) => pbFolderSortKey(a.name).localeCompare(pbFolderSortKey(b.name)));
    
    // Sort assessment dates (oldest first)
    const sortedAssessmentDates = [...newNearestOngoingAssessmentDate]
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    // Match each PB folder with an assessment date
    for (let i = 0; i < Math.min(pbFolders.length, sortedAssessmentDates.length); i++) {
      const pbFolder = pbFolders[i];
      const assessmentDate = sortedAssessmentDates[i];
      
      // Extract current date from folder name (first 10 characters: DD-MM-YYYY)
      const currentFolderDate = pbFolder.name.substring(0, 10);
      
      // Format the assessment date as DD-MM-YYYY
      const formattedAssessmentDate = `${String(assessmentDate.getDate()).padStart(2, '0')}-${String(assessmentDate.getMonth() + 1).padStart(2, '0')}-${assessmentDate.getFullYear()}`;
      
      const newFolderName = `${formattedAssessmentDate} - PB`;
      const newDescription = `Penilaian Berjalan for ${formattedAssessmentDate}`;
      
      await tx.update(contractFolder).set({
        name: newFolderName,
        description: newDescription,
        assessmentDate: assessmentDate,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, pbFolder.id));
      
      if (currentFolderDate !== formattedAssessmentDate) {
        updatedFolderNames.push(`${pbFolder.name} → ${newFolderName}`);
      }
    }
  }
  
  // Process PSB folder if newPsbAssessmentDate is provided
  const psbFolder = existingAssessmentFolders.find(folder => folder.name.endsWith(' - PSB'));
  if (psbFolder && newPsbAssessmentDate) {
    const currentFolderDate = psbFolder.name.substring(0, 10);
    const psbAssessment = new Date(newPsbAssessmentDate);
    const formattedPsbDate = `${String(psbAssessment.getDate()).padStart(2, '0')}-${String(psbAssessment.getMonth() + 1).padStart(2, '0')}-${psbAssessment.getFullYear()}`;

    const newFolderName = `${formattedPsbDate} - PSB`;
    const newDescription = `Penilaian Sebelum Berjalan for ${formattedPsbDate}`;

    await tx.update(contractFolder).set({
      name: newFolderName,
      description: newDescription,
      assessmentDate: psbAssessment,
      updatedAt: new Date(),
    }).where(eq(contractFolder.id, psbFolder.id));

    if (currentFolderDate !== formattedPsbDate) {
      updatedFolderNames.push(`${psbFolder.name} → ${newFolderName}`);
    }
  }

  let message = "Assessment dates updated successfully";
  if (updatedFolderNames.length > 0) {
    message += `. Folder names updated: ${updatedFolderNames.join(', ')}`;
  }

  return {
    success: true,
    message,
    contract: updatedContract
  };
}
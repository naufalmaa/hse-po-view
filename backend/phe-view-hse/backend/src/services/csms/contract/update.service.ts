import { db } from "../../../db/index.ts";
import { contract, contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

export interface UpdateContractInput {
  title?: string;
  numberContract?: string;
  riskAssessmentId?: string;
  riskLevel?: string;
  contractorId?: string;
  vesselId?: string;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string;   // YYYY-MM-DD format
  finalAssessmentDate?: string; // YYYY-MM-DD format
  note?: string;
  extra?: {
    projectId?: string;
    isAssessed?: boolean;
  };
}

/**
 * Update contract details
 * @param id Contract ID
 * @param input Updated contract details
 * @returns Updated contract
 */
export async function updateContract(id: string, input: UpdateContractInput) {
  // Validate dates if provided
  if (input.startDate && input.endDate) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    
    if (start >= end) {
      throw new Error("End date must be after start date");
    }
  }
  
  // Check if contract with same number already exists (if number is being updated)
  if (input.numberContract) {
    const existingContract = await db.query.contract.findFirst({
      where: eq(contract.numberContract, input.numberContract),
    });
    
    if (existingContract && existingContract.id !== id) {
      throw new Error("A contract with this number already exists");
    }
  }
  
  const updateData: any = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.riskAssessmentId !== undefined) {
    updateData.riskAssessmentId = input.riskAssessmentId?.trim() ? input.riskAssessmentId : "-";
  }
  if (input.riskLevel !== undefined) {
    updateData.riskLevel = input.riskLevel?.trim() ? input.riskLevel : "N/A";
  }

  // If endDate is provided but finalAssessmentDate is not, set finalAssessmentDate to endDate
  if (input.endDate && !input.finalAssessmentDate) {
    updateData.finalAssessmentDate = input.endDate;
  }

  // Update the contract
  const [updatedContract] = await db.update(contract).set(updateData).where(eq(contract.id, id)).returning();
  
  if (!updatedContract) {
    throw new Error("Contract not found");
  }

  // Update the PA folder date if finalAssessmentDate (or endDate) was updated
  const newFinalAssessmentDate = updateData.finalAssessmentDate;
  if (newFinalAssessmentDate) {
    // Find the folder ending with ' - PA' for this contract
    const paFolder = await db.query.contractFolder.findFirst({
      where: (fields, { eq, and, like }) =>
        and(
          eq(fields.contractId, id),
          like(fields.name, '% - PA')
        ),
    });

    if (paFolder) {
      const finalAssessment = new Date(newFinalAssessmentDate);
      const formattedFinalDate = `${String(finalAssessment.getDate()).padStart(2, '0')}-${String(finalAssessment.getMonth() + 1).padStart(2, '0')}-${finalAssessment.getFullYear()}`;
      
      const newFolderName = `${formattedFinalDate} - PA`;
      const newDescription = `Penilaian Akhir for ${formattedFinalDate}`;
      
      await db.update(contractFolder).set({
        name: newFolderName,
        description: newDescription,
        assessmentDate: finalAssessment,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, paFolder.id));
    }
  }
  
  return updatedContract;
}
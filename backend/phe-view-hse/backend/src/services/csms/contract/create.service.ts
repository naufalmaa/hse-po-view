import { db } from "../../../db/index.ts";
import { contract } from "../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

export interface CreateContractInput {
  contractorId: string;
  vesselId?: string; // Make optional since vessel is conditionally shown
  title: string;
  numberContract: string;
  riskAssessmentId?: string;
  riskLevel?: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  note?: string;
  extra?: {
    projectId?: string;
    isAssessed?: boolean;
  };
}

/**
 * Create a new contract
 * @param input Contract details
 * @returns Created contract
 */
export async function createContract(input: CreateContractInput) {
  // Validate dates
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  
  if (start >= end) {
    throw new Error("Invalid date");
  }
  
  // Check if contract with same number already exists
  const existingContract = await db.query.contract.findFirst({
    where: eq(contract.numberContract, input.numberContract),
  });
  
  if (existingContract) {
    throw new Error("A contract with this number already exists");
  }
  
  // Create the contract
  const [newContract] = await db.insert(contract).values({
    contractorId: input.contractorId,
    vesselId: input.vesselId || null, // Handle optional vesselId
    title: input.title,
    numberContract: input.numberContract,
    riskAssessmentId: input.riskAssessmentId?.trim() ? input.riskAssessmentId : "-",
    riskLevel: input.riskLevel?.trim() ? input.riskLevel : "N/A",
    startDate: input.startDate,
    endDate: input.endDate,
    finalAssessmentDate: input.endDate, // Set final assessment date to end date initially
    note: input.note || "",
    extra: input.extra || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  return newContract;
}
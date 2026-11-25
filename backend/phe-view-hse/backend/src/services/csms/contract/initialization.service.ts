import { createContractFolders, createSingleAssessmentFolder } from "./folder.service.ts";
import { initializeK3LLStructureForContract, createK3LLStructure } from "./k3ll-structure.service.ts";
import { getContractById } from "./list.service.ts";
import { db } from "../../../db/index.ts";
import { contract } from "../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

/**
 * Initialize complete contract folder structure including:
 * 1. Assessment date folders
 * 2. Final assessment folder
 * 3. K3LL structure under each assessment folder
 * @param contractId 
 */
export async function initializeContractStructure(contractId: string) {
  // Verify contract exists
  const contractData = await getContractById(contractId);

  if (!contractData) {
    throw new Error(`Contract with ID ${contractId} not found`);
  }

  // Create contract folders with assessment dates (this now includes PSB folder)
  await createContractFolders(contractId);

  // Initialize K3LL structure for all assessment folders
  await initializeK3LLStructureForContract(contractId);

  return {
    success: true,
    message: `Contract structure initialized for contract ${contractId}`
  };
}

/**
 * Generate PSB (Penilaian Sebelum Berjalan) folder
 * Created H+1 month after contract start date
 * @param contractId 
 */
export async function generatePSBFolder(contractId: string) {
  // Verify contract exists
  const contractData = await getContractById(contractId);
  
  if (!contractData) {
    throw new Error(`Contract with ID ${contractId} not found`);
  }
  
  // Check if PSB folder already exists for this contract
  const existingPSBFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, like }) => 
      and(
        eq(fields.contractId, contractId),
        like(fields.name, '% - PSB')
      ),
  });

  // If PSB folder already exists, return it
  if (existingPSBFolders.length > 0) {
    return {
      success: true,
      message: `PSB folder already exists: ${existingPSBFolders[0].name}`,
      folder: existingPSBFolders[0]
    };
  }
  
  // Calculate PSB date (H+1 month after start date)
  const startDate = new Date(contractData.startDate);
  const psbDate = new Date(startDate);
  psbDate.setMonth(psbDate.getMonth() + 1);
  
  // Validate PSB date is within contract period
  const endDate = new Date(contractData.endDate);
  if (psbDate < startDate || psbDate > endDate) {
    throw new Error("PSB date must be between contract start and end dates");
  }
  
  // Create the PSB folder
  const newFolder = await createSingleAssessmentFolder(
    contractId,
    psbDate,
    "PSB" as any // Type assertion since "PSB" is not in the original enum but will work
  );
  
  return {
    success: true,
    message: `PSB folder ${newFolder.name} generated`,
    folder: newFolder
  };
}

/**
 * Generate a single assessment folder for a contract
 * @param contractId 
 * @param assessmentType 'final' | 'ongoing'
 * @param assessmentDate ISO date string
 */
export async function generateSingleAssessmentFolder(
  contractId: string,
  assessmentType: 'final' | 'ongoing',
  assessmentDate: string
) {
  // Verify contract exists
  const contractData = await getContractById(contractId);
  
  if (!contractData) {
    throw new Error(`Contract with ID ${contractId} not found`);
  }
  
  // Validate date
  const date = new Date(assessmentDate);
  const startDate = new Date(contractData.startDate);
  const endDate = new Date(contractData.endDate);
  
  if (date < startDate || date > endDate) {
    throw new Error("Assessment date must be between contract start and end dates");
  }
  
  // Check if a folder already exists on this date
  const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const existingFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, like }) => 
      and(
        eq(fields.contractId, contractId),
        like(fields.name, `${formattedDate} - %`)
      ),
  });
  
  if (existingFolders.length > 0) {
    const existingTypes = existingFolders.map(f => {
      if (f.name.endsWith(' - PB')) return 'PB';
      if (f.name.endsWith(' - PA')) return 'PA';
      if (f.name.endsWith(' - PSB')) return 'PSB';
      return 'unknown';
    }).filter(t => t !== 'unknown');
    
    const requestedType = assessmentType === 'final' ? "PA" : "PB";
    if (existingTypes.includes(requestedType)) {
      throw new Error(`${requestedType} folder already exists for date ${formattedDate}`);
    }
  }
  
  // Determine folder type
  const folderType = assessmentType === 'final' ? "PA" : "PB";
  
  // Create the assessment folder
  const newFolder = await createSingleAssessmentFolder(
    contractId,
    date,
    folderType
  );
  
  // Update contract dates based on assessment type
  if (assessmentType === 'final') {
    // Update final assessment date
    await db.update(contract).set({
      finalAssessmentDate: assessmentDate,
      updatedAt: new Date(),
    }).where(eq(contract.id, contractId));
  } else {
    // For ongoing assessment, add to nearestOngoingAssessmentDate array
    let currentDates = Array.isArray(contractData.nearestOngoingAssessmentDate) 
      ? [...contractData.nearestOngoingAssessmentDate] 
      : [];
    
    // Add the new date if it's not already in the array
    if (!currentDates.some(d => new Date(d).getTime() === date.getTime())) {
      currentDates.push(assessmentDate);
      // Sort dates
      currentDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }
    
    await db.update(contract).set({
      nearestOngoingAssessmentDate: currentDates as any,
      updatedAt: new Date(),
    }).where(eq(contract.id, contractId));
  }
  
  // Initialize K3LL structure only for this new folder
  // The path for the new folder is just its ID, so we pass that as the parent path
  await createK3LLStructure(contractId, newFolder.id, newFolder.id);
  
  return {
    success: true,
    message: `Assessment folder ${newFolder.name} generated and contract updated`,
    folder: newFolder
  };
}
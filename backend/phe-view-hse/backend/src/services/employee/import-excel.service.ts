import XLSX from 'xlsx';
import { db } from '../../db/index.ts';
import { subContractors, vessels, locations } from '../../db/schema/auth.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { sql, eq } from 'drizzle-orm';
import { employeeStatus, employees, attendance } from '../../db/schema/employee.schema.ts';
import { createEmployeeService } from './create.service.ts';
import { createOrUpdateUserAccountForEmployee } from './create-user-account.service.ts';
import type { CreateFullEmployeeInput } from '../../schema/employee.schema.ts';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { parse, isValid, format as formatDate } from 'date-fns';

interface ImportResult {
  totalRows: number;
  insertedRows: number;
  errorRows: number;
  userAccountsCreated: number;
  userAccountsFailed: number;
  errors?: any[];
}

/**
 * Certificate input interface to match createEmployeeService expectations
 */
interface CertificateInput {
  name: string;
  expiredDate?: string;
  isPermanent?: boolean;
  status?: string;
}

/**
 * Create employee input interface that matches createEmployeeService expectations
 */
interface CreateEmployeeWithImageInput extends Omit<CreateFullEmployeeInput, 'image' | 'certificates'> {
  image?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
  certificates?: CertificateInput | CertificateInput[];
  files?: {
    contract?: any[];
    mcu?: any[];
    bpjs?: any[];
    vaccination?: any[];
    sika?: any[];
  };
}

/**
 * Helper to parse dates from Excel, specifically handling MM/DD/YYYY format
 */
function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  
  // If it's already a Date object
  if (value instanceof Date) {
    return isValid(value) ? formatDate(value, 'yyyy-MM-dd') : undefined;
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    const d = new Date(date.y, date.m - 1, date.d);
    return isValid(d) ? formatDate(d, 'yyyy-MM-dd') : undefined;
  }

  // If it's a string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Try MM/DD/YYYY first as requested
    const parsedMMDDYYYY = parse(trimmed, 'MM/dd/yyyy', new Date());
    if (isValid(parsedMMDDYYYY)) {
      return formatDate(parsedMMDDYYYY, 'yyyy-MM-dd');
    }

    // Fallback to standard Date parsing for other formats (YYYY-MM-DD etc)
    const fallbackDate = new Date(trimmed);
    if (isValid(fallbackDate)) {
      return formatDate(fallbackDate, 'yyyy-MM-dd');
    }
  }

  return undefined;
}

/**
 * Normalize company name for fuzzy matching
 * Removes extra spaces, dots, and normalizes case for comparison
 */
function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\.+/g, '') // Remove dots (PT. → PT)
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

/**
 * Calculate simple similarity score between two strings
 * Returns a score between 0 and 1
 */
function calculateSimpleSimilarity(str1: string, str2: string): number {
  const s1 = normalizeCompanyName(str1);
  const s2 = normalizeCompanyName(str2);
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Basic word overlap score
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(w => words2.includes(w)).length;
  return (commonWords * 2) / (words1.length + words2.length);
}

/**
 * Get subcontractor ID by name, create if not exists
 * Uses fuzzy matching to find the best match in database
 * @param name - Subcontractor name
 * @param category - Category (project | marine | mitra)
 * @returns subcontractor ID or null if not found/created
 */
async function getOrCreateSubcontractorIdByName(name: string, category?: string): Promise<string | null> {
  if (!name) return null;
  
  // const inputNormalized = normalizeCompanyName(name);
  
  // Get all subcontractors for fuzzy matching
  const allSubcontractors = await db
    .select({ 
      id: subContractors.id, 
      name: subContractors.name,
      category: subContractors.category
    })
    .from(subContractors);
  
  // Find best match using fuzzy matching
  let bestMatch: { id: string; name: string; category: string | null } | null = null;
  let bestScore = 0;
  
  for (const sc of allSubcontractors) {
    const score = calculateSimpleSimilarity(name, sc.name);
    
    // Require high similarity threshold (0.8) to consider it a match
    if (score > bestScore && score >= 0.8) {
      bestScore = score;
      bestMatch = sc;
    }
  }
  
  // If found a good match, return the database ID (using database's exact name format)
  if (bestMatch) {
    return bestMatch.id;
  }
  
  // Normalize category
  let normalizedCategory: string | undefined;
  if (category) {
    const cat = category.toLowerCase().trim();
    if (cat.includes('marine')) normalizedCategory = 'marine';
    else if (cat.includes('mitra')) normalizedCategory = 'mitra';
    else if (cat.includes('project')) normalizedCategory = 'project';
  }
  
  // Create new subcontractor if no match found (preserve original casing and format)
  try {
    const cleanedName = name.trim().replace(/\s+/g, ' ');
    const [newSubcontractor] = await db
      .insert(subContractors)
      .values({
        name: cleanedName,
        category: normalizedCategory,
      })
      .returning({ id: subContractors.id });
    
    return newSubcontractor?.id || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get project ID by name from subtypes table, create if not exists
 * Uses fuzzy matching to find the best match in database
 * @param name - Project name
 * @returns project ID or null if not found/created
 */
async function getOrCreateProjectIdByName(name: string): Promise<string | null> {
  if (!name) return null;
  
  // const inputNormalized = normalizeCompanyName(name);
  
  // Get all projects for fuzzy matching
  const allProjects = await db
    .select({ 
      id: subtypes.id, 
      name: subtypes.name 
    })
    .from(subtypes);
  
  // Find best match using fuzzy matching
  let bestMatch: { id: string; name: string } | null = null;
  let bestScore = 0;
  
  for (const project of allProjects) {
    const score = calculateSimpleSimilarity(name, project.name);
    
    // Require high similarity threshold (0.8) to consider it a match
    if (score > bestScore && score >= 0.8) {
      bestScore = score;
      bestMatch = project;
    }
  }
  
  // If found a good match, return the database ID (using database's exact name format)
  if (bestMatch) {
    return bestMatch.id;
  }
  
  // Create new project if no match found (preserve original casing and format)
  try {
    const cleanedName = name.trim().replace(/\s+/g, ' ');
    const [newProject] = await db
      .insert(subtypes)
      .values({
        name: cleanedName,
      })
      .returning({ id: subtypes.id });
    
    return newProject?.id || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get vessel ID by name
 * @param name - Vessel name
 * @returns vessel ID or null if not found
 */
async function getVesselIdByName(name: string): Promise<string | null> {
  if (!name) return null;
  
  // Standardize to uppercase for comparison
  const normalizedName = name.trim().toUpperCase();
  
  const [vessel] = await db
    .select({ id: vessels.id })
    .from(vessels)
    .where(sql`UPPER(${vessels.vesselName}) = ${normalizedName}`);
  
  return vessel?.id || null;
}

/**
 * Get location ID by name
 * @param name - Location name
 * @returns location ID or null if not found
 */
async function getLocationIdByName(name: string): Promise<string | null> {
  if (!name) return null;
  
  // Standardize to uppercase for comparison
  const normalizedName = name.trim().toUpperCase();
  
  const [location] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(sql`UPPER(${locations.name}) = ${normalizedName}`);
  
  return location?.id || null;
}

/**
 * Process Excel row to employee data
 * @param row - Excel row data
 * @returns Processed employee data
 */
async function processExcelRow(row: any): Promise<CreateEmployeeWithImageInput & { errors?: string[] }> {
  const errors: string[] = [];
  const result: any = {};
  
  // Mapping from Excel template headers to internal fields
  const fieldMapping: Record<string, string> = {
    'Company Name': 'subContractorName',
    'Category': 'category',
    'Employee Name': 'employeeName',
    'Tanggal Lahir': 'dateOfBirth',
    'Positions': 'position',
    'Nama Project': 'projectName',
    'Nama Vessel/Lokasi': 'vesselOrLocation', // Can be either vessel name or location name
    'ID KTP Employee': 'identityNumber',
    'HSSE e-Passport Number': 'hssePassportNumber',
    'Status On/Off Duty': 'statusOnDuty',
    'Status Kelaikan Bekerja': 'statusKelaikanBekerja',
    'Skor Kardiovaskuler Jakarta (SKJ)': 'skjScore',
    'Other Health Assurance': 'otherHealthAssurance',
    'Alat Pelindung Diri': 'ppe',
    'Verified By': 'verifiedBy',
    'Verified Date': 'verifiedDate',
    'Remarks': 'remarks',
    'Link Data Employee': 'linkDataEmployee'
  };

  // Map fields - try exact match first
  for (const [excelHeader, internalField] of Object.entries(fieldMapping)) {
    if (row[excelHeader] !== undefined) {
      result[internalField] = row[excelHeader];
    }
  }
  
  // Try fuzzy matching for headers with extra whitespace or different casing
  const rowKeys = Object.keys(row);
  for (const [excelHeader, internalField] of Object.entries(fieldMapping)) {
    if (result[internalField] !== undefined) continue; // Already found
    
    // Find matching key in row (case-insensitive, trim whitespace)
    const normalizedHeader = excelHeader.toLowerCase().trim();
    const matchingKey = rowKeys.find(key => 
      key.toLowerCase().trim() === normalizedHeader
    );
    if (matchingKey !== undefined) {
      result[internalField] = row[matchingKey];
    }
  }

  // Handle case where original field names are used
  const originalFields = ['employeeName', 'category', 'subContractorName', 'identityNumber', 'position', 'hssePassportNumber', 'dateOfBirth', 'projectName', 'vesselOrLocation', 'ppe', 'verifiedBy', 'verifiedDate'];
  for (const field of originalFields) {
    if (row[field] !== undefined && result[field] === undefined) {
      result[field] = row[field];
    }
  }
  
  // Required fields check (using mapped names)
  const requiredFields = ['employeeName', 'category', 'subContractorName', 'dateOfBirth', 'hssePassportNumber'];
  const fieldLabels: Record<string, string> = {
    'employeeName': 'Nama Pekerja',
    'category': 'Kategori',
    'subContractorName': 'Nama Perusahaan',
    'dateOfBirth': 'Tanggal Lahir',
    'hssePassportNumber': 'Nomor HSSE Passport'
  };
  
  for (const field of requiredFields) {
    if (!result[field] || !result[field].toString().trim()) {
      const fieldLabel = fieldLabels[field] || field;
      errors.push(`Data ${fieldLabel} tidak boleh kosong`);
    }
  }
  
  // Normalize category
  if (result.category) {
    const cat = result.category.toString().toLowerCase().trim();
    if (cat.includes('marine')) result.category = 'marine';
    else if (cat.includes('mitra')) result.category = 'mitra';
    else if (cat.includes('project')) result.category = 'project';
    else {
      // Default or error? The schema is strict.
      if (!['marine', 'mitra', 'project'].includes(cat)) {
        errors.push(`Kategori tidak valid: ${result.category}. Harus marine, mitra, atau project.`);
      }
    }
  }

  // Get or create subcontractor ID from name (pass category for new subcontractor)
  let subContractorId = null;
  if (result.subContractorName) {
    subContractorId = await getOrCreateSubcontractorIdByName(
      result.subContractorName.toString().trim(),
      result.category
    );
    if (!subContractorId) {
      errors.push(`Gagal membuat atau menemukan subkontraktor: ${result.subContractorName}`);
    }
  }
  
  // Get or create project ID from project name
  let projectId = null;
  if (result.projectName) {
    projectId = await getOrCreateProjectIdByName(result.projectName.toString().trim());
    if (!projectId) {
      errors.push(`Gagal membuat atau menemukan proyek: ${result.projectName}`);
    }
  }
  
  // Get vessel or location ID from name
  let vesselId = null;
  let locationId = null;
  if (result.vesselOrLocation) {
    const vesselOrLocationName = result.vesselOrLocation.toString().trim();
    // Try vessel first
    vesselId = await getVesselIdByName(vesselOrLocationName);
    // If not found in vessels, try locations
    if (!vesselId) {
      locationId = await getLocationIdByName(vesselOrLocationName);
      if (!locationId) {
        errors.push(`Kapal atau lokasi tidak ditemukan: ${result.vesselOrLocation}`);
      }
    }
  }
  
  // Process basic employee fields
  result.employeeName = result.employeeName?.toString().trim() || '';
  result.subContractorId = subContractorId;
  result.projectId = projectId;
  result.vesselId = vesselId;
  // Remove temporary field and set location appropriately
  delete result.vesselOrLocation;
  if (!vesselId && !locationId) {
    result.location = undefined;
  }
  // For nullable fields, use undefined instead of empty string to allow NULL in database
  result.identityNumber = result.identityNumber?.toString().trim() || undefined;
  result.position = result.position?.toString().trim() || undefined;
  result.hssePassportNumber = result.hssePassportNumber?.toString().trim() || undefined;
  result.statusOnDuty = result.statusOnDuty === 'ON' || result.statusOnDuty === 'ON Duty' || result.statusOnDuty === true || result.statusOnDuty === 1;
  
  // Clean up text fields that might contain newlines or extra whitespace
  if (result.ppe) {
    result.ppe = result.ppe.toString().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (result.remarks) {
    result.remarks = result.remarks.toString().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (result.verifiedBy) {
    result.verifiedBy = result.verifiedBy.toString().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Process dates
  const dateFields = ['dateOfBirth', 'verifiedDate'];
  for (const field of dateFields) {
    if (result[field]) {
      const parsedDate = parseExcelDate(result[field]);
      if (parsedDate) {
        result[field] = parsedDate;
      } else {
        errors.push(`Format tanggal tidak valid untuk ${field}: ${result[field]}`);
      }
    }
  }
  
  // Process Relational Data from Template
  // Contract
  if (row['Employee Contract Data'] || row['Contract Expired Date Employee'] || row['Contract Expired Date Company']) {
    result.contract = {
      contractCode: row['Employee Contract Data']?.toString(),
      expiredDate: parseExcelDate(row['Contract Expired Date Employee']),
      expiredDateCompany: parseExcelDate(row['Contract Expired Date Company'])
    };
  }

  // MCU - includes Derajat Kesehatan Pekerja in ohihReview and Status/SKJ/Health Assurance
  const derajatKesehatan = row['Derajat Kesehatan Pekerja\n*P1-P7'] || row['Derajat Kesehatan Pekerja'] || row['Derajat Kesehatan Pekerja *P1-P7'];
  if (row['MCU Expired Date'] || row['MCU Hospital Name'] || row['MCU Deviation Notes'] || row['MCU Follow Up'] || row['OHIH Review'] || derajatKesehatan || row['Status Kelaikan Bekerja'] || row['Skor Kardiovaskuler Jakarta (SKJ)'] || row['Other Health Assurance']) {
    result.mcu = {
      mcuExpiredDate: parseExcelDate(row['MCU Expired Date']),
      mcuHospitalName: row['MCU Hospital Name']?.toString(),
      mcuDeviationNotes: row['MCU Deviation Notes']?.toString(),
      mcuFollowUp: row['MCU Follow Up']?.toString(),
      ohihReview: derajatKesehatan?.toString() || row['OHIH Review']?.toString(),
      statusKelaikanBekerja: row['Status Kelaikan Bekerja']?.toString(),
      skjScore: row['Skor Kardiovaskuler Jakarta (SKJ)']?.toString(),
      otherHealthAssurance: row['Other Health Assurance']?.toString()
    };
  }

  // BPJS
  if (row['BPJS Employment'] || row['BPJS Health']) {
    result.bpjs = {
      bpjsEmployment: row['BPJS Employment']?.toString(),
      bpjsHealth: row['BPJS Health']?.toString()
    };
  }

  // Vaccination
  if (row['Vaccine Date'] || row['Vaccine Status']) {
    result.vaccination = {
      vaccineDate: parseExcelDate(row['Vaccine Date']),
      vaccineStatus: row['Vaccine Status']?.toString()
    };
  }

  // SIKA
  if (row['SIKA Expired Date'] || row['Jabatan SIKA']) {
    result.sika = {
      type: row['Jabatan SIKA']?.toString(),
      expiredDate: parseExcelDate(row['SIKA Expired Date']),
      status: 'Active' // Default if date is present
    };
  }

  // Certificates (Array)
  const certificates: CertificateInput[] = [];
  const certificateCols = [
    'Rigger Expired Date',
    'Fitter Expired Date',
    'Scaffolder Expired Date',
    'HSE Expired Date',
    'Welder Expired Date',
    'First Aider Expired Date',
    'Fire Fighting Expired Date',
    'CSE Expired Date',
    'WAH Expired Date',
    'BSS Expired Date',
    'BST Expired Date',
    'BOSIET Expired Date'
  ];

  for (const col of certificateCols) {
    if (row[col]) {
      const parsedDate = parseExcelDate(row[col]);
      if (parsedDate) {
        const name = col.replace(' Expired Date', '');
        certificates.push({
          name: name,
          expiredDate: parsedDate,
          status: 'Still Valid' // Default
        });
      }
    }
  }

  if (row['Other Certificate']) {
    certificates.push({
      name: row['Other Certificate'].toString(),
      status: 'Still Valid'
    });
  }

  // Original certificates logic (if present as JSON or array)
  if (row.certificates) {
    try {
      let certsArray: any[] = [];
      if (typeof row.certificates === 'string') {
        try { certsArray = JSON.parse(row.certificates); } catch { certsArray = [{ name: row.certificates }]; }
      } else if (Array.isArray(row.certificates)) {
        certsArray = row.certificates;
      } else {
        certsArray = [row.certificates];
      }
      
      for (const cert of certsArray) {
        if (cert.name) {
          certificates.push({
            name: cert.name.toString().trim(),
            expiredDate: parseExcelDate(cert.expiredDate),
            isPermanent: cert.isPermanent === true || cert.isPermanent === 'true' || cert.isPermanent === 1 || cert.isPermanent === 'yes' || cert.isPermanent === 'permanent',
            status: cert.status?.toString().trim()
          });
        }
      }
    } catch (e: any) {
      errors.push(`Gagal memproses sertifikat: ${e.message || e}`);
    }
  }

  if (certificates.length > 0) {
    result.certificates = certificates;
  }

  return {
    ...result,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Import employees from Excel file
 * @param parts - Multipart form data parts
 * @param t - Translation function
 * @returns Import result
 */
export async function importEmployeesFromExcelService(
  parts: AsyncIterableIterator<any>,
  t: (key: string) => string
): Promise<ImportResult> {
  let excelBuffer: Buffer | null = null;
  let fileName = 'import.xlsx';
  
  // Process multipart data
  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'file') {
      excelBuffer = await part.toBuffer();
      fileName = part.filename || fileName;
      break;
    }
  }
  
  if (!excelBuffer) {
    throw new Error('No Excel file provided');
  }
  
  // Save buffer to temporary file
  const tempFilePath = path.join(os.tmpdir(), `employee-import-${Date.now()}-${fileName}`);
  try {
    await fs.writeFile(tempFilePath, excelBuffer);
    
    // Read Excel file
    const workbook = XLSX.readFile(tempFilePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Use first sheet
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const result: ImportResult = {
      totalRows: jsonData.length,
      insertedRows: 0,
      errorRows: 0,
      userAccountsCreated: 0,
      userAccountsFailed: 0,
      errors: []
    };
    
    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        const processedData = await processExcelRow(row);
        
        if (processedData.errors && processedData.errors.length > 0) {
          result.errorRows++;
          result.errors?.push({
            row: i + 1,
            errors: processedData.errors,
            data: row
          });
          continue;
        }
        
        // Remove errors property before creating employee
        const { errors, ...employeeData } = processedData;
        
        // Create employee
        const createdEmployee = await createEmployeeService(employeeData);
        result.insertedRows++;

        // === Create employeeStatus record if statusOnDuty is true
        if (employeeData.statusOnDuty === true && createdEmployee.detail?.employee?.id) {
          const now = new Date();
          const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

          await db.insert(employeeStatus).values({
            employeeId: createdEmployee.detail.employee.id,
            isOnDuty: true,
            lastCheckIn: now,
            currentCycleStartDate: today,
            updatedAt: now,
          });

          // Create attendance record for ON DUTY
          await db.insert(attendance).values({
            employeeId: createdEmployee.detail.employee.id,
            attendanceDate: today,
            statusAfter: 'on_duty',
            photoEvidence: null,
            notes: 'Status awal pada saat pembuatan data karyawan',
            position: null,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Create user account if hssePassportNumber exists
        if (employeeData.hssePassportNumber) {
          const userAccountResult = await createOrUpdateUserAccountForEmployee({
            hssePassportNumber: employeeData.hssePassportNumber,
            employeeName: employeeData.employeeName,
            dateOfBirth: employeeData.dateOfBirth,
            image: createdEmployee.detail?.employee?.imageUrl || null,
          });

          if (userAccountResult.success) {
            result.userAccountsCreated++;
          } else {
            result.userAccountsFailed++;
          }
        }
      } catch (error: any) {
        result.errorRows++;
        
        // Parse error message
        let errorMessage = error.message || 'Unknown error';
        const rowData = row as any;
        
        // Get error details from cause (Drizzle wraps Postgres errors)
        const cause = error.cause || {};
        const errorDetail = cause.detail || error.detail || '';
        const errorCode = cause.code || error.code;
        
        // Check for duplicate HSSE passport number
        if (errorCode === '23505') {
          if (errorDetail.includes('hsse_passport_number')) {
            const hsseNumber = rowData['HSSE e-Passport Number'] || rowData['hssePassportNumber'] || 'N/A';
            
            // Query existing employee with this HSSE passport number
            try {
              const [existingEmployee] = await db
                .select({
                  id: employees.id,
                  employeeName: employees.employeeName,
                  position: employees.position,
                  hssePassportNumber: employees.hssePassportNumber
                })
                .from(employees)
                .where(eq(employees.hssePassportNumber, hsseNumber))
                .limit(1);
              
              if (existingEmployee) {
                // Skip duplicate - log and continue
                result.errorRows++; // Still count as error row for reporting
                result.errors?.push({
                  row: i + 1,
                  errors: [`Nomor HSSE Passport ${hsseNumber} sudah digunakan oleh "${existingEmployee.employeeName}" (Jabatan: ${existingEmployee.position || 'N/A'}) - dilewati`],
                  data: row,
                  skipped: true
                });
                continue; // Skip to next row
              } else {
                errorMessage = `Nomor HSSE Passport ${hsseNumber} sudah ada di database`;
              }
            } catch (queryError) {
              // If query fails, use basic message
              errorMessage = `Nomor HSSE Passport ${hsseNumber} sudah ada di database`;
            }
          }
          // Check for duplicate identity number
          else if (errorDetail.includes('identity_number')) {
            const idNumber = rowData['ID KTP Employee'] || rowData['identityNumber'] || 'N/A';
            errorMessage = `Nomor KTP ${idNumber} sudah ada di database`;
          } else {
            errorMessage = `Nilai duplikat: ${errorDetail}`;
          }
        }
        // Check for date format errors
        else if (errorCode === '22008') {
          const causeMessage = cause.message || '';
          const match = causeMessage.match(/"([^"]+)"/);
          const invalidDate = match ? match[1] : '';
          errorMessage = `Format tanggal tidak valid: ${invalidDate}. Format yang diharapkan: YYYY-MM-DD atau MM/DD/YYYY`;
        }
        // Check for foreign key constraint errors
        else if (errorCode === '23503') {
          errorMessage = `Pelanggaran foreign key - data referensi tidak ditemukan`;
        }
        // Check for not null constraint
        else if (errorCode === '23502') {
          const match = errorDetail.match(/column "([^"]+)"/);
          const columnName = match ? match[1] : 'unknown';
          errorMessage = `Field wajib tidak boleh kosong: ${columnName}`;
        }
        
        result.errors?.push({
          row: i + 1,
          errors: [errorMessage],
          data: row
        });
      }
    }
    
    return result;
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}


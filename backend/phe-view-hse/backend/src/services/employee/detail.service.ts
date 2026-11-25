import { db } from '../../db/index.ts';
import {
  employees,
  contracts,
  mcus,
  bpjs,
  vaccinations,
  certificates,
  sika,
  employeeFiles,
} from '../../db/schema/employee.schema.ts';
import { subContractors, vessels } from '../../db/schema/auth.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { eq, lt, gt, desc, asc, and, ne, inArray } from 'drizzle-orm';
import { isNotNull } from 'drizzle-orm/sql';
import env from '../../config/env.config.ts';
import type { ListEmployeeParams } from '../../types/employee.ts';

export async function getEmployeeDetailService(
  employeeId: string,
  options?: {
    withNavigation?: boolean;
    filters?: Partial<ListEmployeeParams>;
  }
) {
  const { withNavigation = false, filters = {} } = options ?? {};

  const [result] = await db
    .select({
      employee: employees,
      contractorName: subContractors.name,
      vesselName: vessels.vesselName,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .leftJoin(vessels, eq(employees.vesselId, vessels.id))
    .where(eq(employees.id, employeeId));

  if (!result) throw new Error('Employee not found');

  const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsEmployeesDir}`;
  const { employee } = result;
  const imageUrl = employee.image ? `${BASE_URL}/${employeeId}/${employee.image}` : '';

  // Determine project name based on projectId or projectName field
  let projectName = '';
  if (employee.projectId) {
    // If projectId exists, get name from subtypes table
    const [project] = await db
      .select({ name: subtypes.name })
      .from(subtypes)
      .where(eq(subtypes.id, employee.projectId));
    projectName = project?.name ?? '';
  } else {
    // If projectId is empty, use the manually filled projectName
    projectName = employee.projectName ?? '';
  }

  const employeeData = {
    ...employee,
    subContractorName: result.contractorName,
    projectName,
    vesselName: result.vesselName ?? '',
    imageUrl,
  };

  const [
    contractData,
    mcuData,
    bpjsData,
    vaccinationData,
    certificateDataRaw,
    sikaData,
    fileData,
  ] = await Promise.all([
    db.select().from(contracts).where(eq(contracts.employeeId, employeeId)),
    db.select().from(mcus).where(eq(mcus.employeeId, employeeId)),
    db.select().from(bpjs).where(eq(bpjs.employeeId, employeeId)),
    db.select().from(vaccinations).where(eq(vaccinations.employeeId, employeeId)),
    db.select().from(certificates).where(eq(certificates.employeeId, employeeId)),
    db.select().from(sika).where(eq(sika.employeeId, employeeId)),
    db.select().from(employeeFiles).where(eq(employeeFiles.employeeId, employeeId)),
  ]);

  const response = {
    employee: employeeData,
    contracts: contractData,
    mcus: mcuData,
    bpjs: bpjsData,
    vaccinations: vaccinationData,
    certificates: certificateDataRaw.map((cert) => ({
      ...cert,
      aliases: (() => {
        const name = cert.name?.toUpperCase() ?? '';
        
        const aliasList: { keywords: string[]; alias: string }[] = [
          { keywords: ['BST', 'BASIC SAFETY TRAINING'], alias: 'BST' },
          { keywords: ['BSS', 'BASIC SEA SURVIVAL'], alias: 'BSS' },
        ];
        
        for (const item of aliasList) {
          if (item.keywords.some(kw => name.includes(kw))) {
            return item.alias;
          }
        }
        
        return null;
      })(),
    })),
    sika: sikaData,
    files: fileData.map((file) => ({
      ...file,
      url: `${BASE_URL}/${employeeId}/${file.filePath}`,
      thumbnailUrl: file.fileType?.startsWith('image/')
        ? `${BASE_URL}/${employeeId}/thumbnail/${file.filePath}`
        : '',
    })),
  };

  // ✅ Navigasi berdasarkan abjad employeeName
  if (withNavigation && employee.employeeName) {
    const baseConditions = [
      ne(employees.id, employeeId),
    ];

    // Tambahkan filter dari list asal
    if (filters.subContractorId?.length) {
      baseConditions.push(inArray(employees.subContractorId, filters.subContractorId));
    }
    if (filters.category?.length) {
      baseConditions.push(inArray(employees.category, filters.category));
    }
    if (filters.position?.length) {
      baseConditions.push(inArray(employees.position, filters.position));
    }
    if (filters.statusOnDuty?.length) {
      baseConditions.push(inArray(employees.statusOnDuty, filters.statusOnDuty));
    }
    if (filters.vesselId?.length) {
      baseConditions.push(inArray(employees.vesselId, filters.vesselId));
    }
    if (filters.projectId?.length) {
      baseConditions.push(inArray(employees.projectId, filters.projectId));
    }
    if (filters.onlyVerified) {
      baseConditions.push(isNotNull(employees.verifiedBy));
    }

    // Previous berdasarkan abjad
    const [prev] = await db
      .select({
        id: employees.id,
        employeeName: employees.employeeName,
        category: employees.category,
      })
      .from(employees)
      .where(and(
        ...baseConditions,
        lt(employees.employeeName, employee.employeeName)
      ))
      .orderBy(desc(employees.employeeName))
      .limit(1);

    // Next berdasarkan abjad
    const [next] = await db
      .select({
        id: employees.id,
        employeeName: employees.employeeName,
        category: employees.category,
      })
      .from(employees)
      .where(and(
        ...baseConditions,
        gt(employees.employeeName, employee.employeeName)
      ))
      .orderBy(asc(employees.employeeName))
      .limit(1);

    return {
      ...response,
      navigation: {
        previous: prev ?? null,
        next: next ?? null,
      },
    };
  }

  return response;
}

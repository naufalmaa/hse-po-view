import { db } from '../../db/index.ts';
import { employees } from '../../db/schema/employee.schema.ts';
import { logManhours } from '../../db/schema/log-manhours.schema.ts';
import { contractorVessels } from '../../db/schema/auth.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { eq, or, inArray, sql } from 'drizzle-orm';
import Holidays from 'date-holidays';

/**
 * Format date to YYYY-MM-DD for log_date
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if the date is a working day in Indonesia (excluding weekends and public holidays)
 */
export function isIndonesiaWorkingDay(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) {
    return false;
  }

  const hd = new Holidays('ID');
  const holidaysList = hd.isHoliday(date);
  if (holidaysList) {
    const hasPublicHoliday = holidaysList.some((h) => h.type === 'public');
    if (hasPublicHoliday) {
      return false;
    }
  }

  return true;
}

/**
 * Get all on-duty employees
 */
async function getOnDutyEmployees() {
  return await db
    .select({
      id: employees.id,
      vesselId: employees.vesselId,
      projectId: employees.projectId,
      subContractorId: employees.subContractorId,
      category: employees.category,
    })
    .from(employees)
    .where(eq(employees.statusOnDuty, true));
}

/**
 * Get contractor ID for a vessel from contractor_vessels table
 */
async function getContractorIdForVessel(vesselId: string): Promise<string | null> {
  const contractorVessel = await db
    .select({ contractorId: contractorVessels.contractorId })
    .from(contractorVessels)
    .where(eq(contractorVessels.vesselId, vesselId))
    .limit(1);

  return contractorVessel.length > 0 ? contractorVessel[0].contractorId : null;
}

/**
 * Group employees by vessel or project
 */
function groupEmployees(onDutyEmployees: Awaited<ReturnType<typeof getOnDutyEmployees>>) {
  const vesselGroups = new Map<string, typeof onDutyEmployees>();
  const projectGroups = new Map<string, typeof onDutyEmployees>();

  for (const emp of onDutyEmployees) {
    if (emp.vesselId) {
      const key = emp.vesselId;
      if (!vesselGroups.has(key)) {
        vesselGroups.set(key, []);
      }
      vesselGroups.get(key)!.push(emp);
    }
    if (emp.projectId) {
      const key = emp.projectId;
      if (!projectGroups.has(key)) {
        projectGroups.set(key, []);
      }
      projectGroups.get(key)!.push(emp);
    }
  }

  return { vesselGroups, projectGroups };
}

/**
 * Build log manhours records for vessels
 */
async function buildVesselRecords(
  vesselGroups: Map<string, any[]>,
  today: string
): Promise<typeof logManhours.$inferInsert[]> {
  const records: typeof logManhours.$inferInsert[] = [];

  for (const [vesselId, employees] of vesselGroups) {
    const contractorId = await getContractorIdForVessel(vesselId);

    records.push({
      logDate: today,
      contractorId,
      projectId: null,
      vesselId,
      pobContractor: employees.length,
      pobPheOses: 0,
      isLegacy: false,
    });
  }

  return records;
}

/**
 * Build log manhours records for projects
 */
async function buildProjectRecords(
  projectGroups: Map<string, any[]>,
  today: string
): Promise<typeof logManhours.$inferInsert[]> {
  const records: typeof logManhours.$inferInsert[] = [];
  const projectIds = Array.from(projectGroups.keys());
  if (projectIds.length === 0) return records;

  const projectSubtypes = await db
    .select({
      id: subtypes.id,
      extra: subtypes.extra,
    })
    .from(subtypes)
    .where(inArray(subtypes.id, projectIds));

  const disabledProjects = new Set(
    projectSubtypes
      .filter((s) => {
        const extra = s.extra as any;
        return extra?.autoCalculateManhours === false || extra?.autoCalculateManhours === 'false';
      })
      .map((s) => s.id)
  );

  for (const [projectId, employees] of projectGroups) {
    if (disabledProjects.has(projectId)) {
      continue;
    }

    const pobPheOses = employees.filter((emp) => emp.category === 'mitra').length;
    const pobContractor = employees.filter((emp) => emp.category === 'project').length;

    records.push({
      logDate: today,
      contractorId: null,
      projectId,
      vesselId: null,
      pobContractor,
      pobPheOses,
      isLegacy: false,
    });
  }

  return records;
}

/**
 * Check if log manhours for a specific date already exists
 */
export async function hasLogManhoursForDate(date: string): Promise<boolean> {
  const rows = await db
    .select({ id: logManhours.id })
    .from(logManhours)
    .where(eq(logManhours.logDate, date))
    .limit(1);

  return rows.length > 0;
}

/**
 * Main service function to collect and save log manhours data
 */
export async function collectAndSaveLogManhours(targetDate: Date = new Date()): Promise<void> {
  const today = formatDate(targetDate);

  const onDutyEmployees = await getOnDutyEmployees();

  // Group employees by vessel or project
  const { vesselGroups, projectGroups } = groupEmployees(onDutyEmployees);

  // Build records
  const vesselRecords = await buildVesselRecords(vesselGroups, today);
  const projectRecords = await buildProjectRecords(projectGroups, today);

  // Auto-insert office team manhours if it is an Indonesian working day
  if (isIndonesiaWorkingDay(targetDate)) {
    const projectName = 'Production Operation Office Team';
    const officeProjectId = '207f16d1-cbfa-43a1-bc3f-c7cbea400755';

    const existingSubtype = await db
      .select({ id: subtypes.id, extra: subtypes.extra })
      .from(subtypes)
      .where(or(eq(subtypes.id, officeProjectId), eq(subtypes.name, projectName)))
      .limit(1);

    let effectiveOfficeProjectId = officeProjectId;
    let officeAutoCalc = true;

    if (existingSubtype.length === 0) {
      await db
        .insert(subtypes)
        .values({
          id: officeProjectId,
          name: projectName,
          extra: {
            hoursPobPheOses: 8,
            hoursPobContractor: 0,
            target: 0,
            autoCalculateManhours: true,
          },
        })
        .onConflictDoNothing();
    } else {
      effectiveOfficeProjectId = existingSubtype[0].id;
      const extra = existingSubtype[0].extra as any;
      if (extra?.autoCalculateManhours === false || extra?.autoCalculateManhours === 'false') {
        officeAutoCalc = false;
      }
    }

    const alreadyHasOfficeProject = projectRecords.some(
      (r) => r.projectId === effectiveOfficeProjectId
    );

    if (officeAutoCalc && !alreadyHasOfficeProject) {
      projectRecords.push({
        logDate: today,
        contractorId: null,
        projectId: effectiveOfficeProjectId,
        vesselId: null,
        pobContractor: 0,
        pobPheOses: 30,
        isLegacy: false,
      });
    }
  }

  // Upsert vessel records
  for (const record of vesselRecords) {
    await db.execute(sql`
      INSERT INTO log_manhours (log_date, contractor_id, project_id, vessel_id, pob_phe_oses, pob_contractor, is_legacy)
      VALUES (${record.logDate}, ${record.contractorId}, NULL, ${record.vesselId}, 0, ${record.pobContractor}, false)
      ON CONFLICT (log_date, vessel_id) WHERE is_legacy = false
      DO UPDATE SET 
        contractor_id = EXCLUDED.contractor_id,
        pob_contractor = EXCLUDED.pob_contractor,
        updated_at = NOW()
    `);
  }

  // Upsert project records
  for (const record of projectRecords) {
    await db.execute(sql`
      INSERT INTO log_manhours (log_date, contractor_id, project_id, vessel_id, pob_phe_oses, pob_contractor, is_legacy)
      VALUES (${record.logDate}, NULL, ${record.projectId}, NULL, ${record.pobPheOses}, ${record.pobContractor}, false)
      ON CONFLICT (log_date, project_id) WHERE is_legacy = false
      DO UPDATE SET 
        pob_phe_oses = EXCLUDED.pob_phe_oses,
        pob_contractor = EXCLUDED.pob_contractor,
        updated_at = NOW()
    `);
  }

}

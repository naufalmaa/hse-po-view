import { db } from '../../db/index.ts';
import { employees, attendance } from '../../db/schema/employee.schema.ts';
import { logManhours } from '../../db/schema/log-manhours.schema.ts';
import { contractorVessels, subContractors } from '../../db/schema/auth.schema.ts';
import { workLocations, subtypes } from '../../db/schema/report.schema.ts';
import { eq, and, lte, desc, sql } from 'drizzle-orm';

/**
 * Recalculate and update pobContractor and pobPheOses count for a specific date
 * This should be called whenever an employee's on-duty status or attendance changes
 */
export async function recalculateLogManhoursForDate(logDate: string): Promise<void> {
  // Check projects with autoCalculateManhours = false
  const allSubtypes = await db
    .select({
      id: subtypes.id,
      extra: subtypes.extra,
    })
    .from(subtypes);

  const disabledProjects = new Set(
    allSubtypes
      .filter((s) => {
        const extra = s.extra as any;
        return extra?.autoCalculateManhours === false || extra?.autoCalculateManhours === 'false';
      })
      .map((s) => s.id)
  );

  // Load all work locations to enable name-based matching for employees with legacy location string
  const allWorkLocations = await db
    .select({
      id: workLocations.id,
      name: workLocations.name,
      projectId: workLocations.projectId,
    })
    .from(workLocations);

  const projectWorkLocNameMap = new Map<string, string>();
  for (const wl of allWorkLocations) {
    if (wl.name && wl.projectId) {
      projectWorkLocNameMap.set(`${wl.projectId}:::${wl.name.trim().toLowerCase()}`, wl.id);
    }
  }

  // Get all employees (including historical)
  const allEmployees = await db
    .select({
      id: employees.id,
      vesselId: employees.vesselId,
      projectId: employees.projectId,
      subContractorId: employees.subContractorId,
      subContractorName: subContractors.name,
      category: employees.category,
      location: employees.location,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id));

  // Query latest attendance on or before logDate to find each employee's status and workLocationId
  const attendanceRecords = await db
    .select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      workLocationId: attendance.workLocationId,
      statusAfter: attendance.statusAfter,
    })
    .from(attendance)
    .where(lte(attendance.attendanceDate, logDate))
    .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt));

  const empLatestAttMap = new Map<string, { workLocationId: string | null; statusAfter: string; id: string }>();
  for (const att of attendanceRecords) {
    if (!empLatestAttMap.has(att.employeeId)) {
      empLatestAttMap.set(att.employeeId, {
        workLocationId: att.workLocationId ?? null,
        statusAfter: att.statusAfter,
        id: att.id,
      });
    }
  }

  // Group by vessel
  const vesselGroups = new Map<string, number>();
  // Group by project and work location: key = `${projectId}:::${workLocationId || 'null'}`
  const projectGroups = new Map<
    string,
    { projectId: string; workLocationId: string | null; pobPheOses: number; pobContractor: number }
  >();

  const PHE_OSES_ID = '4861d25a-2c31-417e-bb55-277251606f8d';

  for (const emp of allEmployees) {
    const latestAtt = empLatestAttMap.get(emp.id);
    // Employee must have latest attendance record with status 'on_duty' on or before logDate
    if (!latestAtt || latestAtt.statusAfter !== 'on_duty') {
      continue;
    }

    if (emp.vesselId) {
      vesselGroups.set(emp.vesselId, (vesselGroups.get(emp.vesselId) || 0) + 1);
    }

    if (emp.projectId || (emp.category || '').toLowerCase().trim() === 'mitra') {
      let locId = latestAtt.workLocationId || null;

      // Fallback: If no workLocationId on attendance, check employee's location string ("Lokasi Barge")
      if (!locId && emp.location && emp.projectId) {
        const fallbackId = projectWorkLocNameMap.get(`${emp.projectId}:::${emp.location.trim().toLowerCase()}`);
        if (fallbackId) {
          locId = fallbackId;

          // Backfill latest attendance record so it's consistent
          if (latestAtt.id) {
            await db
              .update(attendance)
              .set({ workLocationId: fallbackId })
              .where(eq(attendance.id, latestAtt.id));
          }
        }
      }

      // If mitra has no explicit projectId, check if locId resolves to a projectId
      let effectiveProjectId = emp.projectId;
      if (!effectiveProjectId && locId) {
        const matchingWl = allWorkLocations.find((w) => w.id === locId);
        if (matchingWl) {
          effectiveProjectId = matchingWl.projectId;
        }
      }

      if (!effectiveProjectId || disabledProjects.has(effectiveProjectId)) {
        continue;
      }

      const key = `${effectiveProjectId}:::${locId || 'null'}`;
      const current = projectGroups.get(key) || {
        projectId: effectiveProjectId,
        workLocationId: locId,
        pobPheOses: 0,
        pobContractor: 0,
      };

      const cat = emp.category ? emp.category.toLowerCase().trim() : '';
      const comp = (emp.subContractorName || '').toLowerCase().trim();
      const isPhe = cat === 'mitra' || emp.subContractorId === PHE_OSES_ID || comp.includes('phe');

      if (isPhe) {
        current.pobPheOses += 1;
      } else {
        current.pobContractor += 1;
      }
      projectGroups.set(key, current);
    }
  }

  // Update vessel-based records
  for (const [vesselId, count] of vesselGroups) {
    const contractorVessel = await db
      .select({ contractorId: contractorVessels.contractorId })
      .from(contractorVessels)
      .where(eq(contractorVessels.vesselId, vesselId))
      .limit(1);

    const contractorId = contractorVessel.length > 0 ? contractorVessel[0].contractorId : null;

    await db.execute(sql`
      INSERT INTO log_manhours (log_date, contractor_id, project_id, vessel_id, pob_phe_oses, pob_contractor, is_legacy)
      VALUES (${logDate}, ${contractorId}, NULL, ${vesselId}, 0, ${count}, false)
      ON CONFLICT (log_date, vessel_id) WHERE is_legacy = false
      DO UPDATE SET 
        contractor_id = EXCLUDED.contractor_id,
        pob_contractor = EXCLUDED.pob_contractor,
        updated_at = NOW()
    `);
  }

  // Reset any existing non-legacy project records for this date that now have 0 employees (skip disabled projects)
  const existingProjectLogs = await db
    .select({
      id: logManhours.id,
      projectId: logManhours.projectId,
      workLocationId: logManhours.workLocationId,
    })
    .from(logManhours)
    .where(
      and(
        eq(logManhours.logDate, logDate),
        eq(logManhours.isLegacy, false),
        sql`${logManhours.projectId} IS NOT NULL`
      )
    );

  for (const log of existingProjectLogs) {
    if (log.projectId && disabledProjects.has(log.projectId)) {
      continue;
    }
    const key = `${log.projectId}:::${log.workLocationId || 'null'}`;
    if (!projectGroups.has(key)) {
      await db
        .update(logManhours)
        .set({ pobPheOses: 0, pobContractor: 0, updatedAt: new Date() })
        .where(eq(logManhours.id, log.id));
    }
  }

  // Update project-based records
  for (const [, counts] of projectGroups) {
    if (counts.workLocationId) {
      await db.execute(sql`
        INSERT INTO log_manhours (log_date, contractor_id, project_id, work_location_id, vessel_id, pob_phe_oses, pob_contractor, is_legacy)
        VALUES (${logDate}, NULL, ${counts.projectId}, ${counts.workLocationId}, NULL, ${counts.pobPheOses}, ${counts.pobContractor}, false)
        ON CONFLICT (log_date, project_id, work_location_id) WHERE is_legacy = false AND work_location_id IS NOT NULL
        DO UPDATE SET 
          pob_phe_oses = EXCLUDED.pob_phe_oses,
          pob_contractor = EXCLUDED.pob_contractor,
          updated_at = NOW()
      `);
    } else {
      await db.execute(sql`
        INSERT INTO log_manhours (log_date, contractor_id, project_id, work_location_id, vessel_id, pob_phe_oses, pob_contractor, is_legacy)
        VALUES (${logDate}, NULL, ${counts.projectId}, NULL, NULL, ${counts.pobPheOses}, ${counts.pobContractor}, false)
        ON CONFLICT (log_date, project_id) WHERE is_legacy = false AND work_location_id IS NULL
        DO UPDATE SET 
          pob_phe_oses = EXCLUDED.pob_phe_oses,
          pob_contractor = EXCLUDED.pob_contractor,
          updated_at = NOW()
      `);
    }
  }
}

/**
 * Get the log_date from an attendance record or use current date
 */
export function getLogDate(attendanceDate?: string): string {
  return attendanceDate ?? new Date().toISOString().slice(0, 10);
}

import { db } from '../../db/index.ts';
import { vessels, contractorVessels, userContractors } from '../../db/schema/auth.schema.ts';
import { employees, employeeStatus, attendance } from '../../db/schema/employee.schema.ts';
import { eq, isNull, count, inArray } from 'drizzle-orm';
import { recalculateLogManhoursForDate } from './logManhoursTrigger.service.ts';

export interface Vessel {
  id: string;
  vesselName: string;
  type?: string | null;
  status?: boolean;
  personnelCount: number | null;
  extra?: {
    target?: number | null;
  } | null;
}

// CREATE
export async function createVessel(data: Omit<Vessel, 'id'> & { target?: number | null }) {
  const result = await db
    .insert(vessels)
    .values({
      vesselName: data.vesselName,
      type: data.type?.toUpperCase(),
      personnelCount: 0, // Keep in DB for backward compatibility, but we calculate from employees
      extra: {
        target: data.target ?? null,
      },
    })
    .returning();

  if (!result[0]) return null;
  
  return {
    id: result[0].id,
    vesselName: result[0].vesselName,
    type: result[0].type,
    personnelCount: 0, // New vessel has no employees
    extra: result[0].extra as Vessel['extra'],
  };
}

// READ (LIST)
export async function listVessels(filterUnassigned: boolean = false): Promise<Vessel[]> {
  let vesselList: any[] = [];
  
  if (filterUnassigned) {
    // Get all vessels that are NOT in the contractorVessels table
    vesselList = await db.select({
      id: vessels.id,
      vesselName: vessels.vesselName,
      type: vessels.type,
      status: vessels.status,
      extra: vessels.extra,
    })
      .from(vessels)
      .leftJoin(contractorVessels, eq(vessels.id, contractorVessels.vesselId))
      .where(isNull(contractorVessels.vesselId))
      .orderBy(vessels.vesselName);
  } else {
    // Get all vessels
    vesselList = await db.select({
      id: vessels.id,
      vesselName: vessels.vesselName,
      type: vessels.type,
      status: vessels.status,
      extra: vessels.extra,
    }).from(vessels)
      .orderBy(vessels.vesselName);
  }
  
  // Get personnel count for each vessel
  const vesselPersonnelCount: Record<string, number> = {};
  if (vesselList.length > 0) {
    const vesselIds = vesselList.map(v => v.id);
    const personnelCountData = await db.select({
      vesselId: employees.vesselId,
      count: count(),
    })
    .from(employees)
    .where(inArray(employees.vesselId, vesselIds))
    .groupBy(employees.vesselId);
    
    personnelCountData.forEach(item => {
      if (item.vesselId) {
        vesselPersonnelCount[item.vesselId] = Number(item.count);
      }
    });
  }
  
  // Map vessels with their personnel counts
  return vesselList.map(vessel => ({
    id: vessel.id,
    vesselName: vessel.vesselName,
    type: vessel.type,
    status: vessel.status,
    personnelCount: vesselPersonnelCount[vessel.id] || 0,
    extra: vessel.extra as Vessel['extra'],
  }));
}

// READ by ID
export async function getVesselById(id: string): Promise<Vessel | null> {
  const result = await db
    .select({
      id: vessels.id,
      vesselName: vessels.vesselName,
      type: vessels.type,
      status: vessels.status,
      extra: vessels.extra,
    })
    .from(vessels)
    .where(eq(vessels.id, id));

  if (!result[0]) return null;
  
  // Get personnel count for this vessel
  const personnelCountData = await db.select({ count: count() })
    .from(employees)
    .where(eq(employees.vesselId, id));
  
  const personnelCount = Number(personnelCountData[0]?.count || 0);
  
  return {
    id: result[0].id,
    vesselName: result[0].vesselName,
    type: result[0].type,
    personnelCount,
    status: result[0].status,
    extra: result[0].extra as Vessel['extra'],
  };
}

// UPDATE
export async function updateVessel(
  id: string,
  data: Partial<Omit<Vessel, 'id'>> & { target?: number | null; date?: string; statusChangeDate?: string }
): Promise<Vessel | null> {
  const existing = await db
    .select()
    .from(vessels)
    .where(eq(vessels.id, id))
    .limit(1);

  if (existing.length === 0) return null;

  const currentExtra = (existing[0].extra as Record<string, any>) || {};
  const updatedExtra = {
    ...currentExtra,
    ...(data.target !== undefined ? { target: data.target } : {}),
  };

  const updateData: any = {
    type: data.type?.toUpperCase(),
    status: data.status,
    extra: updatedExtra,
  };
  if (data.vesselName !== undefined) {
    updateData.vesselName = data.vesselName;
  }

  // Check if status is changing between true/false
  const currentStatus = existing[0].status;
  const newStatus = data.status;
  const statusChanged = typeof currentStatus === 'boolean' && typeof newStatus === 'boolean' && currentStatus !== newStatus;

  const result = await db
    .update(vessels)
    .set(updateData)
    .where(eq(vessels.id, id))
    .returning();

  if (!result[0]) return null;

  if (statusChanged) {
    let effectiveDateTime: Date;
    let effectiveDate: string;
    
    const dateInput = data.statusChangeDate || data.date;
    if (dateInput) {
      effectiveDateTime = new Date(`${dateInput}T00:00:00`);
      effectiveDate = dateInput;
    } else {
      effectiveDateTime = new Date();
      effectiveDate = effectiveDateTime.toISOString().split('T')[0];
    }

    // Find all employees associated with this vessel
    const associatedEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.vesselId, id));

    for (const emp of associatedEmployees) {
      // Update employee statusOnDuty in employees table
      await db
        .update(employees)
        .set({ statusOnDuty: newStatus, updatedAt: new Date() })
        .where(eq(employees.id, emp.id));

      if (newStatus === true) {
        await db
          .insert(employeeStatus)
          .values({
            employeeId: emp.id,
            isOnDuty: true,
            lastCheckIn: effectiveDateTime,
            currentCycleStartDate: effectiveDate,
            updatedAt: effectiveDateTime,
          })
          .onConflictDoUpdate({
            target: [employeeStatus.employeeId],
            set: {
              isOnDuty: true,
              lastCheckIn: effectiveDateTime,
              currentCycleStartDate: effectiveDate,
              updatedAt: effectiveDateTime,
            },
          });

        await db.insert(attendance).values({
          employeeId: emp.id,
          attendanceDate: effectiveDate,
          statusAfter: 'on_duty',
          photoEvidence: null,
          notes: `Status berubah menjadi ON DUTY melalui pembaruan status vessel ${existing[0].vesselName}`,
          position: null,
          createdAt: effectiveDateTime,
          updatedAt: effectiveDateTime,
        });
      } else {
        await db
          .insert(employeeStatus)
          .values({
            employeeId: emp.id,
            isOnDuty: false,
            lastCheckOut: effectiveDateTime,
            currentCycleStartDate: null,
            updatedAt: effectiveDateTime,
          })
          .onConflictDoUpdate({
            target: [employeeStatus.employeeId],
            set: {
              isOnDuty: false,
              lastCheckOut: effectiveDateTime,
              currentCycleStartDate: null,
              updatedAt: effectiveDateTime,
            },
          });

        await db.insert(attendance).values({
          employeeId: emp.id,
          attendanceDate: effectiveDate,
          statusAfter: 'off_duty',
          photoEvidence: null,
          notes: `Status berubah menjadi OFF DUTY melalui pembaruan status vessel ${existing[0].vesselName}`,
          position: null,
          createdAt: effectiveDateTime,
          updatedAt: effectiveDateTime,
        });
      }

      await recalculateLogManhoursForDate(effectiveDate);
    }
  }
  
  // Get personnel count for the updated vessel
  const personnelCountData = await db.select({ count: count() })
    .from(employees)
    .where(eq(employees.vesselId, id));
  
  const personnelCount = Number(personnelCountData[0]?.count || 0);
  
  return {
    id: result[0].id,
    vesselName: result[0].vesselName,
    type: result[0].type,
    personnelCount,
    status: result[0].status,
    extra: result[0].extra as Vessel['extra'],
  };
}

// DELETE
export async function deleteVessel(id: string): Promise<{ success: boolean; inUse?: boolean; inUseBy?: 'contractor' | 'employee' | 'user' }> {
  // Check if vessel is associated with any contractors
  const associatedContractors = await db
    .select()
    .from(contractorVessels)
    .where(eq(contractorVessels.vesselId, id));

  if (associatedContractors.length > 0) {
    return { success: false, inUse: true, inUseBy: 'contractor' };
  }

  // Check if vessel is associated with any employees
  const associatedEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.vesselId, id))
    .limit(1);

  if (associatedEmployees.length > 0) {
    return { success: false, inUse: true, inUseBy: 'employee' };
  }

  // Check if vessel is associated with any user contractors
  const associatedUserContractors = await db
    .select()
    .from(userContractors)
    .where(eq(userContractors.vesselId, id))
    .limit(1);

  if (associatedUserContractors.length > 0) {
    return { success: false, inUse: true, inUseBy: 'user' };
  }

  try {
    await db.delete(vessels).where(eq(vessels.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting vessel:', error);
    return { success: false };
  }
}
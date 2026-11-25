import { db } from '../../db/index.ts';
import { subtypes, workLocations } from '../../db/schema/report.schema.ts';
import { eq, inArray, sql } from 'drizzle-orm';
import type { WorkLocationInput } from '../../types/subtype.ts';
import { recalculateLogManhoursForDate } from './logManhoursTrigger.service.ts';

export interface WorkLocationData {
  id: string;
  projectId: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
}

export interface Subtype {
  id: string;
  name: string;
  extra: {
    hoursPobPheOses?: number | null;
    hoursPobContractor?: number | null;
    target?: number | null;
    autoCalculateManhours?: boolean | null;
  } | null;
  workLocations?: WorkLocationData[];
}

export interface SubtypeInput {
  name: string;
  hoursPobPheOses?: number | null;
  hoursPobContractor?: number | null;
  target?: number | null;
  autoCalculateManhours?: boolean | null;
  workLocations?: WorkLocationInput[];
}

// CREATE
export async function createSubtype(data: SubtypeInput) {
  const result = await db
    .insert(subtypes)
    .values({
      name: data.name,
      extra: {
        hoursPobPheOses: data.hoursPobPheOses ?? 12,
        hoursPobContractor: data.hoursPobContractor ?? 12,
        target: data.target ?? null,
        autoCalculateManhours: data.autoCalculateManhours ?? true,
      },
    })
    .returning();

  const created = result[0];
  let createdLocations: WorkLocationData[] = [];

  if (data.workLocations && Array.isArray(data.workLocations) && data.workLocations.length > 0) {
    const validLocations = data.workLocations
      .filter((loc) => loc.name && loc.name.trim() !== '')
      .map((loc) => ({
        projectId: created.id,
        name: loc.name.trim(),
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
      }));

    if (validLocations.length > 0) {
      createdLocations = await db
        .insert(workLocations)
        .values(validLocations)
        .returning();
    }
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    await recalculateLogManhoursForDate(today);
  } catch (err) {
    console.warn('[Subtypes] Warning recalculating log manhours on create:', err);
  }

  return {
    id: created.id,
    name: created.name,
    extra: created.extra as Subtype['extra'],
    workLocations: createdLocations,
  };
}

// READ (LIST)
export async function listSubtypes(): Promise<Subtype[]> {
  const rows = await db.select().from(subtypes);
  const allLocations = await db.select().from(workLocations);

  const locationsByProjectId = new Map<string, WorkLocationData[]>();
  for (const loc of allLocations) {
    const list = locationsByProjectId.get(loc.projectId) || [];
    list.push(loc);
    locationsByProjectId.set(loc.projectId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    extra: row.extra as Subtype['extra'],
    workLocations: locationsByProjectId.get(row.id) || [],
  }));
}

// READ by ID
export async function getSubtypeById(id: string): Promise<Subtype | null> {
  const result = await db
    .select()
    .from(subtypes)
    .where(eq(subtypes.id, id));

  if (!result[0]) return null;

  const locs = await db
    .select()
    .from(workLocations)
    .where(eq(workLocations.projectId, id));

  return {
    id: result[0].id,
    name: result[0].name,
    extra: result[0].extra as Subtype['extra'],
    workLocations: locs,
  };
}

// UPDATE
export async function updateSubtype(
  id: string,
  data: Partial<SubtypeInput>
): Promise<Subtype | null> {
  const existing = await db
    .select()
    .from(subtypes)
    .where(eq(subtypes.id, id))
    .limit(1);

  if (existing.length === 0) return null;

  const currentExtra = (existing[0].extra as Record<string, any>) || {};
  const updatedExtra = {
    ...currentExtra,
    ...(data.hoursPobPheOses !== undefined ? { hoursPobPheOses: data.hoursPobPheOses } : {}),
    ...(data.hoursPobContractor !== undefined ? { hoursPobContractor: data.hoursPobContractor } : {}),
    ...(data.target !== undefined ? { target: data.target } : {}),
    ...(data.autoCalculateManhours !== undefined ? { autoCalculateManhours: data.autoCalculateManhours } : {}),
  };

  const updatePayload: Record<string, any> = {};
  if (data.name !== undefined) {
    updatePayload.name = data.name;
  }
  updatePayload.extra = updatedExtra;

  const result = await db
    .update(subtypes)
    .set(updatePayload)
    .where(eq(subtypes.id, id))
    .returning();

  if (!result[0]) return null;

  // Handle work locations update if provided
  if (data.workLocations !== undefined) {
    // Process removals first
    const toDeleteIds = data.workLocations
      .filter((loc) => loc.isDeleted && loc.id)
      .map((loc) => loc.id as string);

    if (toDeleteIds.length > 0) {
      await db.delete(workLocations).where(inArray(workLocations.id, toDeleteIds));
    }

    // Process updates and new insertions
    for (const loc of data.workLocations) {
      if (loc.isDeleted) continue;

      if (loc.id) {
        // Update existing location
        await db
          .update(workLocations)
          .set({
            name: loc.name,
            latitude: loc.latitude ?? null,
            longitude: loc.longitude ?? null,
            updatedAt: new Date(),
          })
          .where(eq(workLocations.id, loc.id));
      } else if (loc.name && loc.name.trim() !== '') {
        // Insert new location
        await db.insert(workLocations).values({
          projectId: id,
          name: loc.name.trim(),
          latitude: loc.latitude ?? null,
          longitude: loc.longitude ?? null,
        });
      }
    }
  }

  const updatedLocs = await db
    .select()
    .from(workLocations)
    .where(eq(workLocations.projectId, id));

  try {
    const today = new Date().toISOString().slice(0, 10);
    await recalculateLogManhoursForDate(today);
  } catch (err) {
    console.warn('[Subtypes] Warning recalculating log manhours on update:', err);
  }

  return {
    id: result[0].id,
    name: result[0].name,
    extra: result[0].extra as Subtype['extra'],
    workLocations: updatedLocs,
  };
}

// DELETE
export async function deleteSubtype(id: string): Promise<{ success: boolean }> {
  await db.delete(subtypes).where(eq(subtypes.id, id));
  return { success: true };
}

// DISABLE ALL AUTO CALCULATE MANHOURS
export async function disableAllAutoCalculateManhours(): Promise<{ updated: number }> {
  const result: any = await db.execute(sql`
    UPDATE subtypes 
    SET extra = jsonb_set(COALESCE(extra::jsonb, '{}'::jsonb), '{autoCalculateManhours}', 'false'::jsonb)
  `);

  try {
    const today = new Date().toISOString().slice(0, 10);
    await recalculateLogManhoursForDate(today);
  } catch (err) {
    console.warn('[Subtypes] Warning recalculating log manhours on disable all:', err);
  }

  return { updated: result?.rowCount ?? result?.count ?? 0 };
}

/* c8 ignore start */
import {pgTable, uuid, date, integer, boolean, timestamp, uniqueIndex} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { subContractors } from './auth.schema.ts';
import { subtypes, workLocations } from './report.schema.ts';
import { vessels } from './auth.schema.ts';

export const logManhours = pgTable('log_manhours', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  logDate: date('log_date').notNull(),
  contractorId: uuid('contractor_id').references(() => subContractors.id),
  projectId: uuid('project_id').references(() => subtypes.id),
  workLocationId: uuid('work_location_id').references(() => workLocations.id, { onDelete: 'cascade' }),
  vesselId: uuid('vessel_id').references(() => vessels.id),
  pobPheOses: integer('pob_phe_oses').default(0),
  pobContractor: integer('pob_contractor').default(0),
  isLegacy: boolean('is_legacy').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Partial unique constraint for vessel-based logs (only when not legacy)
    vesselDateUnique: uniqueIndex('vessel_date_unique')
      .on(table.logDate, table.vesselId)
      .where(sql`${table.isLegacy} = false`),
    // Partial unique constraint for project-based logs without work location
    projectDateUnique: uniqueIndex('project_date_unique')
      .on(table.logDate, table.projectId)
      .where(sql`${table.isLegacy} = false AND ${table.workLocationId} IS NULL`),
    // Partial unique constraint for project-based logs with work location
    projectDateWorkLocationUnique: uniqueIndex('project_date_work_location_unique')
      .on(table.logDate, table.projectId, table.workLocationId)
      .where(sql`${table.isLegacy} = false AND ${table.workLocationId} IS NOT NULL`),
  };
});

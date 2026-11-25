import { db } from '../../db/index.ts';
import { pobUnmatchedLogs } from '../../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

export const deletePobUnmatchedLogService = async (id: string) => {
  await db.delete(pobUnmatchedLogs).where(eq(pobUnmatchedLogs.id, id));
  return { success: true };
};

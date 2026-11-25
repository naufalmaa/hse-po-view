import { db } from '../../db/index.ts';
import { pobUnmatchedLogs } from '../../db/schema/employee.schema.ts';
import { desc } from 'drizzle-orm';

export const listPobUnmatchedLogsService = async () => {
  const logs = await db.select({
    id: pobUnmatchedLogs.id,
    uploadedAt: pobUnmatchedLogs.uploadedAt,
    unmatchedCount: pobUnmatchedLogs.unmatchedCount,
    filename: pobUnmatchedLogs.filename,
  })
    .from(pobUnmatchedLogs)
    .orderBy(desc(pobUnmatchedLogs.uploadedAt));
  
  return logs;
};

import { db } from '../../db/index.ts';
import { uploadHistory } from '../../db/schema/employee.schema.ts';
import { inArray } from 'drizzle-orm';

/**
 * Delete upload history records by their IDs
 * This will automatically cascade delete associated upload observation errors
 * due to the foreign key constraint with onDelete: 'cascade'
 * 
 * @param ids - Array of upload history IDs to delete
 * @returns Number of deleted records
 */
export async function deleteUploadHistoryByIds(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) {
    return 0;
  }

  const result = await db
    .delete(uploadHistory)
    .where(inArray(uploadHistory.id, ids));
  
  // The cascade delete will automatically remove associated uploadObservationErrors
  return result.rowCount ?? 0;
}

/**
 * Delete a single upload history record by ID
 * This will automatically cascade delete associated upload observation errors
 * due to the foreign key constraint with onDelete: 'cascade'
 * 
 * @param id - Upload history ID to delete
 * @returns Number of deleted records
 */
export async function deleteUploadHistoryById(id: string): Promise<number> {
  return await deleteUploadHistoryByIds([id]);
}
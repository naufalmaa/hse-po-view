import { db } from '../../db/index.ts';
import { employees, employeeStatus, pobUnmatchedLogs } from '../../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

export interface ResolvePOBSuggestionParams {
  logId: string;
  passportNumber: string; // The passport number from Excel row
  employeeId: string;     // The matched employee ID from suggestion
}

export const resolvePOBSuggestionService = async (params: ResolvePOBSuggestionParams) => {
  const { logId, passportNumber, employeeId } = params;

  // 1. Fetch the log
  const log = await db.query.pobUnmatchedLogs.findFirst({
    where: eq(pobUnmatchedLogs.id, logId)
  });

  if (!log) {
    throw new Error('Log not found');
  }

  // 2. Parse data and find the specific entry
  const dataArray = (log.data || []) as any[];
  const entryIndex = dataArray.findIndex((item: any) => 
    String(item.excelData['E-PASPORT']).trim() === String(passportNumber).trim()
  );

  if (entryIndex === -1) {
    throw new Error('Entry with this passport number not found in log');
  }

  // 3. Update employee and cleanup log
  await db.transaction(async (tx) => {
    // Update HSSE Passport and statusOnDuty for the matched employee
    await tx.update(employees)
      .set({
        hssePassportNumber: passportNumber,
        statusOnDuty: true,
        updatedAt: new Date()
      })
      .where(eq(employees.id, employeeId));

    // Log status change
    await tx.insert(employeeStatus)
      .values({
        employeeId: employeeId,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [employeeStatus.employeeId],
        set: { updatedAt: new Date() }
      });

    // 4. Update the log data: Remove the resolved entry and decrement the count
    dataArray.splice(entryIndex, 1);
    const newCount = dataArray.length;
    
    if (newCount === 0) {
      // If no more unmatched items remain, remove the log entirely
      await tx.delete(pobUnmatchedLogs).where(eq(pobUnmatchedLogs.id, logId));
    } else {
      // Update the log with the remaining data and updated count
      await tx.update(pobUnmatchedLogs)
        .set({
          data: dataArray,
          unmatchedCount: newCount
        })
        .where(eq(pobUnmatchedLogs.id, logId));
    }
  });

  return { success: true };
};

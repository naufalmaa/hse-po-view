import { db } from '../../db/index.ts';
import { employees, employeeStatus, pobUnmatchedLogs } from '../../db/schema/employee.schema.ts';
import { eq, inArray } from 'drizzle-orm';
import { readPOBOffshoreExcel } from './pob-excel.service.ts';
import { findEmployeeMatch } from '../smartCardObservations/employeeMatcher.ts';

export interface POBData {
  NAME: string;
  'E-PASPORT': string;
  DEPARTMENT: string;
  COMPANY: string;
}

/**
 * POB Update Service
 * - Reads Excel
 * - Matches employees by HSSE Passport Number
 * - Groups by category
 * - Optionally updates statusOnDuty to true and logs change
 */
export const pobUpdateService = async (
  buffer: Buffer,
  updates: boolean = false,
  categoryUpdate?: string,
  filename?: string
) => {
  const pobData = await readPOBOffshoreExcel(buffer);
  const passportNumbers = Array.from(new Set(pobData.map(d => d['E-PASPORT'])));

  if (passportNumbers.length === 0) {
    return {
      marine: [],
      project: [],
      mitra: []
    };
  }

  // Fetch employees from DB
  const matchedEmployees = await db.select()
    .from(employees)
    .where(inArray(employees.hssePassportNumber, passportNumbers));

  const matchedPassports = new Set(matchedEmployees.map(e => e.hssePassportNumber));
  const unmatchedData = pobData.filter(d => !matchedPassports.has(d['E-PASPORT']));

  // If view mode (no updates requested), log unmatched records
  let logId: string | undefined;
  if (!updates && !categoryUpdate && unmatchedData.length > 0) {
    const unmatchedWithSuggestions = await Promise.all(
      unmatchedData.map(async (d) => {
        const { suggestions } = await findEmployeeMatch(d.NAME, d.COMPANY);
        return {
          excelData: d,
          suggestions
        };
      })
    );

    const [insertedLog] = await db.insert(pobUnmatchedLogs)
      .values({
        unmatchedCount: unmatchedData.length,
        filename: filename,
        data: unmatchedWithSuggestions
      })
      .returning({ id: pobUnmatchedLogs.id });
    
    logId = insertedLog.id;
  }

  const categoryMap: Record<string, string> = {
    'crew marine': 'marine',
    'project': 'project',
    'mitra': 'mitra'
  };

  const reverseCategoryMap: Record<string, string> = {
    'marine': 'crew marine',
    'project': 'project',
    'mitra': 'mitra'
  };

  // Group employees by category
  const grouped: Record<string, any[]> = {
    marine: [],
    project: [],
    mitra: []
  };

  matchedEmployees.forEach(emp => {
    const groupKey = categoryMap[emp.category || ''] || emp.category || 'other';
    if (grouped[groupKey]) {
      grouped[groupKey].push(emp);
    }
  });

  // Perform updates if requested
  if (updates && categoryUpdate) {
    const targetDbCategory = reverseCategoryMap[categoryUpdate.toLowerCase()];
    if (targetDbCategory) {
      const employeesToUpdate = matchedEmployees.filter(emp => emp.category === targetDbCategory);
      
      for (const emp of employeesToUpdate) {
        const currentStatus = emp.statusOnDuty;
        const newStatus = true;

        // Update status if it's not already true
        if (currentStatus !== newStatus) {
          await db.update(employees)
            .set({ 
              statusOnDuty: true, 
              updatedAt: new Date() 
            })
            .where(eq(employees.id, emp.id));

          // Log status change (logic from update.service.ts)
          // Only log when statusOnDuty changes specifically between true and false
          if (typeof currentStatus === 'boolean') {
            await db
              .insert(employeeStatus)
              .values({
                employeeId: emp.id,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [employeeStatus.employeeId],
                set: {
                  updatedAt: new Date(),
                },
              });
          }
        }
      }
    }
  }

  return {
    ...grouped,
    logId
  };
};

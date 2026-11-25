import { db } from '../../db/index.ts';
import { employees } from '../../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';


export const verifyEmployeeService = async (
  employeeId: string,
  verifiedBy: string,
  remarks?: string
) => {
  const now = new Date().toISOString();

  const [updated] = await db
    .update(employees)
    .set({
      verifiedBy,
      verifiedDate: now,
      validationStatus: 'verified',
      remarks: remarks ?? null,
    })
    .where(eq(employees.id, employeeId))
    .returning();

  if (!updated) {
    throw new Error('Employee not found or update failed');
  }

  return {
   updated,
  };
};

export const rejectEmployeeService = async (
  employeeId: string,
  rejectedBy: string,
  remarks: string
) => {
  const [updated] = await db
    .update(employees)
    .set({
      validationStatus: 'rejected',
      verifiedBy: rejectedBy,
      verifiedDate: null,
      remarks,
    })
    .where(eq(employees.id, employeeId))
    .returning();

  if (!updated) {
    throw new Error('Employee not found or update failed');
  }

  return {
    updated,
  };
};

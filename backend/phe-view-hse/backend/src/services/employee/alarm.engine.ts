import { db } from '../../db/index.ts';
import { alarmEmployeeLog, employees } from '../../db/schema/employee.schema.ts';
import { userAlarmLog, userContractors, users } from "../../db/schema/auth.schema.ts";
import { sql, eq, and, desc } from 'drizzle-orm';

/**
 * Cek status kedaluwarsa
 * - expired: tanggal sudah lewat
 * - warning: tanggal <= 30 hari lagi
 * - null: masih aman
 */
function getExpiryStatus(date: string | Date | null | undefined): 'expired' | 'warning' | null {
  if (!date) return null;
  const now = new Date();
  const expiry = new Date(date);
  const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return 'expired';
  if (diff <= 30) return 'warning';
  return null;
}

/**
 * Fungsi untuk mengecek data kedaluwarsa lalu simpan ke alarm
 */
export async function checkExpiry<
  T extends { employeeId: string; [key: string]: any }
>(
  table: any,
  field: keyof T,
  type: string
) {
  // Ambil semua row, urutkan berdasarkan tanggal (desc)
  const rows = await db.select().from(table).orderBy(desc(table[field as string]));
  const latestRows: T[] = [];
  const seen = new Set<string>();

  // Ambil hanya row terbaru per employee
  for (const row of rows as T[]) {
    if (!seen.has(row.employeeId)) {
      seen.add(row.employeeId);
      latestRows.push(row);
    }
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  for (const row of latestRows) {
    const value = row[field] as Date | string | null | undefined;
    const status = getExpiryStatus(value);
    if (!status) continue; // kalau aman, skip

    // Skip jika sudah ada alarm untuk hari ini (supaya tidak dobel)
    const existing = await db
      .select({ id: alarmEmployeeLog.id })
      .from(alarmEmployeeLog)
      .where(
        and(
          eq(sql`date(${alarmEmployeeLog.triggeredAt})`, today),
          eq(alarmEmployeeLog.employeeId, row.employeeId),
          eq(alarmEmployeeLog.type, type)
        )
      );

    if (existing.length > 0) continue;

    // Buat pesan sesuai status
    const message =
      status === 'expired'
        ? `${type} sudah kedaluwarsa`
        : `${type} akan kedaluwarsa dalam 30 hari`;

    // Insert ke alarmEmployeeLog dengan status
    const [{ id: alarmEmployeeId }] = await db
      .insert(alarmEmployeeLog)
      .values({
        employeeId: row.employeeId,
        type,
        message,
        status,
      })
      .returning({ id: alarmEmployeeLog.id });

    // Ambil subContractorId dari employee
    const [employeeData] = await db
      .select({ subContractorId: employees.subContractorId })
      .from(employees)
      .where(eq(employees.id, row.employeeId));

    // Ambil semua user (admin + contractor + subContractor info)
    const allUsers = await db
      .select({
        userId: users.id,
        role: users.role,
        contractorId: userContractors.contractorId,
      })
      .from(users)
      .leftJoin(userContractors, eq(users.id, userContractors.userId));

    // Filter user target (admin selalu, contractor sesuai subContractorId)
    const targetUsers = allUsers
      .filter((u) => {
        if (u.role === 'admin') return true;
        if (u.role === 'contractor' && employeeData?.subContractorId) {
          return u.contractorId === employeeData.subContractorId;
        }
        return false;
      })
      .map((u) => ({
        alarmEmployeeId,
        userId: u.userId,
      }));

    // Masukkan ke user_alarm_log
    // For employee alarms, set alarmEmployeeId to the actual ID and alarmCsmsId to null
    if (targetUsers.length > 0) {
      await db.insert(userAlarmLog).values(
        targetUsers.map(user => ({
          alarmEmployeeId: user.alarmEmployeeId,
          alarmCsmsId: null, // Null for employee alarms
          userId: user.userId,
        }))
      );
    }
  }
}
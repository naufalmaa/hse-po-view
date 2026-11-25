import { and, eq, asc, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.ts';
import { userAlarmLog } from '../db/schema/auth.schema.ts'
import { alarmEmployeeLog, employees } from '../db/schema/employee.schema.ts';
import { alarmCsmsLog } from '../db/schema/csms.schema.ts';

type GetNotificationsOptions = {
  onlyUnread?: boolean;
  orderBy?: 'asc' | 'desc'; // default desc
  limit?: number;           // default 20
  page?: number;            // default 0 (offset-based)
};

export async function getNotifications(
  userId: string,
  {
    onlyUnread = false,
    orderBy = 'desc',
    limit = 20,
    page = 0,
  }: GetNotificationsOptions = {}
) {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(0, page);
  const offset = safePage * safeLimit;

  // Create aliases for the alarm tables
  const employeeAlarm = alias(alarmEmployeeLog, 'employeeAlarm');
  const csmsAlarm = alias(alarmCsmsLog, 'csmsAlarm');

  const whereCondition = onlyUnread
    ? and(eq(userAlarmLog.userId, userId), eq(userAlarmLog.isRead, false))
    : eq(userAlarmLog.userId, userId);

  // Count total notifications
  const [{ total }] = await db
    .select({ 
      total: sql<number>`count(*)`.mapWith(Number)
    })
    .from(userAlarmLog)
    .leftJoin(employeeAlarm, eq(userAlarmLog.alarmEmployeeId, employeeAlarm.id))
    .leftJoin(csmsAlarm, eq(userAlarmLog.alarmCsmsId, csmsAlarm.id))
    .where(whereCondition);

  // Fetch notification data with proper joins for both alarm types
  const items = await db
    .select({
      id: userAlarmLog.id,
      isRead: userAlarmLog.isRead,
      readAt: userAlarmLog.readAt,
      userId: userAlarmLog.userId,
      type: sql<string>`COALESCE(${employeeAlarm.type}, ${csmsAlarm.type})`,
      message: sql<string>`COALESCE(${employeeAlarm.message}, ${csmsAlarm.description})`,
      status: sql<string>`COALESCE(${employeeAlarm.status}, ${csmsAlarm.status})`,
      triggeredAt: sql<Date>`COALESCE(${employeeAlarm.triggeredAt}, ${csmsAlarm.triggeredAt})`,
      employeeId: employeeAlarm.employeeId,
      employeeName: employees.employeeName,
      alarmEmployeeId: userAlarmLog.alarmEmployeeId,
      alarmCsmsId: userAlarmLog.alarmCsmsId,
      // Add contract ID for CSMS alarms
      contractId: csmsAlarm.contractId,
    })
    .from(userAlarmLog)
    .leftJoin(employeeAlarm, eq(userAlarmLog.alarmEmployeeId, employeeAlarm.id))
    .leftJoin(csmsAlarm, eq(userAlarmLog.alarmCsmsId, csmsAlarm.id))
    .leftJoin(employees, eq(employeeAlarm.employeeId, employees.id))
    .where(whereCondition)
    .orderBy(orderBy === 'asc' 
      ? asc(sql<Date>`COALESCE(${employeeAlarm.triggeredAt}, ${csmsAlarm.triggeredAt})`) 
      : desc(sql<Date>`COALESCE(${employeeAlarm.triggeredAt}, ${csmsAlarm.triggeredAt})`))
    .limit(safeLimit)
    .offset(offset);

  // Separate employee and csms notifications
  const employeeNotifications = items
    .filter(item => item.alarmEmployeeId !== null)
    .map(item => ({
      id: item.id,
      isRead: item.isRead,
      readAt: item.readAt,
      type: item.type,
      message: item.message,
      status: item.status,
      triggeredAt: item.triggeredAt,
      employeeId: item.employeeId,
      employeeName: item.employeeName
    }));

  const csmsNotifications = items
    .filter(item => item.alarmCsmsId !== null)
    .map(item => ({
      id: item.id,
      isRead: item.isRead,
      readAt: item.readAt,
      type: item.type,
      message: item.message,
      status: item.status,
      triggeredAt: item.triggeredAt,
      // Include contract ID if available
      contractId: item.contractId || undefined,
    }));

  return {
    data: {
      employee: employeeNotifications,
      csms: csmsNotifications
    },
    meta: {
      total: total ?? 0,
      page: safePage,
      view: safeLimit,
      totalPages: Math.ceil((total ?? 0) / safeLimit)
    }
  };
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  await db.update(userAlarmLog)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(userAlarmLog.id, notificationId), eq(userAlarmLog.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: string) {
  await db.update(userAlarmLog)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(userAlarmLog.userId, userId), eq(userAlarmLog.isRead, false)));
}
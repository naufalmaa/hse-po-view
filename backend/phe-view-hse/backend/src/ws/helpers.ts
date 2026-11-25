// src/ws/helpers.ts

import { db } from '../db/index.ts';
import { eq, and } from 'drizzle-orm';
import { userAlarmLog } from '../db/schema/auth.schema.ts';
import { alarmEmployeeLog, employees } from '../db/schema/employee.schema.ts';
import { broadcastAlarmToUser } from './broadcast.ts';
import { isClientConnected } from './clients.ts';

export async function sendUnreadAlarms(userId: string) {
  try {
    const unreadAlarms = await db
      .select({
        id: alarmEmployeeLog.id,
        type: alarmEmployeeLog.type,
        message: alarmEmployeeLog.message,
        status: alarmEmployeeLog.status,
        employeeId: alarmEmployeeLog.employeeId,
        subContractorId: employees.subContractorId,
        employeeName: employees.employeeName,
        triggeredAt: alarmEmployeeLog.triggeredAt,
      })
      .from(userAlarmLog)
      .innerJoin(alarmEmployeeLog, eq(userAlarmLog.alarmEmployeeId, alarmEmployeeLog.id))
      .leftJoin(employees, eq(alarmEmployeeLog.employeeId, employees.id))
      .where(and(
        eq(userAlarmLog.userId, userId),
        eq(userAlarmLog.isRead, false)
      ))
      .limit(50);

    let sent = 0;
    for (const alarm of unreadAlarms) {
      if (isClientConnected(userId)) {
        broadcastAlarmToUser(userId, alarm);
        sent++;
      }
    }

    console.log(`[WS] Sent ${sent} unread notification(s) to user: ${userId}`);
  } catch (err) {
    console.error('[WS] Failed to send unread alarms:', err);
  }
}
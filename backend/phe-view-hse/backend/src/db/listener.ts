// src/db/listener.ts

import { Client } from 'pg';
import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { alarmEmployeeLog, employees } from './schema/employee.schema.ts';
import { alarmCsmsLog, contractFolder, csmsAiEvaluationJob, contract } from './schema/csms.schema.ts';
import { userAlarmLog, subContractors, users } from './schema/auth.schema.ts';
import { broadcastAlarmToUser, broadcastToRole } from '../ws/broadcast.ts';
import env from '../config/env.config.ts';

// Define a common interface for alarm data
interface AlarmData {
  id: string;
  type: string | null;
  message: string | null;
  title?: string | null;
  triggeredAt: Date | null;
  employeeId: string | null;
  contractorId?: string | null;
  subContractorId: string | null;
}

let listenerRetryMs = 1000;
const terminalSeen = new Map<string, number>();

function scheduleListenerReconnect() {
  const delay = listenerRetryMs;
  listenerRetryMs = Math.min(listenerRetryMs * 2, 30000);
  console.warn(`[DB] Listener lost, reconnecting in ${delay}ms`);
  setTimeout(() => {
    startDbListener().catch(() => scheduleListenerReconnect());
  }, delay);
}

export async function startDbListener() {
  const client = new Client({ connectionString: env.db.url });
  let reconnecting = false;
  const reconnectOnce = () => {
    if (reconnecting) return;
    reconnecting = true;
    client.end().catch(() => {});
    scheduleListenerReconnect();
  };
  client.on('error', reconnectOnce);
  client.on('end', reconnectOnce);

  try {
    await client.connect();
    listenerRetryMs = 1000;
    console.log('[DB] PostgreSQL listener connected');
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL listener:', err);
    reconnectOnce();
    return;
  }

  client.on('notification', async (msg) => {
    const id = msg?.payload;
    if (!id) return;

    console.log('[DB] Notification received:', msg.channel, '->', id);

    // --- Handle AI evaluation channel ---
    if (msg.channel === 'csms_ai_evaluation_channel') {
      try {
        const payload = JSON.parse(id);
        await handleAiEvaluationNotification(payload);
      } catch (err) {
        console.error('[DB] Error processing AI evaluation notification:', err);
      }
      return;
    }

    // --- Handle alarm channel (existing logic) ---

    try {
      // First, try to find the alarm in the employee alarm table
      let alarmData: AlarmData | undefined = await getEmployeeAlarmData(id);
      
      // If not found, try to find it in the CSMS alarm table
      if (!alarmData) {
        alarmData = await getCsmsAlarmData(id);
      }

      if (!alarmData) {
        console.warn('[DB] Alarm not found for ID:', id);
        return;
      }

      // Get recipients from userAlarmLog based on alarm type
      let recipients: { userId: string }[] = [];
      if (alarmData.employeeId) {
        // This is an employee alarm
        recipients = await db
          .select({ userId: userAlarmLog.userId })
          .from(userAlarmLog)
          .where(eq(userAlarmLog.alarmEmployeeId, id));
      } else if (alarmData.contractorId) {
        // This is a CSMS alarm
        recipients = await db
          .select({ userId: userAlarmLog.userId })
          .from(userAlarmLog)
          .where(eq(userAlarmLog.alarmCsmsId, id));
      }

      for (const { userId } of recipients) {
        broadcastAlarmToUser(userId, alarmData);
      }

      console.log(`[WS] Broadcasted to ${recipients.length} user(s) via user_alarm_log`);

      // ✅ Gunakan helper role-based broadcast
      broadcastToRole('admin', alarmData);

    } catch (err) {
      console.error('[DB] Error processing notification:', err);
    }
  });

  try {
    await client.query('LISTEN notification_channel');
    console.log('[DB] Listening on channel: notification_channel');
  } catch (err) {
    console.error('[DB] Failed to LISTEN on notification_channel:', err);
  }

  // --- CSMS AI Evaluation channel ---
  try {
    await client.query('LISTEN csms_ai_evaluation_channel');
    console.log('[DB] Listening on channel: csms_ai_evaluation_channel');
  } catch (err) {
    console.error('[DB] Failed to LISTEN on csms_ai_evaluation_channel:', err);
  }
}

async function getEmployeeAlarmData(id: string): Promise<AlarmData | undefined> {
  const [alarmData] = await db
    .select({
      id: alarmEmployeeLog.id,
      type: alarmEmployeeLog.type,
      message: alarmEmployeeLog.message,
      triggeredAt: alarmEmployeeLog.triggeredAt,
      employeeId: alarmEmployeeLog.employeeId,
      subContractorId: employees.subContractorId,
      // Add CSMS-specific fields with null values
      contractorId: sql`NULL`.as('contractorId'),
      title: sql`NULL`.as('title'),
    })
    .from(alarmEmployeeLog)
    .leftJoin(employees, eq(alarmEmployeeLog.employeeId, employees.id))
    .where(eq(alarmEmployeeLog.id, id));
  
  // Return undefined if no data found
  if (!alarmData) return undefined;
  
  return {
    id: alarmData.id,
    type: alarmData.type,
    message: alarmData.message,
    title: null,
    triggeredAt: alarmData.triggeredAt,
    employeeId: alarmData.employeeId,
    contractorId: null,
    subContractorId: alarmData.subContractorId || null,
  };
}

async function getCsmsAlarmData(id: string): Promise<AlarmData | undefined> {
  const [alarmData] = await db
    .select({
      id: alarmCsmsLog.id,
      type: alarmCsmsLog.type,
      message: alarmCsmsLog.description,
      title: alarmCsmsLog.title,
      triggeredAt: alarmCsmsLog.triggeredAt,
      contractorId: alarmCsmsLog.contractorId,
      // Add employee-specific fields with null values
      employeeId: sql`NULL`.as('employeeId'),
      subContractorId: alarmCsmsLog.contractorId,
    })
    .from(alarmCsmsLog)
    .leftJoin(subContractors, eq(alarmCsmsLog.contractorId, subContractors.id))
    .where(eq(alarmCsmsLog.id, id));
  
  // Return undefined if no data found
  if (!alarmData) return undefined;
  
  return {
    id: alarmData.id,
    type: alarmData.type,
    message: alarmData.message,
    title: alarmData.title,
    triggeredAt: alarmData.triggeredAt,
    employeeId: null,
    contractorId: alarmData.contractorId,
    subContractorId: alarmData.subContractorId || null,
  };
}

/**
 * Handle csms_ai_evaluation_channel notifications.
 * Payload: { folderId, jobId, status, aiScore?, aiStatus? }
 */
async function handleAiEvaluationNotification(payload: {
  folderId: string;
  jobId: string;
  status: string;
  aiScore?: number;
  aiStatus?: string;
  progressMessage?: string;
}) {
  const { folderId, jobId, status, progressMessage } = payload;
  console.log(`[DB] AI evaluation ${status} for folder ${folderId}. Message: ${progressMessage || '-'}`);

  // Query the job to get userId (who triggered it)
  const [job] = await db
    .select({
      userId: csmsAiEvaluationJob.userId,
      contractFolderId: csmsAiEvaluationJob.contractFolderId,
      errorMessage: csmsAiEvaluationJob.errorMessage,
    })
    .from(csmsAiEvaluationJob)
    .where(eq(csmsAiEvaluationJob.id, jobId))
    .limit(1);

  if (!job) {
    console.warn('[DB] Job not found for notification:', jobId);
    return;
  }

  // Terminal states can arrive twice (engine pg_notify + optional DB trigger): handle once.
  if (status === 'completed' || status === 'failed') {
    const key = `${jobId}:${status}`;
    const now = Date.now();
    if (now - (terminalSeen.get(key) ?? 0) < 60_000) return;
    terminalSeen.set(key, now);
    for (const [k, t] of terminalSeen) if (now - t > 300_000) terminalSeen.delete(k);
  }

  // Handle intermediate progress updates
  if (status === 'processing' || status === 'queued') {
    const progressData = {
      type: 'ai_evaluation_progress' as const,
      folderId,
      jobId,
      status,
      progressMessage: progressMessage || 'Evaluasi AI sedang berlangsung...',
    };

    if (job.userId) {
      broadcastAlarmToUser(job.userId, progressData);
    }
    broadcastToRole('admin', progressData);
    console.log(`[WS] Broadcasted AI evaluation progress: ${progressMessage}`);
    return;
  }

  // Per-subfolder result: let the UI update that one node, without "evaluation complete" side effects
  if (status === 'subfolder_completed') {
    const subfolderId = (payload as any).subfolderId as string | undefined;
    if (!subfolderId) return;
    const [sub] = await db
      .select({
        aiScore: contractFolder.aiScore,
        aiStatus: contractFolder.aiStatus,
        aiReasoning: contractFolder.aiReasoning,
      })
      .from(contractFolder)
      .where(eq(contractFolder.id, subfolderId))
      .limit(1);
    const subData = {
      type: 'ai_subfolder_completed' as const,
      folderId,
      jobId,
      subfolderId,
      aiScore: sub?.aiScore ?? payload.aiScore ?? null,
      aiStatus: sub?.aiStatus ?? payload.aiStatus ?? null,
      aiReasoning: sub?.aiReasoning ?? null,
    };
    if (job.userId) broadcastAlarmToUser(job.userId, subData);
    broadcastToRole('admin', subData);
    return;
  }

  // Query the folder for updated AI results
  const [folder] = await db
    .select({
      name: contractFolder.name,
      contractId: contractFolder.contractId,
      aiScore: contractFolder.aiScore,
      aiStatus: contractFolder.aiStatus,
      aiReasoning: contractFolder.aiReasoning,
      aiProcessedAt: contractFolder.aiProcessedAt,
    })
    .from(contractFolder)
    .where(eq(contractFolder.id, folderId))
    .limit(1);

  if (!folder) {
    console.warn('[DB] Folder not found for notification:', folderId);
    return;
  }

  // For final completed or failed states, write to persistent CSMS Alarm Logs
  if (status === 'completed' || status === 'failed') {
    const [contractData] = await db
      .select({ contractorId: contract.contractorId })
      .from(contract)
      .where(eq(contract.id, folder.contractId))
      .limit(1);

    if (contractData) {
      // Insert into csms_alarm_log (creates a persistent notification in Database)
      const [{ id: alarmId }] = await db
        .insert(alarmCsmsLog)
        .values({
          contractorId: contractData.contractorId,
          contractId: folder.contractId,
          type: 'assessment',
          title: 'Evaluasi AI Selesai',
          description: `Evaluasi AI untuk folder "${folder.name}" telah selesai dengan skor ${folder.aiScore ?? payload.aiScore ?? 0}.`,
          status: (folder.aiStatus ?? payload.aiStatus) === 'accept' ? 'accept' : 'reject',
        })
        .returning({ id: alarmCsmsLog.id });

      // Map this alarm to the user who triggered it
      if (job.userId) {
        await db.insert(userAlarmLog).values({
          alarmCsmsId: alarmId,
          userId: job.userId,
        });
      }

      // Also notify all admins in userAlarmLog
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'));
        
      if (admins.length > 0) {
        const adminAlarms = admins
          .filter(admin => admin.id !== job.userId) // avoid duplicate if admin triggered it
          .map(admin => ({
            alarmCsmsId: alarmId,
            userId: admin.id,
          }));
        if (adminAlarms.length > 0) {
          await db.insert(userAlarmLog).values(adminAlarms);
        }
      }
    }
  }

  const evaluationData = {
    type: (status === 'failed' ? 'ai_evaluation_failed' : 'ai_evaluation_complete') as 'ai_evaluation_failed' | 'ai_evaluation_complete',
    errorMessage: (payload as any).errorMessage ?? job.errorMessage ?? null,
    folderId,
    jobId,
    status,
    aiScore: folder?.aiScore ?? payload.aiScore ?? null,
    aiStatus: folder?.aiStatus ?? payload.aiStatus ?? null,
    aiReasoning: folder?.aiReasoning ?? null,
    aiProcessedAt: folder?.aiProcessedAt ?? null,
  };

  // Broadcast to the user who triggered the evaluation
  if (job.userId) {
    broadcastAlarmToUser(job.userId, evaluationData);
  }

  // Also broadcast to all admins
  broadcastToRole('admin', evaluationData);

  console.log(`[WS] Broadcasted AI evaluation result for folder ${folderId}`);
}
import { db } from '../../../db/index.ts';
import { contractFolder, contract, alarmCsmsLog } from '../../../db/schema/csms.schema.ts';
import { users, userContractors, userAlarmLog } from '../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Generate notification message based on folder status
 * Only supports 'reject' and 'revision' statuses
 */
function generateStatusMessage(folderName: string, status: string): string {
  const statusMessages: { [key: string]: string } = {
    reject: 'ditolak',
    revision: 'membutuhkan revisi',
  };
  
  const statusMessage = statusMessages[status] || status;
  return `Elemen "${folderName}" ${statusMessage}`;
}

/**
 * Send status change notification
 * Creates alarm log and user alarm notifications for rejection or revision
 * Only requires contractFolder ID
 */
export async function sendRejectRevisionNotification(
  contractFolderId: string
) {
  try {
    // Get folder details
    const folder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, contractFolderId),
    });

    if (!folder) {
      throw new Error(`Folder with ID ${contractFolderId} not found`);
    }

    // Get contract details
    const contractDetails = await db.query.contract.findFirst({
      where: eq(contract.id, folder.contractId),
    });

    if (!contractDetails) {
      throw new Error(`Contract with ID ${folder.contractId} not found`);
    }

    const folderStatus = folder.status || 'pending';
    if (folderStatus !== 'reject' && folderStatus !== 'revision') {
      throw new Error(`Cannot send notification for status: ${folderStatus}. Only 'reject' and 'revision' statuses are allowed.`);
    }

    // Generate appropriate message and title based on status
    const statusMessage = generateStatusMessage(folder.name, folderStatus);
    let alarmTitle = '';
    let alarmDescription = '';
    
    if (folderStatus === 'reject') {
      alarmTitle = 'Elemen Ditolak';
      alarmDescription = statusMessage;
    } else if (folderStatus === 'revision') {
      alarmTitle = 'Revisi Diperlukan';
      alarmDescription = statusMessage;
    }
    const [{ id: alarmId }] = await db
      .insert(alarmCsmsLog)
      .values({
        contractorId: contractDetails.contractorId,
        contractId: contractDetails.id,
        type: folderStatus === 'reject' ? 'folder_rejection' : 'revision_required',
        title: alarmTitle,
        description: alarmDescription,
        status: 'warning',
      })
      .returning({ id: alarmCsmsLog.id });

    // Get target users (contractor users with matching contractorId)
    const targetUsers = await getNotificationRecipients(
      contractDetails.contractorId
    );

    // Insert user alarm logs
    if (targetUsers.length > 0) {
      const userAlarms = targetUsers.map(userId => ({
        alarmCsmsId: alarmId,
        alarmEmployeeId: null,
        userId,
      }));

      await db.insert(userAlarmLog).values(userAlarms);
    }

    console.info(
      `Reject revision notification created for folder ${contractFolderId}`
    );

    return {
      success: true,
      alarmId,
      folderId: contractFolderId,
      contractId: contractDetails.id,
      message: statusMessage,
      status: folderStatus,
    };
  } catch (error: unknown) {
    console.error(`Error creating reject revision notification:`, error);
    if (error instanceof Error) {
      throw new Error(
        `Failed to create reject revision notification: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Get users who should receive notifications
 * Only contractor users associated with the same subcontractor as the contract
 */
export async function getNotificationRecipients(
  contractorId: string
): Promise<string[]> {
  const contractorUsers = await db
    .select({
      userId: users.id,
    })
    .from(users)
    .leftJoin(userContractors, eq(users.id, userContractors.userId))
    .where(
      eq(userContractors.contractorId, contractorId)
    );

  return contractorUsers.map(u => u.userId);
}

import { db } from "../../../db/index.ts";
import { alarmCsmsLog, approvalLog, contract, contractFolder } from "../../../db/schema/csms.schema.ts";
import { userAlarmLog } from "../../../db/schema/auth.schema.ts";
import { eq } from "drizzle-orm";
import { getNextRequiredApprovalLevel } from "./approval.service.ts";
import { getNotificationRecipients } from "./reject-revision-notification.service.ts";
import { getDefinalizeError, getReopenLogLevel, normalizeReason, REOPENED_STATUS, type DefinalizeError } from "./definalize-folder.rules.ts";

export class DefinalizeFolderError extends Error {
  code: DefinalizeError | 'invalid_reason';
  constructor(code: DefinalizeError | 'invalid_reason', message: string) {
    super(message);
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<DefinalizeError | 'invalid_reason', string> = {
  forbidden: 'Hanya admin yang dapat membuka finalisasi penilaian',
  not_found: 'Folder penilaian tidak ditemukan',
  not_root: 'Hanya folder penilaian (PSB/PB/PA) yang dapat dibuka finalisasinya',
  not_final: 'Folder penilaian belum difinalisasi',
  invalid_reason: 'Alasan wajib diisi (minimal 5 karakter)',
};

/**
 * Re-open a finalized assessment folder (admin only) so the contractor can upload again.
 * Files, scores and completion status are kept. The approval chain is not reset: a "reopened" entry is
 * logged at the level that was waiting, and finalizing again continues from that level.
 */
export async function definalizeFolder(input: { folderId: string; adminUserId: string; role: string; reason: unknown }) {
  const reason = normalizeReason(input.reason);

  const result = await db.transaction(async (tx) => {
    const folder = await tx.query.contractFolder.findFirst({ where: eq(contractFolder.id, input.folderId) });
    const error = getDefinalizeError({ role: input.role, folder });
    if (error) throw new DefinalizeFolderError(error, ERROR_MESSAGES[error]);
    if (!reason) throw new DefinalizeFolderError('invalid_reason', ERROR_MESSAGES.invalid_reason);

    await tx.update(contractFolder)
      .set({ isFinal: false, updatedAt: new Date() })
      .where(eq(contractFolder.id, input.folderId));

    const level = getReopenLogLevel(await getNextRequiredApprovalLevel(input.folderId, tx as any));
    if (level) {
      await tx.insert(approvalLog).values({
        folderId: input.folderId,
        contractId: folder!.contractId,
        userId: input.adminUserId,
        approvalLevel: level,
        status: REOPENED_STATUS,
        note: reason,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { id: folder!.id, name: folder!.name, contractId: folder!.contractId, isFinal: false as const };
  });

  // Best effort: a failed notification must not undo the re-open.
  try {
    await notifyContractor(result.contractId, result.name, reason!);
  } catch (err) {
    console.warn('[definalize] notification failed:', err);
  }

  return result;
}

async function notifyContractor(contractId: string, folderName: string, reason: string) {
  const contractRow = await db.query.contract.findFirst({ where: eq(contract.id, contractId) });
  if (!contractRow) return;

  const [{ id: alarmId }] = await db.insert(alarmCsmsLog).values({
    contractorId: contractRow.contractorId,
    contractId,
    type: 'folder_reopened',
    title: 'Penilaian Dibuka Kembali',
    description: `Penilaian "${folderName}" dibuka kembali oleh admin, silakan unggah ulang berkas yang diperlukan. Alasan: ${reason}`,
    status: 'warning',
  }).returning({ id: alarmCsmsLog.id });

  const recipients = await getNotificationRecipients(contractRow.contractorId);
  if (recipients.length > 0) {
    await db.insert(userAlarmLog).values(recipients.map((userId) => ({ alarmCsmsId: alarmId, alarmEmployeeId: null, userId })));
  }
}

/**
 * Pure rules for re-opening ("de-finalisasi") a finalized assessment folder.
 * Kept free of DB imports so they can be unit tested in isolation.
 */

export const REOPENED_STATUS = 'reopened';
export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 500;

export type DefinalizeError = 'forbidden' | 'not_found' | 'not_root' | 'not_final';

export function getDefinalizeError(input: {
  role?: string | null;
  folder?: { depth?: number | null; isFinal?: boolean | null } | null;
}): DefinalizeError | null {
  if (input.role !== 'admin') return 'forbidden';
  if (!input.folder) return 'not_found';
  if (input.folder.depth !== 0) return 'not_root';
  if (input.folder.isFinal !== true) return 'not_final';
  return null;
}

/** Trimmed reason, or null when it is too short. Longer reasons are cut to the max length. */
export function normalizeReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  if (trimmed.length < REASON_MIN_LENGTH) return null;
  return trimmed.slice(0, REASON_MAX_LENGTH);
}

/**
 * The approval chain continues where it was (no reset), so the "reopened" entry is written at the level
 * that was waiting. A fully approved folder has no waiting level: no entry, so its approvals stay intact.
 */
export function getReopenLogLevel<L extends string>(nextRequiredLevel: L | null): L | null {
  return nextRequiredLevel ?? null;
}

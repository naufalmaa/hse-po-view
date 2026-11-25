/**
 * Pure helpers for the "Catatan" popover in the folder tree. No imports, so they can be unit tested directly.
 */

export type NoteTab = 'internal' | 'contractor' | 'ai';

/** Opens on the User note, then the contractor note; the AI analysis only when it is the only content. */
export function pickDefaultNoteTab(showInternal: boolean, showContractor: boolean, showAi: boolean): NoteTab {
  if (showInternal) return 'internal';
  if (showContractor) return 'contractor';
  if (showAi) return 'ai';
  return 'internal';
}

export interface NoteAuthorLike {
  name?: string | null;
  role?: string | null;
  /** ISO timestamp */
  at?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  user: 'Auditor PHE',
  contractor: 'Kontraktor',
};

/**
 * Text of the author badge under the note label, e.g. "Kontraktor · Admin Logindo · 24 Nov 2026".
 * Notes written before authors were recorded only show the role of the tab ("Auditor PHE" / "Kontraktor").
 */
export function formatNoteAuthorBadge(kind: 'internal' | 'contractor', author: NoteAuthorLike | null | undefined): string {
  const fallback = kind === 'internal' ? 'Auditor PHE' : 'Kontraktor';
  const role = (author?.role && ROLE_LABELS[author.role]) || fallback;
  const parts = [role];
  if (author?.name) parts.push(author.name);
  if (author?.at) {
    const d = new Date(author.at);
    if (!Number.isNaN(d.getTime())) {
      parts.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }));
    }
  }
  return parts.join(' · ');
}

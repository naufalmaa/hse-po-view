/**
 * Author of a folder note (who last changed the User note / the contractor note). Pure, no DB imports.
 */

export interface NoteAuthor {
  /** null when the user no longer exists */
  name: string | null;
  role: string | null;
  /** ISO timestamp */
  at: string | null;
}

/** User ids referenced as note authors in these folders (deduplicated). */
export function collectNoteAuthorIds(folders: Array<{ noteUpdatedBy?: string | null; noteContractorUpdatedBy?: string | null }>): string[] {
  const ids = new Set<string>();
  for (const f of folders) {
    if (f.noteUpdatedBy) ids.add(f.noteUpdatedBy);
    if (f.noteContractorUpdatedBy) ids.add(f.noteContractorUpdatedBy);
  }
  return [...ids];
}

/** Author shown in the Catatan panel; null for notes written before authors were recorded. */
export function noteAuthorOf(
  by: string | null | undefined,
  at: Date | string | null | undefined,
  users: Map<string, { name: string | null; role: string | null }>,
): NoteAuthor | null {
  if (!by && !at) return null;
  const user = by ? users.get(by) : undefined;
  const iso = at ? new Date(at).toISOString() : null;
  return { name: user?.name ?? null, role: user?.role ?? null, at: iso };
}

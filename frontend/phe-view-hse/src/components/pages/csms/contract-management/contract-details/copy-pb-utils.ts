/**
 * Pure helpers for copying an assessment (PB) to another period. No imports, so they can be unit tested directly.
 */

export interface CopyFolderLike {
  id: string;
  name: string;
  fileType?: string;
  score?: number | string | null;
  isFinal?: boolean | null;
  note?: string | null;
  noteContractor?: string | null;
  children?: CopyFolderLike[];
}

export interface CategoryOption {
  number: number;
  name: string;
  score: number | null;
}

const CATEGORY_RE = /^([1-8])\s/;
const COPY_TARGET_SUFFIXES = [' - PB', ' - PA', ' - PSB'];

export const isCopyTarget = (name: string) => COPY_TARGET_SUFFIXES.some((s) => name.endsWith(s));

/** Categories 1..8 of an assessment folder (under "A. RENCANA K3LL", or directly under it), with their score. */
export function getCategoryOptions(root: CopyFolderLike | null | undefined): CategoryOption[] {
  const children = (root?.children ?? []).filter((c) => c.fileType === 'folder');
  const rencana = children.find((c) => c.name === 'A. RENCANA K3LL');
  const pool = (rencana?.children ?? children).filter((c) => c.fileType === 'folder');
  const options: CategoryOption[] = [];
  for (const c of pool) {
    const m = CATEGORY_RE.exec(c.name);
    if (!m) continue;
    const parsed = c.score === undefined || c.score === null ? NaN : parseFloat(String(c.score));
    options.push({ number: Number(m[1]), name: c.name, score: Number.isNaN(parsed) ? null : parsed });
  }
  return options.sort((a, b) => a.number - b.number);
}

/** Number of files anywhere under a folder. */
export function countFiles(node: CopyFolderLike | null | undefined): number {
  if (!node?.children) return 0;
  return node.children.reduce((n, c) => n + (c.fileType === 'file' ? 1 : countFiles(c)), 0);
}

/** Every other period the source can be copied to, in list order. */
export function getCopyTargets<T extends CopyFolderLike>(folders: T[], sourceId: string): T[] {
  return folders.filter((f) => f.id !== sourceId && isCopyTarget(f.name));
}

/** The neighbour period in the list (the default target of "copy to previous / next"). */
export function getNeighbourTarget<T extends CopyFolderLike>(folders: T[], sourceId: string, direction: 'prev' | 'next'): T | null {
  const index = folders.findIndex((f) => f.id === sourceId);
  if (index === -1) return null;
  const step = direction === 'prev' ? -1 : 1;
  for (let i = index + step; i >= 0 && i < folders.length; i += step) {
    if (isCopyTarget(folders[i].name)) return folders[i];
  }
  return null;
}

/** What is copied besides the files (each one for the chosen categories). */
export interface CopyChoices {
  /** score and status */
  scores: boolean;
  /** User note (tab "User") */
  userNotes: boolean;
  /** contractor note (tab "Kontraktor") */
  contractorNotes: boolean;
}

export const DEFAULT_COPY_CHOICES: CopyChoices = { scores: true, userNotes: true, contractorNotes: true };

export const copiesAnyValues = (c: CopyChoices) => c.scores || c.userNotes || c.contractorNotes;

export interface CopyPayload {
  sourceFolderId: string;
  targetFolderId: string;
  copyScores: boolean;
  copyUserNotes: boolean;
  copyContractorNotes: boolean;
  categoryNumbers?: number[];
}

/** categoryNumbers is only sent for a partial selection; all categories (or files only) send none. */
export function buildCopyPayload(input: {
  sourceFolderId: string;
  targetFolderId: string;
  choices: CopyChoices;
  selected: number[];
  available: number[];
}): CopyPayload {
  const { choices } = input;
  const payload: CopyPayload = {
    sourceFolderId: input.sourceFolderId,
    targetFolderId: input.targetFolderId,
    copyScores: choices.scores,
    copyUserNotes: choices.userNotes,
    copyContractorNotes: choices.contractorNotes,
  };
  if (!copiesAnyValues(choices)) return payload;
  const selected = [...new Set(input.selected)].sort((a, b) => a - b);
  const isAll = input.available.length > 0 && input.available.every((n) => selected.includes(n));
  if (!isAll) payload.categoryNumbers = selected;
  return payload;
}

export function getCopyButtonLabel(choices: CopyChoices, selectedCount: number, availableCount: number): string {
  const what = [choices.scores ? 'skor' : null, choices.userNotes || choices.contractorNotes ? 'catatan' : null].filter(Boolean).join(' & ');
  if (!what) return 'Salin berkas saja';
  if (availableCount === 0 || selectedCount >= availableCount) return `Salin berkas + ${what} semua kategori`;
  return `Salin berkas + ${what} ${selectedCount} kategori`;
}

const ELEMENT_RE = /^([1-8](?:\.\d+)?)\s/;
const hasText = (s: string | null | undefined) => typeof s === 'string' && s.trim().length > 0;

/** Elements (1..8, x.y) of an assessment folder by number, wherever they are (with or without "A. RENCANA K3LL"). */
function elementsByNumber(root: CopyFolderLike | null | undefined): Map<string, CopyFolderLike> {
  const out = new Map<string, CopyFolderLike>();
  const walk = (node: CopyFolderLike) => {
    for (const c of node.children ?? []) {
      if (c.fileType !== 'folder') continue;
      const m = ELEMENT_RE.exec(c.name);
      if (m && !out.has(m[1])) out.set(m[1], c);
      walk(c);
    }
  };
  if (root) walk(root);
  return out;
}

/**
 * Number of elements in the target whose note will be replaced: in a chosen category, the note type is copied,
 * the source has a (different) note of that type and the target already has one.
 */
export function countNotesToOverwrite(
  source: CopyFolderLike | null | undefined,
  target: CopyFolderLike | null | undefined,
  choices: CopyChoices,
  selected: number[],
): number {
  if (!choices.userNotes && !choices.contractorNotes) return 0;
  const src = elementsByNumber(source);
  const chosen = new Set(selected);
  let count = 0;
  for (const [num, t] of elementsByNumber(target)) {
    if (!chosen.has(Number(num.split('.')[0]))) continue;
    const s = src.get(num);
    if (!s) continue;
    const replacesUser = choices.userNotes && hasText(s.note) && hasText(t.note) && s.note!.trim() !== t.note!.trim();
    const replacesContractor = choices.contractorNotes && hasText(s.noteContractor) && hasText(t.noteContractor)
      && s.noteContractor!.trim() !== t.noteContractor!.trim();
    if (replacesUser || replacesContractor) count++;
  }
  return count;
}

/**
 * Pure rules for drag & drop upload into the folder tree. No imports, so they can be unit tested directly.
 * Limits match the upload form (templates/upload-file-template.ts).
 */

export const DROP_MAX_FILES = 25;
export const DROP_MAX_FILE_SIZE = 100 * 1024 * 1024;
export const DROP_MAX_TOTAL_SIZE = 100 * 1024 * 1024;

/** "A. RENCANA K3LL" and categories 3..8 only group sub-elements: files belong in a sub-element (3.1, 4.2 ...). */
export const isUploadBlockedFolderName = (name: string): boolean => name === 'A. RENCANA K3LL' || /^[3-8]\s/.test(name);

export type DropTargetState = 'ok' | 'final' | 'parent';

export function getDropTargetState(node: { name: string; fileType?: string }, isFinal: boolean): DropTargetState | null {
  if (node.fileType !== 'folder') return null;
  if (isFinal) return 'final';
  if (isUploadBlockedFolderName(node.name)) return 'parent';
  return 'ok';
}

export function getDropBlockedMessage(state: DropTargetState, folderName: string): string {
  if (state === 'final') return 'Penilaian ini sudah difinalisasi, berkas tidak bisa ditambahkan.';
  return `"${folderName}" hanya berisi sub-elemen. Lepaskan berkas di sub-elemennya (mis. 3.1).`;
}

export interface DroppedFileLike {
  name: string;
  size: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Blocking errors (limits) and non-blocking warnings (a file with the same name already in the folder). */
export function validateDroppedFiles(files: DroppedFileLike[], existingNames: string[]): { errors: string[]; duplicates: string[] } {
  const errors: string[] = [];
  if (files.length === 0) errors.push('Tidak ada berkas yang dilepaskan.');
  if (files.length > DROP_MAX_FILES) errors.push(`Maksimal ${DROP_MAX_FILES} berkas sekali unggah (dilepaskan ${files.length}).`);
  const tooBig = files.filter((f) => f.size > DROP_MAX_FILE_SIZE).map((f) => f.name);
  if (tooBig.length > 0) errors.push(`Melebihi ${formatBytes(DROP_MAX_FILE_SIZE)} per berkas: ${tooBig.join(', ')}`);
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > DROP_MAX_TOTAL_SIZE) errors.push(`Total ukuran ${formatBytes(total)} melebihi ${formatBytes(DROP_MAX_TOTAL_SIZE)}.`);
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const duplicates = files.filter((f) => existing.has(f.name.toLowerCase())).map((f) => f.name);
  return { errors, duplicates };
}

export function getDropConfirmTitle(fileNames: string[], folderName: string): string {
  const what = fileNames.length === 1 ? `"${fileNames[0]}"` : `${fileNames.length} berkas`;
  return `Tambahkan ${what} ke folder "${folderName}"?`;
}

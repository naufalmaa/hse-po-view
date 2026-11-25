/**
 * Pure rules for the "Catatan Perbaikan" (Form Monitoring Tindak Lanjut) PDF. No DB imports (unit tested).
 */

/** Element number of a K3LL folder: "1 Kepemimpinan…" -> "1", "3.1 Struktur…" -> "3.1"; null for anything else. */
export function elementNumberOf(name: string | null | undefined): string | null {
  const m = /^([1-8](?:\.\d+)?)\s/.exec(name ?? '');
  return m ? m[1] : null;
}

/** Folders the PDF can list: "A. RENCANA K3LL" and every numbered element (1-8, x.y), also custom-named ones. */
export function isExportableK3LLFolder(name: string | null | undefined): boolean {
  return name === 'A. RENCANA K3LL' || elementNumberOf(name) !== null;
}

/**
 * Text of the "Deskripsi ketidaksesuaian" cell: the User note (PHE) first, then the contractor note,
 * separated by a blank line, without labels. Empty parts are skipped; "" when both are empty.
 */
export function buildDeskripsi(note: string | null | undefined, noteContractor: string | null | undefined): string {
  return [note, noteContractor]
    .map((s) => (s ?? '').replace(/\r\n/g, '\n').trim())
    .filter((s) => s.length > 0)
    .join('\n\n');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML of a note cell, same look as before (one block per line starting with "-", each prefixed with "- "),
 * but escaped and with the line breaks kept ("1. … 2. …" no longer run together).
 */
export function formatNoteCellHtml(content: string | null | undefined): string {
  const text = (content ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) return '-';
  const items = text.split(/\n(?=-)/).map((item) => item.trim()).filter((item) => item.length > 0);
  if (items.length === 0) return '-';
  return items
    .map((item) => {
      const cleanItem = item.startsWith('-') ? item : `- ${item}`;
      return `<div style="margin-bottom: 8px;">${escapeHtml(cleanItem).replace(/\n/g, '<br>')}</div>`;
    })
    .join('');
}

/**
 * One row per element number. When a period holds the same number twice (e.g. a second tree created by an old
 * copy between periods with a different structure), keep the one under "A. RENCANA K3LL", else the first.
 */
export function dedupeByElementNumber<T extends { folderName: string; underRencana?: boolean }>(items: T[]): T[] {
  const chosen = new Map<string, T>();
  const order: string[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const num = elementNumberOf(item.folderName);
    if (num === null) { rest.push(item); continue; }
    const current = chosen.get(num);
    if (!current) { chosen.set(num, item); order.push(num); continue; }
    if (!current.underRencana && item.underRencana) chosen.set(num, item);
  }
  return [...order.map((n) => chosen.get(n)!), ...rest];
}

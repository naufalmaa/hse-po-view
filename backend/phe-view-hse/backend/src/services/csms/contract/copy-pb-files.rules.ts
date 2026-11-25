/**
 * Pure rules for copying a PB assessment to another period. No DB imports (unit tested in isolation).
 */

export const CATEGORY_NAME_RE = /^([1-8])\s/;

export function categoryNumberOf(name: string | null | undefined): number | null {
  const m = CATEGORY_NAME_RE.exec(name ?? '');
  return m ? Number(m[1]) : null;
}

export interface CopyOptions {
  /** score and status of the chosen categories */
  copyScores: boolean;
  /** User note (note) of the chosen categories */
  copyUserNotes: boolean;
  /** contractor note (note_contractor) of the chosen categories */
  copyContractorNotes: boolean;
  /** null = every category */
  categoryNumbers: number[] | null;
}

export type CopyOptionsInput = {
  copyScores?: boolean;
  copyUserNotes?: boolean;
  copyContractorNotes?: boolean;
  categoryNumbers?: number[] | null;
};

/** Every option defaults to true (a request without them behaves as before, plus the contractor note); an empty or missing list means all categories. */
export function resolveCopyOptions(body: CopyOptionsInput): CopyOptions {
  const nums = Array.isArray(body.categoryNumbers)
    ? [...new Set(body.categoryNumbers.filter((n) => Number.isInteger(n) && n >= 1 && n <= 8))].sort((a, b) => a - b)
    : [];
  return {
    copyScores: body.copyScores !== false,
    copyUserNotes: body.copyUserNotes !== false,
    copyContractorNotes: body.copyContractorNotes !== false,
    categoryNumbers: nums.length > 0 ? nums : null,
  };
}

/** Whether any evaluator value is copied at all (otherwise only the files are copied). */
export const copiesAnyValues = (o: CopyOptions) => o.copyScores || o.copyUserNotes || o.copyContractorNotes;

const hasText = (s: string | null | undefined) => typeof s === 'string' && s.trim().length > 0;

/**
 * Values written to a target element when copying from a source element (category or sub-element):
 * score + status when copyScores; each note (with who/when wrote it) only when its option is on AND the
 * source note has text, so an empty source never wipes a note already written in the target.
 * Returns null when there is nothing to write.
 */
export function assessmentUpdateOf(
  source: {
    score?: string | null; status?: string | null;
    note?: string | null; noteUpdatedBy?: string | null; noteUpdatedAt?: Date | string | null;
    noteContractor?: string | null; noteContractorUpdatedBy?: string | null; noteContractorUpdatedAt?: Date | string | null;
  },
  o: Pick<CopyOptions, 'copyScores' | 'copyUserNotes' | 'copyContractorNotes'>,
): Record<string, unknown> | null {
  const set: Record<string, unknown> = {};
  if (o.copyScores) {
    set.score = source.score;
    set.status = source.status;
  }
  if (o.copyUserNotes && hasText(source.note)) {
    set.note = source.note;
    set.noteUpdatedBy = source.noteUpdatedBy ?? null;
    set.noteUpdatedAt = source.noteUpdatedAt ?? null;
  }
  if (o.copyContractorNotes && hasText(source.noteContractor)) {
    set.noteContractor = source.noteContractor;
    set.noteContractorUpdatedBy = source.noteContractorUpdatedBy ?? null;
    set.noteContractorUpdatedAt = source.noteContractorUpdatedAt ?? null;
  }
  return Object.keys(set).length > 0 ? set : null;
}

/**
 * Category folders ("1 ..." to "8 ...") live under "A. RENCANA K3LL" or directly under the assessment folder.
 */
export function findCategoryFolders<T extends { id: string; name: string; parentId?: string | null; fileType?: string | null }>(
  rootId: string,
  folders: T[],
): T[] {
  const rootChildren = folders.filter((f) => f.parentId === rootId && f.fileType === 'folder');
  const rencana = rootChildren.find((f) => f.name === 'A. RENCANA K3LL');
  const pool = rencana ? folders.filter((f) => f.parentId === rencana.id && f.fileType === 'folder') : rootChildren;
  return pool.filter((f) => categoryNumberOf(f.name) !== null);
}

/**
 * Pair source and target categories by their leading number (not the full name, so "–" vs "-" does not matter).
 * Categories missing on either side are skipped.
 */
export function pickCategoryPairs<T extends { name: string }>(
  sourceCategories: T[],
  targetCategories: T[],
  categoryNumbers: number[] | null,
): Array<{ number: number; source: T; target: T }> {
  const targetByNumber = new Map<number, T>();
  for (const t of targetCategories) {
    const n = categoryNumberOf(t.name);
    if (n !== null && !targetByNumber.has(n)) targetByNumber.set(n, t);
  }
  const wanted = categoryNumbers ? new Set(categoryNumbers) : null;
  const pairs: Array<{ number: number; source: T; target: T }> = [];
  for (const s of sourceCategories) {
    const n = categoryNumberOf(s.name);
    if (n === null || (wanted && !wanted.has(n))) continue;
    const target = targetByNumber.get(n);
    if (target) pairs.push({ number: n, source: s, target });
  }
  return pairs.sort((a, b) => a.number - b.number);
}

// ---------------------------------------------------------------------------
// Bulk copy planning (in memory). Mirrors the old per-file logic of copy-pb-files.service.ts
// (findOrCreateMatchingFolderStructure, getDepth0FolderId, isCopy aggregation) without a query per file.
// ---------------------------------------------------------------------------

export interface CopyRow {
  id: string;
  parentId: string | null;
  name: string;
  fileType: string | null;
  path: string | null;
  depth?: number | null;
  description?: string | null;
  filePath?: string | null;
  isCopy?: number | null;
  isComplete?: boolean | null;
  isFinal?: boolean | null;
}

export function indexByParent<T extends { parentId: string | null }>(rows: T[]): Map<string, T[]> {
  const byParent = new Map<string, T[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const list = byParent.get(r.parentId);
    if (list) list.push(r);
    else byParent.set(r.parentId, [r]);
  }
  return byParent;
}

/** All files under rootId (depth-first, same walk as the old getAllFilesFromFolder). */
export function collectFiles<T extends { id: string; fileType: string | null }>(rootId: string, byParent: Map<string, T[]>): T[] {
  const files: T[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const child of byParent.get(id) ?? []) {
      if (child.fileType === 'file') files.push(child);
      else if (child.fileType === 'folder') walk(child.id);
    }
  };
  walk(rootId);
  return files;
}

/** In-memory version of getDepth0FolderId: walk up while depth > 0; a missing parent stops at the current folder. */
export function depth0IdOf<T extends { id: string; parentId: string | null; depth?: number | null }>(id: string, byId: Map<string, T>): string {
  let current = byId.get(id);
  if (!current) return id;
  const seen = new Set<string>();
  while (current.depth != null && current.depth > 0 && current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) return current.id;
    current = parent;
  }
  return current.id;
}

/** Folder chain from just below rootId down to folderId (empty when folderId is the root, null when not under it). */
export function chainBelowRoot<T extends { id: string; parentId: string | null }>(folderId: string, rootId: string, byId: Map<string, T>): T[] | null {
  const chain: T[] = [];
  let id: string | null = folderId;
  const seen = new Set<string>();
  while (id && id !== rootId) {
    if (seen.has(id)) return null;
    seen.add(id);
    const row = byId.get(id);
    if (!row) return null;
    chain.unshift(row);
    id = row.parentId;
  }
  return id === rootId ? chain : null;
}

const RENCANA = 'A. RENCANA K3LL';

/** K3LL element number: "1 Kepemimpinan…" -> "1", "3.1 Struktur…" -> "3.1"; null otherwise. */
export function elementNumberOf(name: string | null | undefined): string | null {
  const m = /^([1-8](?:\.\d+)?)\s/.exec(name ?? '');
  return m ? m[1] : null;
}

export interface NewFolderPlan { id: string; parentId: string; name: string; description: string; path: string }
export interface NewFilePlan<T> { source: T; newId: string; targetParentId: string; path: string }

/**
 * Plan the copy of every file under sourceRootId into targetRootId:
 * folders are matched by name under the target (first match wins, like findFirst), missing ones are created
 * (parent first), and each file gets a new id and an ltree path under its target parent.
 */
export function planCopy<T extends CopyRow>(args: {
  sourceRootId: string;
  targetRootId: string;
  sourceRows: T[];
  targetRows: T[];
  newId: () => string;
}): { foldersToCreate: NewFolderPlan[]; files: Array<NewFilePlan<T>>; targetDepth0Id: string } {
  const { sourceRootId, targetRootId, sourceRows, targetRows, newId } = args;
  const sourceById = new Map(sourceRows.map((r) => [r.id, r]));
  const sourceByParent = indexByParent(sourceRows);
  const targetById = new Map(targetRows.map((r) => [r.id, r]));
  const targetDepth0Id = depth0IdOf(targetRootId, targetById);

  // target folders by parent + name (folders only, first one wins)
  const targetChildFolder = new Map<string, string>();
  const pathOf = new Map<string, string>();
  for (const r of targetRows) {
    pathOf.set(r.id, r.path ?? '');
    if (r.fileType === 'folder' && r.parentId) {
      const key = `${r.parentId}/${r.name}`;
      if (!targetChildFolder.has(key)) targetChildFolder.set(key, r.id);
    }
  }

  // K3LL elements of the target by number (1-8, x.y), wherever they are: some periods keep them under
  // "A. RENCANA K3LL", others directly under the root. Prefer the one under A. RENCANA K3LL, then the shallowest.
  const targetElementByNumber = new Map<string, { id: string; underRencana: boolean; level: number }>();
  for (const r of targetRows) {
    const num = r.fileType === 'folder' ? elementNumberOf(r.name) : null;
    if (!num) continue;
    const chain = chainBelowRoot(r.id, targetRootId, targetById);
    if (!chain || !chain.slice(0, -1).every((f) => f.name === RENCANA || elementNumberOf(f.name) !== null)) continue;
    const candidate = { id: r.id, underRencana: chain.some((f) => f.name === RENCANA), level: chain.length };
    const current = targetElementByNumber.get(num);
    if (!current || (candidate.underRencana && !current.underRencana) || (candidate.underRencana === current.underRencana && candidate.level < current.level)) {
      targetElementByNumber.set(num, candidate);
    }
  }

  const foldersToCreate: NewFolderPlan[] = [];
  const mappedFolder = new Map<string, string>([[sourceRootId, targetRootId]]);

  const mapFolder = (sourceFolderId: string): string => {
    const cached = mappedFolder.get(sourceFolderId);
    if (cached) return cached;
    const fullChain = chainBelowRoot(sourceFolderId, sourceRootId, sourceById);
    if (!fullChain) return targetRootId;
    // Jump to the deepest K3LL element of the chain that exists in the target (matched by number, so a different
    // structure does not create a second tree); the folders below it are matched by name as before.
    let start = 0;
    let current = targetRootId;
    for (let i = 0; i < fullChain.length; i++) {
      const name = fullChain[i].name;
      const num = elementNumberOf(name);
      if (name !== RENCANA && num === null) break; // only the K3LL prefix of the chain
      const hit = num ? targetElementByNumber.get(num) : undefined;
      if (hit) { start = i + 1; current = hit.id; mappedFolder.set(fullChain[i].id, hit.id); }
    }
    const chain = fullChain.slice(start);
    for (const folder of chain) {
      const known = mappedFolder.get(folder.id);
      if (known) { current = known; continue; }
      const key = `${current}/${folder.name}`;
      let next = targetChildFolder.get(key);
      if (!next) {
        next = newId();
        const parentPath = pathOf.get(current) ?? '';
        const path = parentPath.length > 0 ? `${parentPath}.${next}` : next;
        foldersToCreate.push({ id: next, parentId: current, name: folder.name, description: folder.description || '', path });
        targetChildFolder.set(key, next);
        pathOf.set(next, path);
      }
      mappedFolder.set(folder.id, next);
      current = next;
    }
    return current;
  };

  const files: Array<NewFilePlan<T>> = [];
  for (const file of collectFiles(sourceRootId, sourceByParent)) {
    const targetParentId = file.parentId ? mapFolder(file.parentId) : targetRootId;
    const id = newId();
    const parentPath = pathOf.get(targetParentId) ?? '';
    const path = parentPath.length > 0 ? `${parentPath}.${id}` : `${targetDepth0Id}.${id}`;
    files.push({ source: file, newId: id, targetParentId, path });
  }
  return { foldersToCreate, files, targetDepth0Id };
}

/** isCopy of a folder from its children: any 0 (or null) -> 0, else any 2 -> 2, else all 1 -> 1. Null when there are no children. */
export function aggregateIsCopy(children: Array<{ isCopy?: number | null }>): number | null {
  if (children.length === 0) return null;
  if (children.some((c) => (c.isCopy ?? 0) === 0)) return 0;
  if (children.some((c) => (c.isCopy ?? 0) === 2)) return 2;
  if (children.every((c) => (c.isCopy ?? 0) === 1)) return 1;
  return 0;
}

export const isAssessmentFolderName = (name: string) => name.endsWith(' - PB') || name.endsWith(' - PA') || name.endsWith(' - PSB');
export const isK3LLFolderName = (name: string) => name === 'A. RENCANA K3LL' || /^([1-8])\s/.test(name) || /^([1-8])\.(\d+)/.test(name);

export interface CompletionRules {
  isFolderStructureComplete: (folderId: string, items: any[]) => Promise<boolean>;
  isK3LLFolderComplete: (folderId: string, items: any[]) => Promise<boolean>;
  folderHasFile: (folderId: string, items: any[]) => Promise<boolean>;
}

/**
 * Recompute isComplete and isCopy once, bottom-up, for every folder that received a copied file (directly or below it)
 * and all of their ancestors. Same rules as the old per-file updates:
 *  - folder that directly holds copied files: PA -> true; PB/PSB and K3LL names -> isFolderStructureComplete; other -> true
 *  - ancestor: PB/PA/PSB -> isFolderStructureComplete; K3LL names -> isK3LLFolderComplete; other -> folderHasFile
 *  - isCopy -> aggregateIsCopy(children), unchanged when there are no children
 * `items` (every row of the contract after the copy) is updated in place; returns the new values per folder id.
 */
export async function recomputeFolderStatuses(
  items: CopyRow[],
  directParentIds: Set<string>,
  rules: CompletionRules,
): Promise<Map<string, { isComplete: boolean; isCopy: number | null }>> {
  const byId = new Map(items.map((r) => [r.id, r]));
  const byParent = indexByParent(items);

  const touched = new Set<string>();
  for (const id of directParentIds) {
    let cur: string | null = id;
    while (cur && !touched.has(cur) && byId.has(cur)) {
      touched.add(cur);
      cur = byId.get(cur)!.parentId;
    }
  }

  const levelOf = (id: string) => {
    let n = 0;
    let cur = byId.get(id);
    const seen = new Set<string>();
    while (cur?.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) { seen.add(cur.id); n++; cur = byId.get(cur.parentId); }
    return n;
  };
  const order = [...touched].map((id) => ({ id, level: levelOf(id) })).sort((a, b) => b.level - a.level);

  const result = new Map<string, { isComplete: boolean; isCopy: number | null }>();
  for (const { id } of order) {
    const folder = byId.get(id)!;
    let isComplete: boolean;
    if (directParentIds.has(id)) {
      if (folder.name.endsWith(' - PA')) isComplete = true;
      else if (isAssessmentFolderName(folder.name) || isK3LLFolderName(folder.name)) isComplete = await rules.isFolderStructureComplete(id, items);
      else isComplete = true;
    } else if (isAssessmentFolderName(folder.name)) {
      isComplete = await rules.isFolderStructureComplete(id, items);
    } else if (isK3LLFolderName(folder.name)) {
      isComplete = await rules.isK3LLFolderComplete(id, items);
    } else {
      isComplete = await rules.folderHasFile(id, items);
    }
    folder.isComplete = isComplete;
    const isCopy = aggregateIsCopy(byParent.get(id) ?? []);
    if (isCopy !== null) folder.isCopy = isCopy;
    result.set(id, { isComplete, isCopy });
  }
  return result;
}

/** Run fn over items with at most `limit` running at once; results keep the input order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

/** Copying into itself or into/out of its own subtree would delete the source files. */
export function getNestingError<T extends { id: string; parentId: string | null }>(sourceId: string, targetId: string, byId: Map<string, T>): string | null {
  if (sourceId === targetId) return 'Folder sumber dan tujuan tidak boleh sama';
  if (chainBelowRoot(targetId, sourceId, byId) || chainBelowRoot(sourceId, targetId, byId)) {
    return 'Folder tujuan tidak boleh berada di dalam folder sumber (atau sebaliknya)';
  }
  return null;
}

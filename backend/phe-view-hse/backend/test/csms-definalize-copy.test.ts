import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, test } from 'node:test';
import { getDefinalizeError, getReopenLogLevel, normalizeReason } from '../src/services/csms/contract/definalize-folder.rules.ts';
import {
  aggregateIsCopy,
  categoryNumberOf,
  collectFiles,
  depth0IdOf,
  findCategoryFolders,
  getNestingError,
  indexByParent,
  mapWithConcurrency,
  pickCategoryPairs,
  planCopy,
  recomputeFolderStatuses,
  resolveCopyOptions,
  assessmentUpdateOf,
  copiesAnyValues,
} from '../src/services/csms/contract/copy-pb-files.rules.ts';
import { collectNoteAuthorIds, noteAuthorOf } from '../src/services/csms/contract/note-author.rules.ts';
import { createCopyJobStore } from '../src/services/csms/contract/copy-pb-jobs.ts';
import { buildDeskripsi, dedupeByElementNumber, elementNumberOf, formatNoteCellHtml, isExportableK3LLFolder } from '../src/services/csms/contract/export-catatan-perbaikan.rules.ts';

describe('de-finalisasi', () => {
  const finalRoot = { depth: 0, isFinal: true };

  test('admin can re-open a finalized assessment folder', () => {
    strictEqual(getDefinalizeError({ role: 'admin', folder: finalRoot }), null);
  });
  test('non-admin roles are refused', () => {
    for (const role of ['user', 'contractor', 'evaluator', 'manager', undefined]) {
      strictEqual(getDefinalizeError({ role, folder: finalRoot }), 'forbidden');
    }
  });
  test('missing, non-root and not-final folders are refused', () => {
    strictEqual(getDefinalizeError({ role: 'admin', folder: null }), 'not_found');
    strictEqual(getDefinalizeError({ role: 'admin', folder: { depth: 2, isFinal: true } }), 'not_root');
    strictEqual(getDefinalizeError({ role: 'admin', folder: { depth: 0, isFinal: false } }), 'not_final');
    strictEqual(getDefinalizeError({ role: 'admin', folder: { depth: 0, isFinal: null } }), 'not_final');
  });
  test('reason is required (min 5 chars) and trimmed', () => {
    strictEqual(normalizeReason('  ab  '), null);
    strictEqual(normalizeReason(undefined), null);
    strictEqual(normalizeReason('  Dokumen 4.2 salah unggah '), 'Dokumen 4.2 salah unggah');
    strictEqual(normalizeReason('x'.repeat(900))?.length, 500);
  });
  test('approval chain continues: reopened entry at the waiting level, none when fully approved', () => {
    strictEqual(getReopenLogLevel('verifikator'), 'verifikator');
    strictEqual(getReopenLogLevel(null), null);
  });
});

describe('salin PB dengan skor per kategori', () => {
  const cats = (prefix: string, names: string[]) => names.map((name, i) => ({ id: `${prefix}${i + 1}`, name }));
  const source = cats('s', ['1 Kepemimpinan dan Komitmen', '2 Kebijakan dan Sasaran Strategis K3LL', '8 Manajemen K3LL – Pencapaian Lainnya']);
  const target = cats('t', ['1 Kepemimpinan dan Komitmen', '2 Kebijakan dan Sasaran Strategis K3LL', '8 Manajemen K3LL - Pencapaian Lainnya']);

  test('options default to copying all category scores (old behaviour)', () => {
    deepStrictEqual(resolveCopyOptions({}), { copyScores: true, copyUserNotes: true, copyContractorNotes: true, categoryNumbers: null });
    deepStrictEqual(resolveCopyOptions({ copyScores: true, categoryNumbers: [] }), { copyScores: true, copyUserNotes: true, copyContractorNotes: true, categoryNumbers: null });
  });
  test('files only, and invalid/duplicate category numbers are dropped', () => {
    deepStrictEqual(resolveCopyOptions({ copyScores: false }), { copyScores: false, copyUserNotes: true, copyContractorNotes: true, categoryNumbers: null });
    deepStrictEqual(resolveCopyOptions({ categoryNumbers: [5, 2, 2, 9, 0] }), { copyScores: true, copyUserNotes: true, copyContractorNotes: true, categoryNumbers: [2, 5] });
  });
  test('categories pair by number, so "–" vs "-" still matches', () => {
    deepStrictEqual(pickCategoryPairs(source, target, null).map((p) => [p.number, p.source.id, p.target.id]), [[1, 's1', 't1'], [2, 's2', 't2'], [8, 's3', 't3']]);
  });
  test('only the chosen categories are paired', () => {
    deepStrictEqual(pickCategoryPairs(source, target, [2]).map((p) => p.number), [2]);
  });
  test('a category missing in the target is skipped', () => {
    deepStrictEqual(pickCategoryPairs(source, target.slice(0, 1), null).map((p) => p.number), [1]);
  });
  test('category folders are found under A. RENCANA K3LL or directly under the assessment folder', () => {
    const tree = [
      { id: 'a', parentId: 'root', name: 'A. RENCANA K3LL', fileType: 'folder' },
      { id: 'b', parentId: 'root', name: 'B. LAINNYA', fileType: 'folder' },
      { id: 'c1', parentId: 'a', name: '1 Kepemimpinan dan Komitmen', fileType: 'folder' },
      { id: 'c3', parentId: 'a', name: '3 Organisasi', fileType: 'folder' },
      { id: 'f', parentId: 'a', name: '1 bukti.pdf', fileType: 'file' },
    ];
    deepStrictEqual(findCategoryFolders('root', tree).map((f) => f.id), ['c1', 'c3']);
    const flat = [{ id: 'c2', parentId: 'root2', name: '2 Kebijakan', fileType: 'folder' }];
    deepStrictEqual(findCategoryFolders('root2', flat).map((f) => f.id), ['c2']);
    strictEqual(categoryNumberOf('3.1 Sub elemen'), null);
  });
});

describe('salin PB massal (tanpa query per berkas)', () => {
  // source: S - PB / A. RENCANA K3LL / 1 Kepemimpinan / 1.1 Sub / f1, f2 ; S / A / 3 Organisasi / f3 ; S / f0
  const row = (id: string, parentId: string | null, name: string, fileType: string, path: string, extra: Record<string, unknown> = {}) =>
    ({ id, parentId, name, fileType, path, depth: path.split('.').length - 1, description: `${name} desc`, filePath: fileType === 'file' ? `${name}` : null, ...extra });
  const source = [
    row('S', null, 'P1 - PB', 'folder', 'S'),
    row('SA', 'S', 'A. RENCANA K3LL', 'folder', 'S.SA'),
    row('S1', 'SA', '1 Kepemimpinan', 'folder', 'S.SA.S1'),
    row('S11', 'S1', '1.1 Sub', 'folder', 'S.SA.S1.S11'),
    row('f1', 'S11', 'a.pdf', 'file', 'S.SA.S1.S11.f1'),
    row('f2', 'S11', 'b.pdf', 'file', 'S.SA.S1.S11.f2'),
    row('S3', 'SA', '3 Organisasi', 'folder', 'S.SA.S3'),
    row('f3', 'S3', 'c.pdf', 'file', 'S.SA.S3.f3'),
    row('f0', 'S', 'root.pdf', 'file', 'S.f0'),
  ];
  // target already has A. RENCANA K3LL / 1 Kepemimpinan (no 1.1, no 3) and one old file
  const target = [
    row('T', null, 'P2 - PB', 'folder', 'T'),
    row('TA', 'T', 'A. RENCANA K3LL', 'folder', 'T.TA'),
    row('T1', 'TA', '1 Kepemimpinan', 'folder', 'T.TA.T1'),
    row('old', 'T1', 'old.pdf', 'file', 'T.TA.T1.old'),
  ];
  const ids = () => { let n = 0; return () => `n${++n}`; };

  test('files are collected depth-first and depth0 walks up to the root', () => {
    deepStrictEqual(collectFiles('S', indexByParent(source)).map((f) => f.id).sort(), ['f0', 'f1', 'f2', 'f3']);
    const byId = new Map(source.map((r) => [r.id, r]));
    strictEqual(depth0IdOf('S11', byId), 'S');
    strictEqual(depth0IdOf('S', byId), 'S');
    strictEqual(depth0IdOf('unknown', byId), 'unknown');
  });

  test('existing target folders are matched by name, missing ones created parent-first with valid paths', () => {
    const plan = planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: source, targetRows: target, newId: ids() });
    // 1.1 Sub under existing T1, 3 Organisasi under existing TA; nothing for A. RENCANA K3LL or 1 Kepemimpinan
    deepStrictEqual(plan.foldersToCreate.map((f) => [f.name, f.parentId]).sort(), [['1.1 Sub', 'T1'], ['3 Organisasi', 'TA']]);
    for (const f of plan.foldersToCreate) {
      const parentPath = f.parentId === 'T1' ? 'T.TA.T1' : 'T.TA';
      strictEqual(f.path, `${parentPath}.${f.id}`);
    }
    const sub = plan.foldersToCreate.find((f) => f.name === '1.1 Sub')!;
    const byFile = new Map(plan.files.map((f) => [f.source.id, f]));
    strictEqual(byFile.get('f1')!.targetParentId, sub.id);
    strictEqual(byFile.get('f2')!.targetParentId, sub.id); // folder created once for both files
    strictEqual(byFile.get('f0')!.targetParentId, 'T');
    strictEqual(byFile.get('f1')!.path, `${sub.path}.${byFile.get('f1')!.newId}`);
    strictEqual(plan.targetDepth0Id, 'T');
    strictEqual(plan.files.length, 4);
  });

  test('nested folders are created parent before child', () => {
    const plan = planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: source, targetRows: [row('T', null, 'P2 - PB', 'folder', 'T')], newId: ids() });
    const pos = new Map(plan.foldersToCreate.map((f, i) => [f.id, i]));
    for (const f of plan.foldersToCreate) {
      if (pos.has(f.parentId)) strictEqual(pos.get(f.parentId)! < pos.get(f.id)!, true);
    }
    deepStrictEqual(plan.foldersToCreate.map((f) => f.name).sort(), ['1 Kepemimpinan', '1.1 Sub', '3 Organisasi', 'A. RENCANA K3LL']);
  });

  test('isCopy aggregation: any 0 -> 0, else any 2 -> 2, all 1 -> 1, no children -> unchanged', () => {
    strictEqual(aggregateIsCopy([{ isCopy: 1 }, { isCopy: 1 }]), 1);
    strictEqual(aggregateIsCopy([{ isCopy: 1 }, { isCopy: 2 }]), 2);
    strictEqual(aggregateIsCopy([{ isCopy: 2 }, { isCopy: null }]), 0);
    strictEqual(aggregateIsCopy([]), null);
  });

  test('statuses are recomputed once, bottom-up, for touched folders and their ancestors only', async () => {
    const items: any[] = [
      row('T', null, 'P2 - PB', 'folder', 'T', { isCopy: 0 }),
      row('TA', 'T', 'A. RENCANA K3LL', 'folder', 'T.TA', { isCopy: 0 }),
      row('T1', 'TA', '1 Kepemimpinan', 'folder', 'T.TA.T1', { isCopy: 0, isComplete: false }),
      row('T2', 'TA', '2 Kebijakan', 'folder', 'T.TA.T2', { isCopy: 0, isComplete: false }), // untouched, no files
      row('X', 'T1', 'Lainnya', 'folder', 'T.TA.T1.X', { isCopy: 1, isComplete: false }),
      row('n1', 'X', 'a.pdf', 'file', 'T.TA.T1.X.n1', { isCopy: 1, isComplete: true }),
    ];
    const calls: string[] = [];
    const rules = {
      isFolderStructureComplete: async (id: string) => { calls.push(`structure:${id}`); return id === 'T'; },
      isK3LLFolderComplete: async (id: string, all: any[]) => { calls.push(`k3ll:${id}`); return all.filter((c) => c.parentId === id).every((c) => c.isComplete); },
      folderHasFile: async (id: string) => { calls.push(`hasFile:${id}`); return true; },
    };
    const result = await recomputeFolderStatuses(items, new Set(['X']), rules);
    // X directly holds the copied file and is a plain folder -> true without calling a rule; then T1, TA, T
    deepStrictEqual(calls, ['k3ll:T1', 'k3ll:TA', 'structure:T']);
    deepStrictEqual([...result.keys()], ['X', 'T1', 'TA', 'T']);
    strictEqual(result.get('X')!.isComplete, true);
    strictEqual(result.get('T1')!.isComplete, true); // its only child X became complete before T1 was evaluated
    strictEqual(result.get('TA')!.isComplete, false); // T2 is still incomplete
    strictEqual(result.get('T1')!.isCopy, 1);
    strictEqual(result.get('TA')!.isCopy, 0); // T2 was not copied
    strictEqual(result.has('T2'), false);
  });

  test('a PA folder that directly holds copied files is complete; a PB one uses the structure rule', async () => {
    const rules = { isFolderStructureComplete: async () => false, isK3LLFolderComplete: async () => false, folderHasFile: async () => false };
    const pa = [row('P', null, 'P3 - PA', 'folder', 'P'), row('n', 'P', 'x.pdf', 'file', 'P.n', { isCopy: 1 })];
    strictEqual((await recomputeFolderStatuses(pa, new Set(['P']), rules)).get('P')!.isComplete, true);
    const pb = [row('P', null, 'P3 - PB', 'folder', 'P'), row('n', 'P', 'x.pdf', 'file', 'P.n', { isCopy: 1 })];
    strictEqual((await recomputeFolderStatuses(pb, new Set(['P']), rules)).get('P')!.isComplete, false);
  });

  test('copying into itself or a nested folder is refused', () => {
    const byId = new Map(source.map((r) => [r.id, r]));
    strictEqual(typeof getNestingError('S', 'S', byId), 'string');
    strictEqual(typeof getNestingError('S', 'S11', byId), 'string');
    strictEqual(typeof getNestingError('S11', 'S', byId), 'string');
    strictEqual(getNestingError('S1', 'S3', byId), null);
  });

  test('limited concurrency keeps order and never exceeds the limit', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n) => {
      running++; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 2;
    });
    deepStrictEqual(out, [2, 4, 6, 8, 10, 12, 14, 16, 18]);
    strictEqual(peak, 4);
    deepStrictEqual(await mapWithConcurrency([], 4, async (n) => n), []);
  });
});

describe('job salin PB + kunci per folder tujuan', () => {
  const store = () => {
    let t = 1_000;
    let n = 0;
    const s = createCopyJobStore({ ttlMs: 60_000, now: () => t, newId: () => `job${++n}` });
    return { s, tick: (ms: number) => { t += ms; } };
  };

  test('a second copy to the same target is refused while the first runs', () => {
    const { s } = store();
    const a = s.start('src', 'tgt');
    strictEqual(a.ok, true);
    const b = s.start('other', 'tgt');
    strictEqual(b.ok, false);
    strictEqual(!b.ok && b.conflict.id, 'job1');
  });

  test('copying into the source of a running copy (or from its target) is refused; unrelated copies run in parallel', () => {
    const { s } = store();
    s.start('src', 'tgt');
    strictEqual(s.start('x', 'src').ok, false);
    strictEqual(s.start('tgt', 'y').ok, false);
    strictEqual(s.start('src', 'tgt2').ok, true); // same source, other target: fine
    strictEqual(s.start('a', 'b').ok, true);
  });

  test('the lock is released when the job finishes, progress and result are kept', () => {
    const { s } = store();
    const a = s.start('src', 'tgt');
    if (!a.ok) throw new Error('should start');
    s.progress(a.job.id, 3, 10, 'Menyalin berkas…');
    deepStrictEqual(s.get(a.job.id)!.progress, { done: 3, total: 10 });
    s.finish(a.job.id, 'completed', 'Copied 10 files', { scoreCopiedCategories: [1, 2] });
    s.progress(a.job.id, 4, 10); // ignored after the end
    const job = s.get(a.job.id)!;
    strictEqual(job.status, 'completed');
    deepStrictEqual(job.progress, { done: 3, total: 10 });
    deepStrictEqual(job.data, { scoreCopiedCategories: [1, 2] });
    strictEqual(s.start('src', 'tgt').ok, true);
  });

  test('finished jobs expire after the ttl, running jobs never do', () => {
    const { s, tick } = store();
    const a = s.start('a', 'b');
    const c = s.start('c', 'd');
    if (!a.ok || !c.ok) throw new Error('should start');
    s.finish(a.job.id, 'failed', 'boom');
    tick(60_001);
    strictEqual(s.get(a.job.id), null);
    strictEqual(s.get(c.job.id)!.status, 'running');
    strictEqual(s.start('x', 'd').ok, false);
  });
});

describe('salin PB antar struktur (dengan / tanpa A. RENCANA K3LL)', () => {
  const row = (id: string, parentId: string | null, name: string, fileType: string, path: string) =>
    ({ id, parentId, name, fileType, path, depth: path.split('.').length - 1, description: '', filePath: fileType === 'file' ? name : null });
  // standard: root / A. RENCANA K3LL / 3 Organisasi / 3.1 Struktur / files
  const withRencana = (r: string) => [
    row(r, null, 'P - PB', 'folder', r),
    row(`${r}A`, r, 'A. RENCANA K3LL', 'folder', `${r}.${r}A`),
    row(`${r}3`, `${r}A`, '3 Organisasi', 'folder', `${r}.${r}A.${r}3`),
    row(`${r}31`, `${r}3`, '3.1 Struktur', 'folder', `${r}.${r}A.${r}3.${r}31`),
    row(`${r}2`, `${r}A`, '2 Kebijakan', 'folder', `${r}.${r}A.${r}2`),
  ];
  // other structure: root / 3 Organisasi / 3.1 Struktur (no A. RENCANA K3LL)
  const direct = (r: string) => [
    row(r, null, 'Q - PB', 'folder', r),
    row(`${r}3`, r, '3 Organisasi', 'folder', `${r}.${r}3`),
    row(`${r}31`, `${r}3`, '3.1 Struktur', 'folder', `${r}.${r}3.${r}31`),
    row(`${r}2`, r, '2 Kebijakan – beda nama', 'folder', `${r}.${r}2`),
  ];
  const ids = () => { let n = 0; return () => `n${++n}`; };

  test('direct -> A. RENCANA: elements matched by number, no second tree', () => {
    const src = [...direct('S'), row('f1', 'S31', 'a.pdf', 'file', 'S.S3.S31.f1'), row('f2', 'S2', 'b.pdf', 'file', 'S.S2.f2')];
    const plan = planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: src, targetRows: withRencana('T'), newId: ids() });
    deepStrictEqual(plan.foldersToCreate, []);
    deepStrictEqual(plan.files.map((f) => [f.source.id, f.targetParentId]).sort(), [['f1', 'T31'], ['f2', 'T2']]);
  });

  test('A. RENCANA -> direct: no A. RENCANA K3LL folder is created in the target', () => {
    const src = [...withRencana('S'), row('f1', 'S31', 'a.pdf', 'file', 'S.SA.S3.S31.f1')];
    const plan = planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: src, targetRows: direct('T'), newId: ids() });
    deepStrictEqual(plan.foldersToCreate, []);
    strictEqual(plan.files[0].targetParentId, 'T31');
  });

  test('custom subfolders below an element are still matched / created by name', () => {
    const src = [...direct('S'), row('X', 'S31', 'Bukti tambahan', 'folder', 'S.S3.S31.X'), row('f1', 'X', 'a.pdf', 'file', 'S.S3.S31.X.f1')];
    const plan = planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: src, targetRows: withRencana('T'), newId: ids() });
    deepStrictEqual(plan.foldersToCreate.map((f) => [f.name, f.parentId, f.path]), [['Bukti tambahan', 'T31', 'T.TA.T3.T31.n1']]);
    strictEqual(plan.files[0].targetParentId, 'n1');
  });

  test('when the target holds a number twice, the one under A. RENCANA K3LL wins', () => {
    const tgt = [...withRencana('T'), row('D3', 'T', '3 Organisasi', 'folder', 'T.D3'), row('D31', 'D3', '3.1 Struktur', 'folder', 'T.D3.D31')];
    const src = [...direct('S'), row('f1', 'S31', 'a.pdf', 'file', 'S.S3.S31.f1')];
    strictEqual(planCopy({ sourceRootId: 'S', targetRootId: 'T', sourceRows: src, targetRows: tgt, newId: ids() }).files[0].targetParentId, 'T31');
  });
});

describe('ekspor catatan perbaikan', () => {
  test('deskripsi: catatan User lalu Kontraktor, tanpa label, dipisah baris kosong', () => {
    strictEqual(buildDeskripsi('agar lampirkan evidence', null), 'agar lampirkan evidence');
    strictEqual(buildDeskripsi('', "'Poin yang akan terpenuhi:\r\n- N/A"), "'Poin yang akan terpenuhi:\n- N/A");
    strictEqual(buildDeskripsi('  catatan user  ', ' catatan kontraktor '), 'catatan user\n\ncatatan kontraktor');
    strictEqual(buildDeskripsi(null, '   '), '');
  });
  test('sel: kosong -> "-", teks di-escape, baris baru dipertahankan, butir "-" tetap terpisah', () => {
    strictEqual(formatNoteCellHtml(''), '-');
    strictEqual(formatNoteCellHtml('1. A\n2. B <C> & D'), '<div style="margin-bottom: 8px;">- 1. A<br>2. B &lt;C&gt; &amp; D</div>');
    strictEqual(formatNoteCellHtml('- satu\n- dua'), '<div style="margin-bottom: 8px;">- satu</div><div style="margin-bottom: 8px;">- dua</div>');
    strictEqual(formatNoteCellHtml('user\n\nkontraktor'), '<div style="margin-bottom: 8px;">- user<br><br>kontraktor</div>');
  });
  test('elemen dicocokkan berdasarkan nomor, termasuk nama buatan sendiri dan en dash', () => {
    strictEqual(isExportableK3LLFolder('8 Manajemen K3LL – Pencapaian Lainnya'), true);
    strictEqual(isExportableK3LLFolder('2.1 Kebijakan Perusahaan & Sosialisasi'), true);
    strictEqual(isExportableK3LLFolder('A. RENCANA K3LL'), true);
    strictEqual(isExportableK3LLFolder('Campaign'), false);
    strictEqual(isExportableK3LLFolder('2.1'), false);
    strictEqual(elementNumberOf('6.2 lndikator kinerja K3LL'), '6.2');
  });
  test('nomor ganda dalam satu periode: satu baris, yang di bawah A. RENCANA K3LL menang', () => {
    const items = [
      { folderName: '3.1 Struktur', underRencana: false, id: 'direct' },
      { folderName: '3.1 Struktur', underRencana: true, id: 'rencana' },
      { folderName: '2 Kebijakan', underRencana: true, id: 'two' },
    ];
    deepStrictEqual(dedupeByElementNumber(items).map((i) => i.id), ['rencana', 'two']);
  });
});

describe('salin catatan User & Kontraktor', () => {
  const at = new Date('2026-09-28T06:47:59Z');
  const src = {
    score: '6', status: 'revision',
    note: '1. Dokumen listing peraturan', noteUpdatedBy: 'u-auditor', noteUpdatedAt: at,
    noteContractor: 'Poin yang sudah terpenuhi: - dokumen prosedur', noteContractorUpdatedBy: 'u-kontraktor', noteContractorUpdatedAt: at,
  };
  const all = { copyScores: true, copyUserNotes: true, copyContractorNotes: true };

  test('semua opsi aktif: skor, status, catatan User dan Kontraktor (beserta penulisnya) ikut', () => {
    deepStrictEqual(assessmentUpdateOf(src, all), {
      score: '6', status: 'revision',
      note: src.note, noteUpdatedBy: 'u-auditor', noteUpdatedAt: at,
      noteContractor: src.noteContractor, noteContractorUpdatedBy: 'u-kontraktor', noteContractorUpdatedAt: at,
    });
  });
  test('skor mati, catatan tetap disalin', () => {
    const set = assessmentUpdateOf(src, { ...all, copyScores: false })!;
    strictEqual('score' in set || 'status' in set, false);
    strictEqual(set.noteContractor, src.noteContractor);
    strictEqual(set.note, src.note);
  });
  test('hanya catatan Kontraktor / hanya catatan User', () => {
    deepStrictEqual(Object.keys(assessmentUpdateOf(src, { copyScores: false, copyUserNotes: false, copyContractorNotes: true })!).sort(), ['noteContractor', 'noteContractorUpdatedAt', 'noteContractorUpdatedBy']);
    deepStrictEqual(Object.keys(assessmentUpdateOf(src, { copyScores: false, copyUserNotes: true, copyContractorNotes: false })!).sort(), ['note', 'noteUpdatedAt', 'noteUpdatedBy']);
  });
  test('catatan sumber kosong tidak menimpa catatan tujuan', () => {
    const empty = { ...src, note: '   ', noteContractor: null };
    deepStrictEqual(assessmentUpdateOf(empty, all), { score: '6', status: 'revision' });
    strictEqual(assessmentUpdateOf(empty, { ...all, copyScores: false }), null);
  });
  test('semua opsi mati: tidak ada yang ditulis, hanya berkas yang disalin', () => {
    strictEqual(assessmentUpdateOf(src, { copyScores: false, copyUserNotes: false, copyContractorNotes: false }), null);
    strictEqual(copiesAnyValues(resolveCopyOptions({ copyScores: false, copyUserNotes: false, copyContractorNotes: false })), false);
    strictEqual(copiesAnyValues(resolveCopyOptions({})), true);
  });
});

describe('penulis catatan', () => {
  const usersById = new Map([['u1', { name: 'Admin Logindo', role: 'contractor' }]]);
  test('nama dan role diambil dari user, tanggal ISO', () => {
    deepStrictEqual(noteAuthorOf('u1', new Date('2026-11-24T02:00:00Z'), usersById), { name: 'Admin Logindo', role: 'contractor', at: '2026-11-24T02:00:00.000Z' });
  });
  test('catatan lama tanpa penulis -> null; user terhapus -> nama null', () => {
    strictEqual(noteAuthorOf(null, null, usersById), null);
    deepStrictEqual(noteAuthorOf('gone', null, usersById), { name: null, role: null, at: null });
  });
  test('id penulis dikumpulkan sekali', () => {
    deepStrictEqual(collectNoteAuthorIds([{ noteUpdatedBy: 'a', noteContractorUpdatedBy: 'b' }, { noteUpdatedBy: 'a' }, {}]).sort(), ['a', 'b']);
  });
});

// Run: node --test src/components/pages/csms/contract-management/contract-details/__tests__/copy-drop-utils.test.mts
import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, test } from 'node:test';
import { buildCopyPayload, countFiles, countNotesToOverwrite, DEFAULT_COPY_CHOICES, getCategoryOptions, getCopyButtonLabel, getCopyTargets, getNeighbourTarget } from '../copy-pb-utils.ts';
import { formatNoteAuthorBadge, pickDefaultNoteTab } from '../note-panel-utils.ts';
import { getDropConfirmTitle, getDropTargetState, validateDroppedFiles } from '../drop-upload-utils.ts';

const MB = 1024 * 1024;
const folder = (id: string, name: string, children: any[] = [], extra: any = {}) => ({ id, name, fileType: 'folder', children, ...extra });
const file = (id: string, name: string) => ({ id, name, fileType: 'file' });

describe('salin PB', () => {
  const periods = [
    folder('psb', '24-10-2025 - PSB'),
    folder('pb1', '16-12-2025 - PB'),
    folder('doc', 'DOKUMEN EVALUASI'),
    folder('pb2', '24-03-2026 - PB', [], { isFinal: true }),
    folder('pa', '24-03-2027 - PA'),
  ];

  test('default targets are the neighbouring periods, skipping non-assessment folders', () => {
    strictEqual(getNeighbourTarget(periods, 'pb1', 'prev')?.id, 'psb');
    strictEqual(getNeighbourTarget(periods, 'pb1', 'next')?.id, 'pb2');
    strictEqual(getNeighbourTarget(periods, 'psb', 'prev'), null);
  });
  test('any other period can be chosen', () => {
    deepStrictEqual(getCopyTargets(periods, 'pb1').map((f) => f.id), ['psb', 'pb2', 'pa']);
  });
  test('categories (with score) are read under A. RENCANA K3LL, all of them', () => {
    const root = folder('r', '16-12-2025 - PB', [
      folder('a', 'A. RENCANA K3LL', [
        folder('c2', '2 Kebijakan', [], { score: '6.00' }),
        folder('c1', '1 Kepemimpinan dan Komitmen', [file('f1', 'MWT Aprl 2026.pdf')], { score: 8 }),
        folder('c3', '3 Organisasi', []),
      ]),
    ]);
    deepStrictEqual(getCategoryOptions(root), [
      { number: 1, name: '1 Kepemimpinan dan Komitmen', score: 8 },
      { number: 2, name: '2 Kebijakan', score: 6 },
      { number: 3, name: '3 Organisasi', score: null },
    ]);
    strictEqual(countFiles(root), 1);
  });
  test('payload: all categories or files-only send no category list; a subset does', () => {
    const base = { sourceFolderId: 's', targetFolderId: 't', available: [1, 2, 3] };
    const all = { sourceFolderId: 's', targetFolderId: 't', copyScores: true, copyUserNotes: true, copyContractorNotes: true };
    deepStrictEqual(buildCopyPayload({ ...base, choices: DEFAULT_COPY_CHOICES, selected: [3, 1, 2] }), all);
    deepStrictEqual(buildCopyPayload({ ...base, choices: DEFAULT_COPY_CHOICES, selected: [2, 1] }), { ...all, categoryNumbers: [1, 2] });
    const none = { scores: false, userNotes: false, contractorNotes: false };
    deepStrictEqual(buildCopyPayload({ ...base, choices: none, selected: [1] }), { ...all, copyScores: false, copyUserNotes: false, copyContractorNotes: false });
    // scores off but notes on: the category selection still applies
    deepStrictEqual(buildCopyPayload({ ...base, choices: { ...none, contractorNotes: true }, selected: [3] }),
      { ...all, copyScores: false, copyUserNotes: false, categoryNumbers: [3] });
  });
  test('button label follows the choice', () => {
    const none = { scores: false, userNotes: false, contractorNotes: false };
    strictEqual(getCopyButtonLabel(none, 0, 8), 'Salin berkas saja');
    strictEqual(getCopyButtonLabel(DEFAULT_COPY_CHOICES, 8, 8), 'Salin berkas + skor & catatan semua kategori');
    strictEqual(getCopyButtonLabel({ ...none, scores: true }, 3, 8), 'Salin berkas + skor 3 kategori');
    strictEqual(getCopyButtonLabel({ ...none, contractorNotes: true }, 8, 8), 'Salin berkas + catatan semua kategori');
  });
});

describe('drag & drop upload', () => {
  test('only element folders accept files; group folders and finalized assessments do not', () => {
    strictEqual(getDropTargetState({ name: '1 Kepemimpinan dan Komitmen', fileType: 'folder' }, false), 'ok');
    strictEqual(getDropTargetState({ name: '3.1 Struktur Organisasi', fileType: 'folder' }, false), 'ok');
    strictEqual(getDropTargetState({ name: '3 Organisasi', fileType: 'folder' }, false), 'parent');
    strictEqual(getDropTargetState({ name: 'A. RENCANA K3LL', fileType: 'folder' }, false), 'parent');
    strictEqual(getDropTargetState({ name: '1 Kepemimpinan dan Komitmen', fileType: 'folder' }, true), 'final');
    strictEqual(getDropTargetState({ name: 'bukti.pdf', fileType: 'file' }, false), null);
  });
  test('limits match the upload form, and same-name files are flagged', () => {
    deepStrictEqual(validateDroppedFiles([{ name: 'a.pdf', size: MB }], []), { errors: [], duplicates: [] });
    strictEqual(validateDroppedFiles(Array.from({ length: 26 }, (_, i) => ({ name: `${i}.pdf`, size: 1 })), []).errors.length, 1);
    strictEqual(validateDroppedFiles([{ name: 'big.zip', size: 101 * MB }], []).errors.length, 2); // per-file and total
    deepStrictEqual(validateDroppedFiles([{ name: 'MWT.pdf', size: 1 }], ['mwt.PDF']).duplicates, ['MWT.pdf']);
  });
  test('confirmation names the file and the target folder', () => {
    strictEqual(getDropConfirmTitle(['MWT Aprl 2026.pdf'], '1 Kepemimpinan dan Komitmen'), 'Tambahkan "MWT Aprl 2026.pdf" ke folder "1 Kepemimpinan dan Komitmen"?');
    strictEqual(getDropConfirmTitle(['a.pdf', 'b.pdf'], '3.1 Struktur'), 'Tambahkan 2 berkas ke folder "3.1 Struktur"?');
  });
});

describe('salin catatan', () => {
  const tree = (id: string, rencana: boolean, notes: Record<string, { note?: string; noteContractor?: string }>) => {
    const el = (num: string, name: string, children: any[] = []) => folder(`${id}${num}`, `${num} ${name}`, children, notes[num] ?? {});
    const cats = [el('1', 'Kepemimpinan'), el('3', 'Organisasi', [el('3.6', 'Peraturan dan Standar K3LL')]), el('4', 'Manajemen Risiko', [el('4.1', 'Penilaian')])];
    return folder(id, `${id} - PB`, rencana ? [folder(`${id}A`, 'A. RENCANA K3LL', cats)] : cats);
  };
  const source = tree('s', true, { '3.6': { noteContractor: 'Poin yang sudah terpenuhi' }, '4.1': { note: 'catatan baru' }, '1': { note: '' } });

  test('counts target elements whose note will be replaced (source has text, target has a different one)', () => {
    const target = tree('t', false, { '3.6': { noteContractor: 'lama' }, '4.1': { note: 'catatan baru' }, '1': { note: 'tetap' } });
    // 3.6: contractor note replaced; 4.1: same text; 1: empty source never overwrites
    strictEqual(countNotesToOverwrite(source, target, DEFAULT_COPY_CHOICES, [1, 3, 4]), 1);
    strictEqual(countNotesToOverwrite(source, target, { ...DEFAULT_COPY_CHOICES, contractorNotes: false }, [1, 3, 4]), 0);
    strictEqual(countNotesToOverwrite(source, target, DEFAULT_COPY_CHOICES, [1, 4]), 0); // category 3 not chosen
  });
  test('elements are matched by number with or without A. RENCANA K3LL', () => {
    const target = tree('t', true, { '4.1': { note: 'lain' } });
    strictEqual(countNotesToOverwrite(source, target, DEFAULT_COPY_CHOICES, [4]), 1);
  });
});

describe('panel catatan', () => {
  test('opens on the User note, then the contractor note, never first on the AI analysis', () => {
    strictEqual(pickDefaultNoteTab(true, true, true), 'internal');
    strictEqual(pickDefaultNoteTab(false, true, true), 'contractor');
    strictEqual(pickDefaultNoteTab(false, false, true), 'ai');
  });
  test('author badge: role, name, date (Jakarta); older notes only show the role of the tab', () => {
    strictEqual(formatNoteAuthorBadge('contractor', { name: 'Admin Logindo', role: 'contractor', at: '2026-11-23T20:00:00.000Z' }), 'Kontraktor · Admin Logindo · 24 Nov 2026');
    strictEqual(formatNoteAuthorBadge('internal', { name: 'Puteri', role: 'user', at: null }), 'Auditor PHE · Puteri');
    strictEqual(formatNoteAuthorBadge('internal', { name: 'Dandy', role: 'admin', at: null }), 'Admin · Dandy');
    strictEqual(formatNoteAuthorBadge('internal', null), 'Auditor PHE');
    strictEqual(formatNoteAuthorBadge('contractor', undefined), 'Kontraktor');
  });
});

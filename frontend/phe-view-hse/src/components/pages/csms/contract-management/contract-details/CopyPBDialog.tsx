import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContractFolder } from '@/service/csms/folder-detail';
import { getFolderDateDisplay, getFolderTitle } from './root-folder-selector/utils';
import {
  buildCopyPayload,
  copiesAnyValues,
  countFiles,
  countNotesToOverwrite,
  DEFAULT_COPY_CHOICES,
  getCategoryOptions,
  getCopyButtonLabel,
  getCopyTargets,
  type CopyChoices,
  type CopyPayload,
} from './copy-pb-utils';

const CHOICE_SWITCHES: Array<{ key: keyof CopyChoices; id: string; label: string }> = [
  { key: 'scores', id: 'copy-scores', label: 'Salin skor & status' },
  { key: 'userNotes', id: 'copy-user-notes', label: 'Salin catatan User' },
  { key: 'contractorNotes', id: 'copy-contractor-notes', label: 'Salin catatan Kontraktor' },
];

interface CopyPBDialogProps {
  source: ContractFolder | null;
  initialTarget: ContractFolder | null;
  folders: ContractFolder[];
  isPending: boolean;
  /** Set while the server copies in the background: done/total files (total 0 = still preparing). */
  progress?: { done: number; total: number } | null;
  onCancel: () => void;
  onConfirm: (payload: CopyPayload, target: ContractFolder) => void;
}

const periodLabel = (f: ContractFolder) => {
  const date = getFolderDateDisplay(f.name, f.assessmentDate);
  return date ? `${getFolderTitle(f.name)} · ${date}` : getFolderTitle(f.name);
};

/** Admin: copy an assessment's files (and optionally the scores and notes of chosen categories) to any other period. */
export const CopyPBDialog: React.FC<CopyPBDialogProps> = ({ source, initialTarget, folders, isPending, progress = null, onCancel, onConfirm }) => {
  const [targetId, setTargetId] = useState<string>(initialTarget?.id ?? '');
  const [choices, setChoices] = useState<CopyChoices>(DEFAULT_COPY_CHOICES);
  const anyValues = copiesAnyValues(choices);
  const categories = useMemo(() => getCategoryOptions(source), [source]);
  const [selected, setSelected] = useState<number[]>(categories.map((c) => c.number));

  // Re-initialise whenever the dialog opens for another source/target. All categories are checked by default.
  useEffect(() => {
    setTargetId(initialTarget?.id ?? '');
    setChoices(DEFAULT_COPY_CHOICES);
    setSelected(categories.map((c) => c.number));
  }, [source?.id, initialTarget?.id, categories]);

  if (!source) return null;

  const targets = getCopyTargets(folders, source.id);
  const target = targets.find((f) => f.id === targetId) ?? null;
  const targetFileCount = countFiles(target);
  const targetScoredCount = getCategoryOptions(target).filter((c) => (c.score ?? 0) > 0).length;
  const allSelected = categories.length > 0 && selected.length === categories.length;
  const canSubmit = !!target && !isPending && (!anyValues || categories.length === 0 || selected.length > 0);
  // with no category list (no categories in the source) every category is copied
  const chosenCategories = categories.length > 0 ? selected : [1, 2, 3, 4, 5, 6, 7, 8];
  const notesToOverwrite = target ? countNotesToOverwrite(source, target, choices, chosenCategories) : 0;

  const toggleCategory = (n: number, checked: boolean) =>
    setSelected((prev) => (checked ? [...new Set([...prev, n])] : prev.filter((x) => x !== n)));

  const handleConfirm = () => {
    if (!target) return;
    onConfirm(
      buildCopyPayload({
        sourceFolderId: source.id,
        targetFolderId: target.id,
        choices,
        selected,
        available: categories.map((c) => c.number),
      }),
      target,
    );
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // Layout: header / scrollable body / footer stacked in a column that can never be wider than the panel
  // (min-w-0 on every flex/grid child; long texts wrap or truncate instead of widening the dialog).
  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-4 overflow-hidden sm:max-w-xl">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle>Salin data penilaian</DialogTitle>
          <DialogDescription>Salin berkas dari periode ini ke periode lain, dengan atau tanpa skor penilaian.</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-1">
          <div className="grid min-w-0 gap-3 text-sm">
            <div className="grid min-w-0 gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Dari</span>
              <div className="min-w-0 break-words rounded-md border bg-muted/60 px-3 py-2 font-medium">{periodLabel(source)}</div>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Ke</span>
              <Select value={targetId} onValueChange={setTargetId} disabled={isPending}>
                <SelectTrigger className="w-full min-w-0" data-testid="copy-target-select">
                  {/* the selected label is truncated in the trigger; in the list below it wraps */}
                  <span className="min-w-0 flex-1 overflow-hidden text-left [&_[data-period-label]]:truncate">
                    <SelectValue placeholder="Pilih periode tujuan" />
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  {targets.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="whitespace-normal">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {f.isFinal && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <span data-period-label className="min-w-0 break-words">{periodLabel(f)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {target && (
            <div className="space-y-2">
              <div className="flex min-w-0 items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  {targetFileCount > 0
                    ? `${targetFileCount} berkas di ${getFolderTitle(target.name)} akan diganti dengan berkas dari periode sumber.`
                    : `Berkas akan disalin ke ${getFolderTitle(target.name)}.`}
                  {choices.scores && targetScoredCount > 0 && ` ${targetScoredCount} kategori di tujuan sudah punya skor dan akan ditimpa jika dipilih.`}
                  {notesToOverwrite > 0 && ` ${notesToOverwrite} elemen di tujuan sudah punya catatan dan akan ditimpa.`}
                </span>
              </div>
              {target.isFinal && (
                <div className="flex min-w-0 items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300" data-testid="copy-target-final-warning">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">Periode tujuan sudah difinalisasi. Isinya akan tetap diubah oleh salinan ini.</span>
                </div>
              )}
            </div>
          )}

          <div className="min-w-0 space-y-2.5 border-t pt-3">
            {CHOICE_SWITCHES.map((c) => (
              <div key={c.key} className="flex min-w-0 items-center justify-between gap-3">
                <Label htmlFor={c.id} className="min-w-0 font-medium">{c.label}</Label>
                <Switch
                  id={c.id}
                  checked={choices[c.key]}
                  onCheckedChange={(v) => setChoices((prev) => ({ ...prev, [c.key]: v === true }))}
                  disabled={isPending}
                  className="shrink-0"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Catatan hanya ditimpa bila catatan di periode sumber berisi.</p>
          </div>

          {anyValues && (
            categories.length > 0 ? (
              <div className="min-w-0 space-y-2">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="min-w-0">Kategori yang ikut disalin (skor &amp; status dan catatan sesuai pilihan di atas)</span>
                  <button
                    type="button"
                    className="shrink-0 font-semibold text-primary hover:underline disabled:opacity-50"
                    onClick={() => setSelected(allSelected ? [] : categories.map((c) => c.number))}
                    disabled={isPending}
                  >
                    {allSelected ? 'Kosongkan' : 'Pilih semua'}
                  </button>
                </div>
                <div className="max-h-64 min-w-0 divide-y overflow-y-auto rounded-md border">
                  {categories.map((c) => (
                    <label key={c.number} className="flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                      <Checkbox
                        className="shrink-0"
                        checked={selected.includes(c.number)}
                        onCheckedChange={(v) => toggleCategory(c.number, v === true)}
                        disabled={isPending}
                      />
                      <span className="min-w-0 flex-1 truncate" title={c.name}>{c.name}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                        {c.score === null ? '-' : c.score.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Semua kategori akan ikut disalin sesuai pilihan di atas.</p>
            )
          )}
        </div>

        {progress && (
          <div className="min-w-0 space-y-1.5" data-testid="copy-progress" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 font-medium">
                {progress.total > 0 ? `Menyalin… ${progress.done}/${progress.total} berkas` : 'Menyiapkan penyalinan…'}
              </span>
              {progress.total > 0 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{percent}%</span>}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.total > 0 ? percent : 5}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Jangan tutup halaman ini sampai penyalinan selesai.</p>
          </div>
        )}

        <DialogFooter className="min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button onClick={handleConfirm} disabled={!canSubmit} data-testid="copy-confirm" className="h-auto min-h-9 whitespace-normal text-center">
            {isPending && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />}
            {progress
              ? (progress.total > 0 ? `Menyalin… ${progress.done}/${progress.total} berkas` : 'Menyalin…')
              : getCopyButtonLabel(choices, selected.length, categories.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

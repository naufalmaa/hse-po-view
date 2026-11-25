import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';
import { useApplyAiRecommendation } from '@/service/csms/contract-management-api';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';

/**
 * Preview + apply of AI recommendations for an assessment folder, one category or one element.
 * Default selection (server side): elements not yet assessed, valid AI result, confidence >= 0.85.
 * The evaluator can still change every score manually afterwards; the last apply can be undone.
 */

type Candidate = {
  id: string;
  name: string;
  current: { status: string; score: number };
  next: { status: string; score: number } | null;
  confidence: number | null;
  eligible: boolean;
  selected: boolean;
  reason?: string;
};
type Preview = { isFinal: boolean; minConfidence: number; candidates: Candidate[]; lastApply: { count: number } | null };

const STATUS: Record<string, string> = { accept: 'Accept', revision: 'Revisi', reject: 'Reject', pending: 'Belum dinilai' };
const fmt = (v: { status: string; score: number }) =>
  v.status === 'pending' ? 'Belum dinilai' : `${STATUS[v.status] ?? v.status} · ${v.score === -1 ? 'N/A' : v.score}`;
const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Gagal';

export const AiApplyDialog = ({
  folderId,
  scopeLabel,
  open,
  onOpenChange,
  onApplied,
}: {
  folderId: string | null;
  scopeLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
}) => {
  const mutation = useApplyAiRecommendation();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = () => {
    if (!folderId) return;
    setPreview(null);
    mutation.mutateAsync({ folderId, action: 'preview' }).then(
      (r: any) => {
        const d = r?.data as Preview;
        setPreview(d);
        setPicked(new Set(d.candidates.filter((c) => c.selected).map((c) => c.id)));
      },
      (e) => showNotifError({ message: errMsg(e) }),
    );
  };
  useEffect(() => {
    if (open) load();
  }, [open, folderId]);

  const run = async (action: 'apply' | 'undo') => {
    if (!folderId) return;
    try {
      const r: any = await mutation.mutateAsync({ folderId, action, elementIds: action === 'apply' ? [...picked] : undefined });
      showNotifSuccess({ message: r?.message ?? 'Selesai' });
      onApplied?.();
      if (action === 'apply') onOpenChange(false);
      else load();
    } catch (e) {
      showNotifError({ message: errMsg(e) });
    }
  };

  const list = preview?.candidates ?? [];
  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      on ? n.add(id) : n.delete(id);
      return n;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]" data-testid="ai-apply-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" /> Terapkan rekomendasi AI
          </DialogTitle>
          <DialogDescription>
            {scopeLabel}. Bawaan: hanya elemen yang belum dinilai, hasil AI valid, dan keyakinan ≥{' '}
            {(preview?.minConfidence ?? 0.85).toLocaleString('id-ID')}. Status mengikuti skor (10 dan 6 Accept, 3 Revisi, 0 Reject).
            Skor tetap bisa diubah manual setelahnya.
          </DialogDescription>
        </DialogHeader>

        {!preview && <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />}
        {preview?.isFinal && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
            Folder penilaian sudah final, sehingga rekomendasi AI tidak dapat diterapkan.
          </p>
        )}
        {preview && (
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2 text-left font-medium">Elemen</th>
                  <th className="p-2 text-left font-medium">Sekarang</th>
                  <th className="p-2 text-left font-medium">Menjadi</th>
                  <th className="p-2 text-right font-medium">Keyakinan</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t" data-testid="ai-apply-row">
                    <td className="p-2">
                      <Checkbox
                        checked={picked.has(c.id)}
                        disabled={!c.eligible || preview.isFinal}
                        onCheckedChange={(v) => toggle(c.id, v === true)}
                        aria-label={`Pilih ${c.name}`}
                      />
                    </td>
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{fmt(c.current)}</td>
                    <td className="p-2">
                      {c.next ? <span className="font-medium">{fmt(c.next)}</span> : <span className="text-muted-foreground">-</span>}
                      {c.reason && <div className="text-[10px] text-muted-foreground">{c.reason}</div>}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {c.confidence == null ? '-' : (
                        <Badge variant="outline" className={c.confidence < preview.minConfidence ? 'text-amber-700 border-amber-300' : ''}>
                          {c.confidence.toLocaleString('id-ID')}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={!preview?.lastApply || preview?.isFinal || mutation.isPending}
            onClick={() => run('undo')}
            data-testid="ai-apply-undo"
          >
            <Undo2 className="mr-1.5 h-4 w-4" /> Batalkan penerapan terakhir{preview?.lastApply ? ` (${preview.lastApply.count} elemen)` : ''}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={() => run('apply')} disabled={!picked.size || preview?.isFinal || mutation.isPending} data-testid="ai-apply-confirm">
              {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Terapkan {picked.size} elemen
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

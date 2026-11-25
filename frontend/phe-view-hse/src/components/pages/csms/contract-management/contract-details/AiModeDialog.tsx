import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Zap, Search, Sparkles } from 'lucide-react';
import type { AiMode } from '@/service/csms/contract-management-api';

/**
 * Shown every time an admin starts an AI evaluation: choose fast or thorough, with what each one reads,
 * how long it takes and when to use it (decided Nov 2026, see docs/safeview-demo/PLAN_AI_MODES_RUBRIC_FEEDBACK.md).
 */

// fast: hard limit per element in the engine (CSMS_AI_FAST_ELEMENT_MIN); thorough: reference only, never cut off
const FAST_MAX_MIN = 10;
const THOROUGH_REF_MIN = 30;

const MODES: {
  id: AiMode;
  title: string;
  icon: React.ElementType;
  time: string;
  reads: string[];
  use: string;
}[] = [
  {
    id: 'fast',
    title: 'Cepat',
    icon: Zap,
    time: `maksimal ${FAST_MAX_MIN} menit per elemen`,
    reads: [
      'Bagian penting dokumen: halaman awal, akhir, pengesahan dan sertifikat',
      'Maksimal 3 halaman pindaian (scan) dibaca per berkas',
      'Satu juri AI',
    ],
    use: 'Pra-penilaian atau cek cepat setelah kontraktor mengunggah berkas.',
  },
  {
    id: 'thorough',
    title: 'Menyeluruh',
    icon: Search,
    time: `acuan ±${THOROUGH_REF_MIN} menit per elemen (tidak dihentikan)`,
    reads: [
      'Seluruh isi semua berkas, termasuk hasil pindaian (OCR)',
      'Setiap berkas diringkas terhadap checklist rubrik, lalu dinilai',
      'Tiga juri AI + konsensus',
    ],
    use: 'Penilaian akhir. Ringkasan disimpan, sehingga penilaian ulang lebih cepat.',
  },
];

export type AiModeChoice = { mode: AiMode; priorityOnly: boolean };

export const AiModeDialog = ({
  open,
  onOpenChange,
  targetLabel,
  elementCount,
  priorityCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "seluruh folder penilaian", "elemen 3.1 ..." */
  targetLabel: string;
  /** elements the run covers (for the time estimate) */
  elementCount: number;
  /** whole-folder runs only: elements not final for the evaluator or with changed files */
  priorityCount?: number;
  onConfirm: (choice: AiModeChoice) => void;
}) => {
  const [mode, setMode] = useState<AiMode>('fast');
  const [priorityOnly, setPriorityOnly] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('fast');
      setPriorityOnly(priorityCount !== undefined && priorityCount > 0 && priorityCount < elementCount);
    }
  }, [open]);

  const count = priorityOnly && priorityCount !== undefined ? priorityCount : elementCount;
  const estimate = (m: AiMode) => {
    const min = count * (m === 'fast' ? FAST_MAX_MIN : THOROUGH_REF_MIN);
    const fmt = (x: number) => (x >= 60 ? `${Math.floor(x / 60)} j ${x % 60 ? `${x % 60} mnt` : ''}`.trim() : `${x} mnt`);
    return m === 'fast' ? `paling lama ${fmt(min)}` : `acuan ±${fmt(min)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]" data-testid="ai-mode-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" /> Pilih mode evaluasi AI
          </DialogTitle>
          <DialogDescription>
            Target: <span className="font-medium text-foreground">{targetLabel}</span> ({count} elemen). Hasil AI adalah
            rekomendasi; skor akhir tetap ditetapkan evaluator.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              data-testid={`ai-mode-${m.id}`}
              onClick={() => setMode(m.id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                mode === m.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500' : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <m.icon className="h-4 w-4 text-purple-600 dark:text-purple-400" /> {m.title}
              </div>
              <div className="mt-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">{m.time}</div>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                {m.reads.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px]">{m.use}</p>
              <p className="mt-2 text-[11px] font-medium">Perkiraan untuk {count} elemen: {estimate(m.id)}</p>
            </button>
          ))}
        </div>

        {priorityCount !== undefined && (
          <label className="flex items-start gap-2 rounded-md border border-border p-2.5 text-xs cursor-pointer">
            <Checkbox
              checked={priorityOnly}
              onCheckedChange={(v) => setPriorityOnly(v === true)}
              disabled={priorityCount === 0}
              data-testid="ai-priority-only"
            />
            <span>
              Hanya elemen yang belum dinilai evaluator atau berkasnya berubah sejak penilaian AI terakhir
              <span className="text-muted-foreground"> ({priorityCount} dari {elementCount} elemen)</span>
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            data-testid="ai-mode-start"
            disabled={count === 0}
            onClick={() => {
              onOpenChange(false);
              onConfirm({ mode, priorityOnly: priorityOnly && priorityCount !== undefined });
            }}
          >
            Mulai evaluasi {mode === 'fast' ? 'cepat' : 'menyeluruh'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

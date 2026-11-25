import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';
import { Download, Upload, Loader2, Save, CheckCircle2, Info, ChevronDown, AlertTriangle, Eye, Trash2, ArrowRight } from 'lucide-react';
import {
  useAiQuality,
  useAiRubricVersions,
  useAiRubricItems,
  useAiRubricUpdateItem,
  useAiRubricActivate,
  useAiRubricImport,
  useAiFeedbackDelete,
  useAiReferenceFolders,
  useAiRubricTrials,
  useAiRubricTrialStart,
  downloadAiRubricExcel,
  type AiMode,
} from '@/service/csms/contract-management-api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FIELD_HELP, SECTIONS, SectionId, lintRubricItem, jurorPreview } from './ai-rubric-help';

/**
 * Admin page "AI CSMS": AI quality (AI vs the evaluator's final score, corrections), the AI rubric (kriteria
 * penilaian, type marine: Excel import/export, edit with help texts and a live quality check, version history)
 * and the calibration guide. Every rubric change creates a new version, so each AI result stays traceable.
 */

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
type TabId = 'quality' | 'rubric' | 'guide';

const HelpTip = ({ text, example }: { text: string; example?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="Bantuan">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-sm whitespace-pre-line text-xs leading-relaxed">
      {text}
      {example && <div className="mt-1.5 border-t border-white/20 pt-1.5 opacity-90">Contoh:{'\n'}{example}</div>}
    </TooltipContent>
  </Tooltip>
);

const Pct = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full', value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${value}%` }} />
    </div>
    <span className="tabular-nums text-xs">{value}%</span>
  </div>
);

/** How the AI uses the rubric, in one picture. */
const HowItWorks = () => {
  const steps = [
    ['Berkas', 'Kontraktor mengunggah dokumen per elemen.'],
    ['Dibaca', 'Teks diambil; pindaian dibaca dengan OCR.'],
    ['Dicek per AI CHECK', 'Setiap Check di rubrik dinilai TERPENUHI, SEBAGIAN, atau TIDAK, dengan kutipan bukti.'],
    ['Juri AI', 'Tiga juri (mode Menyeluruh) atau satu juri (mode Cepat) memberi skor sesuai aturan skor.'],
    ['Evaluator', 'Admin meninjau, menerapkan, atau mengoreksi. Koreksi dipakai AI berikutnya.'],
  ];
  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Cara kerja AI CSMS</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="grid gap-2 sm:grid-cols-5" data-tour="ai-how">
            {steps.map(([t, d], i) => (
              <div key={t} className="relative rounded-lg border p-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">{i + 1}</span>
                  {t}
                </div>
                <p className="mt-1 text-muted-foreground">{d}</p>
              </div>
            ))}
            <p className="sm:col-span-5 text-[11px] text-muted-foreground">
              Kualitas skor AI paling ditentukan oleh <b>Kriteria evaluasi (AI CHECKS)</b> dan <b>aturan skor</b> di tab Rubrik AI. Ikuti tab Panduan
              kalibrasi untuk menyelaraskannya dengan praktik evaluator.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const QualityTab = ({ onFix }: { onFix: (code: string) => void }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useAiQuality();
  const del = useAiFeedbackDelete();
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!data || data.total === 0)
    return <p className="text-sm text-muted-foreground">Belum ada elemen yang dinilai AI dan sudah dinilai evaluator.</p>;
  const kpis = [
    { label: 'Elemen dibandingkan', value: String(data.total), tip: 'Elemen yang punya hasil AI dan sudah dinilai evaluator.' },
    { label: 'Skor AI sama dengan evaluator', value: `${data.exactPct}%`, tip: 'Target setelah kalibrasi: minimal 70%.' },
    { label: 'Selisih paling banyak satu tingkat', value: `${data.nearPct}%`, tip: 'Tingkat skor: 0, 3, 6, 10. Contoh satu tingkat: AI 6, evaluator 10. Target: minimal 95%.' },
  ];
  return (
    <div className="flex flex-col gap-4" data-testid="ai-quality">
      <div className="grid gap-3 sm:grid-cols-3" data-tour="ai-quality-kpi">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{k.label} <HelpTip text={k.tip} /></div>
              <div className="text-2xl font-semibold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            Kesesuaian per elemen <HelpTip text="Rata-rata selisih positif berarti AI memberi skor lebih tinggi dari evaluator; negatif berarti lebih rendah. Mulai perbaikan dari selisih terbesar." />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium">Elemen</th>
                <th className="py-1.5 text-right font-medium">Jumlah</th>
                <th className="py-1.5 text-left font-medium pl-4">Sama</th>
                <th className="py-1.5 text-left font-medium">±1 tingkat</th>
                <th className="py-1.5 text-right font-medium">Rata-rata selisih</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.elements.map((e) => (
                <tr key={e.code} className="border-b last:border-0">
                  <td className="py-1.5 pr-2"><span className="font-medium">{e.code}</span> {e.element}</td>
                  <td className="py-1.5 text-right tabular-nums">{e.count}</td>
                  <td className="py-1.5 pl-4"><Pct value={e.exactPct} /></td>
                  <td className="py-1.5"><Pct value={e.nearPct} /></td>
                  <td className={cn('py-1.5 text-right tabular-nums', Math.abs(e.avgDiff) >= 3 && 'text-amber-700 dark:text-amber-400 font-semibold')}>
                    {e.avgDiff > 0 ? '+' : ''}{e.avgDiff}
                  </td>
                  <td className="py-1.5 text-right">
                    {Math.abs(e.avgDiff) >= 3 && (
                      <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => onFix(e.code)}>
                        Perbaiki rubrik <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            Koreksi terbaru <HelpTip text="Koreksi evaluator ditulis di dialog Penilaian saat skor berbeda dari AI. Koreksi bertanda sintetis disusun otomatis dari selisih AI dan evaluator; hapus bila tidak tepat. AI memakai 3 koreksi terakhir per elemen, koreksi evaluator lebih dulu." />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.corrections.length === 0 && <p className="text-xs text-muted-foreground">Belum ada koreksi.</p>}
          {data.corrections.map((c) => (
            <div key={c.id} className="rounded-md border p-2 text-xs" data-testid="ai-correction">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{c.elementCode}</Badge>
                {c.source === 'sintetis' && <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300">sintetis</Badge>}
                <span>AI {c.aiScore} → evaluator {c.evaluatorScore === -1 ? 'N/A' : c.evaluatorScore}</span>
                <span className="text-muted-foreground">{c.contractTitle} · {c.userName ?? 'sistem'} · {fmtDate(c.createdAt)}</span>
                <span className="flex-1" />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" aria-label="Hapus koreksi"
                  onClick={() => del.mutateAsync(c.id).then(() => qc.invalidateQueries({ queryKey: ['ai-quality'] }), (e) => showNotifError({ message: errMsg(e) }))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1">{c.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

/** P4: run a rubric version on 1 to 3 final assessment folders; their AI results are restored afterwards. */
const TrialDialog = ({ version, onClose }: { version: { id: string; version: number } | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data: refs, isLoading } = useAiReferenceFolders(!!version);
  const start = useAiRubricTrialStart();
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<AiMode>('thorough');
  useEffect(() => setPicked([]), [version?.id]);
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id].slice(0, 3) : p.filter((x) => x !== id)));
  const run = () => {
    if (!version) return;
    start.mutateAsync({ versionId: version.id, rootIds: picked, mode }).then(
      (r: any) => {
        showNotifSuccess({ message: r?.message ?? 'Uji dimulai' });
        qc.invalidateQueries({ queryKey: ['ai-rubric-trials'] });
        onClose();
      },
      (e) => showNotifError({ message: errMsg(e) }),
    );
  };
  return (
    <Dialog open={!!version} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]" data-testid="rubric-trial-dialog">
        <DialogHeader>
          <DialogTitle>Uji rubrik versi {version?.version} di set acuan</DialogTitle>
          <DialogDescription>
            Pilih 1 sampai 3 folder penilaian yang sudah final. AI menilai ulang dengan versi ini lalu dibandingkan dengan skor evaluator.
            Hasil AI di folder tersebut dikembalikan seperti semula setelah uji selesai. Mode Menyeluruh memberi hasil paling representatif.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {(refs ?? []).map((r) => (
            <label key={r.id} className="flex items-center gap-2 border-b px-3 py-2 text-xs last:border-0">
              <Checkbox checked={picked.includes(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} />
              <span className="flex-1"><b>{r.name}</b> · {r.contractTitle}</span>
              <span className="text-muted-foreground">{r.assessed} elemen dinilai</span>
            </label>
          ))}
          {!isLoading && !refs?.length && <p className="p-3 text-xs text-muted-foreground">Belum ada folder penilaian final.</p>}
        </div>
        <div className="flex gap-2 text-xs">
          {(['thorough', 'fast'] as AiMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn('rounded-full border px-3 py-1', mode === m ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/30' : 'text-muted-foreground')}>
              {m === 'thorough' ? 'Menyeluruh' : 'Cepat'}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={!picked.length || start.isPending} data-testid="rubric-trial-start" onClick={run}>
            Mulai uji ({picked.length} folder)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TrialResults = () => {
  const { data } = useAiRubricTrials();
  if (!data?.length) return null;
  const pct = (a: { n: number; exactPct: number; nearPct: number }) => (a.n ? `${a.exactPct}% / ${a.nearPct}%` : '-');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          Hasil uji rubrik
          <HelpTip text="Sama persis / selisih ≤ 1 tingkat terhadap skor evaluator. Kolom Sebelumnya = hasil AI yang dimiliki folder itu sebelum uji. Pakai versi baru bila lebih baik (target 70% / 95%)." />
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs" data-testid="rubric-trials">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-1.5 text-left font-medium">Versi</th>
              <th className="py-1.5 text-left font-medium">Folder acuan</th>
              <th className="py-1.5 text-left font-medium">Status</th>
              <th className="py-1.5 text-right font-medium">Versi diuji</th>
              <th className="py-1.5 text-right font-medium">Sebelumnya</th>
              <th className="py-1.5 text-right font-medium">Keyakinan &lt; 0,85</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-1.5">v{t.version} · {t.label}</td>
                <td className="py-1.5">{t.rootName} <span className="text-muted-foreground">({t.mode === 'fast' ? 'Cepat' : 'Menyeluruh'})</span></td>
                <td className="py-1.5">
                  {t.status === 'completed' ? <Badge variant="outline" className="text-emerald-700">selesai</Badge>
                    : t.status === 'failed' ? <Badge variant="outline" className="text-rose-700">gagal</Badge>
                    : <span className="text-muted-foreground">{t.status === 'queued' ? 'antri' : (t.progress ?? 'berjalan')}</span>}
                </td>
                <td className={cn('py-1.5 text-right tabular-nums font-medium', t.trial.n > 0 && t.baseline.n > 0 && t.trial.exactPct > t.baseline.exactPct && 'text-emerald-700')}>{pct(t.trial)}</td>
                <td className="py-1.5 text-right tabular-nums">{pct(t.baseline)}</td>
                <td className="py-1.5 text-right tabular-nums">{t.status === 'completed' ? t.lowConfidence : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

const RubricTab = ({ focus }: { focus: string | null }) => {
  const qc = useQueryClient();
  const { data: versions } = useAiRubricVersions();
  const [viewVersion, setViewVersion] = useState<string | undefined>(undefined);
  const { data: rubric, isLoading } = useAiRubricItems(viewVersion);
  const update = useAiRubricUpdateItem();
  const activate = useAiRubricActivate();
  const importer = useAiRubricImport();
  const [selected, setSelected] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>('kriteria');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [importLabel, setImportLabel] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [trialVersion, setTrialVersion] = useState<{ id: string; version: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (focus) setSelected(focus); }, [focus]);
  const items = rubric?.items ?? [];
  const item = useMemo(() => items.find((i) => i.no === selected) ?? items[0], [items, selected]);
  useEffect(() => { setDraft({}); setLabel(''); }, [item?.no, rubric?.versionId]);
  const active = versions?.find((v) => v.isActive);
  const viewing = versions?.find((v) => v.id === (viewVersion ?? active?.id));
  const editable = !viewVersion || viewVersion === active?.id;
  const merged = item ? { ...item, ...draft } : null;
  const lint = useMemo(() => (merged ? lintRubricItem(merged) : null), [merged]);
  const lintAll = useMemo(() => Object.fromEntries(items.map((i) => [i.no, lintRubricItem(i).score])), [items]);
  const changed = Object.keys(draft).filter((k) => item && draft[k] !== (item[k] ?? ''));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['ai-rubric-versions'] });
    qc.invalidateQueries({ queryKey: ['ai-rubric-items'] });
  };
  const save = async () => {
    if (!item || !changed.length || !label.trim()) return;
    try {
      const res: any = await update.mutateAsync({ no: item.no, fields: { ...Object.fromEntries(changed.map((k) => [k, draft[k]])), __label: label } });
      showNotifSuccess({ message: res?.message || 'Rubrik disimpan' });
      setViewVersion(undefined);
      refresh();
    } catch (e) {
      showNotifError({ message: errMsg(e) });
    }
  };
  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      const res: any = await importer.mutateAsync({ file, label: importLabel });
      showNotifSuccess({ message: res?.message || 'Rubrik diimpor' });
      setImportLabel('');
      setViewVersion(undefined);
      refresh();
    } catch (e) {
      showNotifError({ message: errMsg(e) });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const download = (id?: string, v?: number) =>
    downloadAiRubricExcel(id, v ? `v${v}` : 'aktif').catch((e) => showNotifError({ message: errMsg(e) }));
  const doActivate = (id: string, v: number) =>
    activate.mutateAsync(id).then(() => {
      showNotifSuccess({ message: `Versi ${v} diaktifkan` });
      setViewVersion(undefined);
      refresh();
    }, (e) => showNotifError({ message: errMsg(e) }));

  return (
    <div className="flex flex-col gap-4" data-testid="ai-rubric">
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between" data-tour="ai-rubric-bar">
          <div className="text-sm">
            <div className="font-semibold">Rubrik aktif: Marine {active ? `versi ${active.version}` : '-'}</div>
            <div className="text-xs text-muted-foreground">
              {active?.label} · {active?.items ?? 0} elemen · {fmtDate(active?.createdAt)}. Jenis rubrik Project menyusul.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => download()}>
              <Download className="mr-1.5 h-4 w-4" /> Ekspor Excel
            </Button>
            <Input className="h-9 w-48" placeholder="Label versi impor (opsional)" value={importLabel} onChange={(e) => setImportLabel(e.target.value)} />
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" data-testid="rubric-file" onChange={(e) => onImport(e.target.files?.[0])} />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importer.isPending}>
              {importer.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              Impor Excel
            </Button>
            <HelpTip text={'Impor memakai format berkas ekspor (sheet "csms", 20 kolom). Cara aman: Ekspor, ubah di Excel, lalu Impor. Setiap impor membuat versi baru yang langsung aktif; versi lama tetap tersimpan.'} />
          </div>
        </CardContent>
      </Card>

      {!editable && viewing && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Anda melihat versi {viewing.version} ({viewing.label}) yang tidak aktif. Aktifkan dulu untuk mengedit atau memakainya.
          <span className="flex-1" />
          <Button size="sm" className="h-7" onClick={() => doActivate(viewing.id, viewing.version)}>Aktifkan versi {viewing.version}</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setViewVersion(undefined)}>Kembali ke versi aktif</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        <Card>
          <CardContent className="p-2 max-h-[680px] overflow-y-auto" data-tour="ai-rubric-list">
            {isLoading && <Loader2 className="m-2 h-4 w-4 animate-spin" />}
            {items.map((i) => (
              <button key={i.no} type="button" onClick={() => setSelected(i.no)}
                className={cn('flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-muted', item?.no === i.no && 'bg-muted font-semibold')}>
                <span className="tabular-nums w-7">{i.no}</span>
                <span className="flex-1 truncate">{i.element}</span>
                <Badge variant="outline" className={cn('text-[10px] px-1', lintAll[i.no] >= 8 ? 'text-emerald-700' : 'text-amber-700')}>{lintAll[i.no]}/10</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {item && merged && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{item.no} {item.element}</CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1" data-tour="ai-rubric-sections">
                {SECTIONS.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSection(s.id)}
                    className={cn('rounded-full border px-2.5 py-0.5 text-[11px]', section === s.id ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300' : 'text-muted-foreground')}>
                    {s.title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">{SECTIONS.find((s) => s.id === section)?.intro}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 max-h-[560px] overflow-y-auto">
              {Object.entries(FIELD_HELP).filter(([, f]) => f.section === section).map(([k, f]) => (
                <label key={k} className="flex flex-col gap-1 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">{f.label} <HelpTip text={f.help} example={f.example} /></span>
                  <Textarea
                    data-testid={`rubric-field-${k}`}
                    className="text-xs min-h-[60px]"
                    rows={f.rows ?? 2}
                    readOnly={!editable}
                    placeholder={f.example}
                    value={merged[k] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                  />
                </label>
              ))}
              {editable && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <span className="text-xs text-muted-foreground">{changed.length ? `${changed.length} kolom diubah` : 'Belum ada perubahan'}</span>
                  <span className="flex-1" />
                  <Input className="h-9 w-64" placeholder="Label versi (wajib), mis. Kalibrasi 4.5" value={label}
                    onChange={(e) => setLabel(e.target.value)} data-testid="rubric-label" />
                  <Button size="sm" onClick={save} disabled={!changed.length || !label.trim() || update.isPending} data-testid="rubric-save">
                    {update.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                    Simpan sebagai versi baru
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {lint && merged && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                Pemeriksa kualitas · {lint.score}/10
                <HelpTip text="Pemeriksaan otomatis saat mengetik. Nilai 8 ke atas berarti AI punya cukup petunjuk untuk menilai elemen ini secara konsisten." />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs" data-testid="rubric-lint" data-tour="ai-rubric-lint">
              {lint.issues.map((i) => (
                <div key={i.text} className="flex gap-1.5">
                  {i.level === 'ok' ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />}
                  <span>{i.text}</span>
                </div>
              ))}
              {lint.checks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {lint.checks.map((c) => (
                    <Badge key={c.label} variant="outline" className={cn('text-[10px]',
                      c.cls === 'Wajib' ? 'border-rose-300 text-rose-700' : c.cls === 'Pendukung' ? 'border-sky-300 text-sky-700' : c.cls === 'Utama' ? 'border-purple-300 text-purple-700' : '')}>
                      {c.label.replace(/^Check_/, '')}{c.cls ? ` · ${c.cls}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowPreview((v) => !v)}>
                <Eye className="mr-1.5 h-4 w-4" /> {showPreview ? 'Tutup' : 'Lihat yang dibaca juri AI'}
              </Button>
              {showPreview && (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-[10px] leading-relaxed">{jurorPreview(merged)}</pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Riwayat versi</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto" data-tour="ai-rubric-versions">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1.5 text-left font-medium">Versi</th>
                <th className="py-1.5 text-left font-medium">Label / sumber</th>
                <th className="py-1.5 text-left font-medium">Dibuat</th>
                <th className="py-1.5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(versions ?? []).map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-1.5">
                    v{v.version} {v.isActive && <Badge className="ml-1 text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />aktif</Badge>}
                    {!v.isActive && /draf/i.test(v.label) && <Badge variant="outline" className="ml-1 text-[10px] border-purple-300 text-purple-700">draf</Badge>}
                  </td>
                  <td className="py-1.5">{v.label}{v.sourceFilename ? ` · ${v.sourceFilename}` : ''}</td>
                  <td className="py-1.5">{fmtDate(v.createdAt)}{v.createdBy ? ` · ${v.createdBy}` : ''}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {!v.isActive && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewVersion(v.id)}>Lihat</Button>}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTrialVersion({ id: v.id, version: v.version })} data-testid="rubric-trial">Uji</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => download(v.id, v.version)}>Ekspor</Button>
                    {!v.isActive && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={activate.isPending} onClick={() => doActivate(v.id, v.version)}>Aktifkan</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <TrialResults />
      <TrialDialog version={trialVersion} onClose={() => setTrialVersion(null)} />
    </div>
  );
};

/** In-app version of docs/safeview-demo/GUIDE_KALIBRASI_AI.md */
const GuideTab = ({ go }: { go: (tab: TabId) => void }) => {
  const { data: versions } = useAiRubricVersions();
  const { data: quality } = useAiQuality();
  const drafts = (versions ?? []).filter((v) => !v.isActive && /draf/i.test(v.label));
  const synthetic = (quality?.corrections ?? []).filter((c) => c.source === 'sintetis').length;
  const steps: { title: string; body: string[]; action?: [string, TabId] }[] = [
    {
      title: 'Lihat elemen dengan selisih terbesar',
      body: ['Buka tab Kualitas AI dan urutkan dari Rata-rata selisih.', 'Pilih 5 sampai 10 elemen dengan selisih terbesar.'],
      action: ['Buka Kualitas AI', 'quality'],
    },
    {
      title: 'Baca checklist AI pada elemen tersebut',
      body: [
        'Di kontrak terkait, buka catatan AI elemen dan lihat bagian Checklist rubrik.',
        'Tandai Check yang AI nilai TIDAK/SEBAGIAN padahal menurut Anda elemen layak skor tinggi.',
        'Tentukan kelasnya: Wajib (tanpa ini skor maks. 3), Utama (menentukan 6), Pendukung (hanya membedakan 6 dan 10).',
      ],
    },
    {
      title: 'Tinjau draf rubrik terkalibrasi',
      body: [
        drafts.length ? `Tersedia ${drafts.length} draf: ${drafts.map((d) => `v${d.version}`).join(', ')}. Draf disiapkan otomatis dan belum aktif.` : 'Belum ada draf kalibrasi.',
        'Periksa tanda [Wajib]/[Utama]/[Pendukung] di Kriteria evaluasi, aturan kalibrasi di Skor 3/6/10, dan kalimat yang bisa terbaca terbalik.',
        'Pemeriksa kualitas di kanan membantu menemukan yang kurang.',
      ],
      action: ['Buka Rubrik AI', 'rubric'],
    },
    {
      title: 'Tinjau koreksi',
      body: [
        `${synthetic} koreksi bertanda sintetis disusun dari selisih AI dan evaluator. Hapus yang tidak tepat.`,
        'Koreksi yang baik singkat dan spesifik, mis. "Evaluator memberi 10 karena MWT ditandatangani nakhoda tiap bulan; uji lab KAN tidak wajib untuk kapal."',
      ],
      action: ['Buka Kualitas AI', 'quality'],
    },
    {
      title: 'Uji sebelum mengaktifkan',
      body: [
        'Aktifkan versi draf, lalu jalankan Evaluasi AI mode Menyeluruh pada 2 sampai 3 folder penilaian yang sudah final (set acuan).',
        'Pakai versi baru bila skor sama persis ≥ 70% dan selisih ≤ 1 tingkat ≥ 95%. Bila lebih buruk, aktifkan kembali versi sebelumnya.',
      ],
    },
    {
      title: 'Rutin',
      body: [
        'Saat skor Anda berbeda dari AI, isi Koreksi untuk AI di dialog Penilaian (1 sampai 2 kalimat).',
        'Badge "Berkas berubah" berarti ada berkas baru setelah penilaian AI: jalankan ulang elemen itu.',
        'Sebulan sekali: cek tab Kualitas AI dan ulangi langkah 1 sampai 5 untuk elemen yang selisihnya masih besar.',
      ],
    },
  ];
  return (
    <div className="flex flex-col gap-3" data-testid="ai-guide">
      <p className="text-sm text-muted-foreground">
        Tujuan: skor AI makin dekat dengan penilaian evaluator, dengan memperbaiki rubrik dan memberi contoh koreksi. Sistem menyiapkan draf;
        tim HSE meninjau dan memutuskan. Putaran pertama sekitar 1 jam.
      </p>
      {steps.map((s, i) => (
        <Card key={s.title}>
          <CardContent className="p-4 flex gap-3">
            <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">{i + 1}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">{s.title}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{s.body.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            {s.action && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => go(s.action![1])}>{s.action[0]}</Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const AiCsmsAdmin = () => {
  const [tab, setTab] = useState<TabId>('quality');
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">AI CSMS</h1>
        <p className="text-sm text-muted-foreground">Kualitas penilaian AI, rubrik (knowledge base) yang dipakai juri AI, dan panduan kalibrasinya.</p>
      </div>
      <HowItWorks />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList data-tour="ai-tabs">
          <TabsTrigger value="quality">Kualitas AI</TabsTrigger>
          <TabsTrigger value="rubric">Rubrik AI</TabsTrigger>
          <TabsTrigger value="guide">Panduan kalibrasi</TabsTrigger>
        </TabsList>
        <TabsContent value="quality" className="mt-4">
          <QualityTab onFix={(code) => { setFocus(code); setTab('rubric'); }} />
        </TabsContent>
        <TabsContent value="rubric" className="mt-4"><RubricTab focus={focus} /></TabsContent>
        <TabsContent value="guide" className="mt-4"><GuideTab go={setTab} /></TabsContent>
      </Tabs>
    </div>
  );
};

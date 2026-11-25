import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ReactECharts } from '@/components/custom/charts';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Download, Loader2, Sparkles } from 'lucide-react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { AiReasoningView } from './AiReasoningView';
import { AiApplyDialog } from './AiApplyDialog';

/**
 * "Result CSMS AI": manual (evaluator) vs AI score per category and element, from the folder tree that is
 * already loaded on the page (no extra request). Excel export uses the existing export endpoint.
 */

const LEVELS = [0, 3, 6, 10];
const level = (s: number) => LEVELS.reduce((b, l, i) => (Math.abs(l - s) < Math.abs(LEVELS[b] - s) ? i : b), 0);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : parseFloat(String(v)));
const isAiNote = (n?: string | null) => !!n && n.startsWith('HASIL PENILAIAN AI');
const headOf = (n?: string | null) => {
  const h = n?.split('\n')[1] ?? '';
  const c = h.match(/Tingkat keyakinan:\s*([\d.,]+)/);
  const m = h.match(/Mode:\s*(\S+)/);
  return { confidence: c ? parseFloat(c[1].replace(',', '.')) : null, mode: m?.[1] ?? null };
};
const fmtScore = (s: number) => (Number.isNaN(s) || s < 0 ? '-' : s % 1 === 0 ? String(s) : s.toFixed(1));
export const MIN_CONFIDENCE = 0.85;

type Element = {
  node: ContractFolder;
  manual: number; // NaN = not assessed
  assessed: boolean;
  ai: number; // NaN = no AI result
  confidence: number | null;
  mode: string | null;
  gap: number | null; // level difference AI - manual
};
type Category = { node: ContractFolder; code: string; name: string; elements: Element[]; manual: number; ai: number };

const elementOf = (n: ContractFolder): Element => {
  const assessed = n.status !== 'pending';
  const manual = num(n.score);
  const ai = isAiNote(n.aiReasoning) ? num(n.aiScore) : NaN;
  const { confidence, mode } = headOf(n.aiReasoning);
  const gap = assessed && !Number.isNaN(ai) && manual >= 0 ? level(ai) - level(manual) : null;
  return { node: n, manual, assessed, ai, confidence, mode, gap };
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : NaN);

export const buildAiComparison = (root: ContractFolder) => {
  const top = root.children?.find((c) => c.name === 'A. RENCANA K3LL' && c.fileType === 'folder') ?? root;
  const cats: Category[] = (top.children || [])
    .filter((c) => c.fileType === 'folder' && /^[1-8]\s/.test(c.name))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name))
    .map((cat) => {
      const code = cat.name.split(' ')[0];
      const elements = /^[12]\s/.test(cat.name)
        ? [elementOf(cat)]
        : (cat.children || []).filter((c) => c.fileType === 'folder' && new RegExp(`^${code}\\.\\d+`).test(c.name)).map(elementOf);
      return {
        node: cat,
        code,
        name: cat.name.replace(/^\S+\s+/, ''),
        elements,
        manual: avg(elements.filter((e) => e.assessed && e.manual >= 0).map((e) => e.manual)),
        ai: avg(elements.filter((e) => !Number.isNaN(e.ai) && e.ai >= 0).map((e) => e.ai)),
      };
    });
  const total = (pick: (c: Category) => number) => {
    const xs = cats.map(pick).filter((x) => !Number.isNaN(x));
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / (xs.length * 10)) * 1000) / 10 : NaN;
  };
  const all = cats.flatMap((c) => c.elements);
  const compared = all.filter((e) => e.gap !== null);
  return {
    cats,
    totalManual: total((c) => c.manual),
    totalAi: total((c) => c.ai),
    compared: compared.length,
    exactPct: compared.length ? Math.round((100 * compared.filter((e) => e.gap === 0).length) / compared.length) : 0,
    nearPct: compared.length ? Math.round((100 * compared.filter((e) => Math.abs(e.gap!) <= 1).length) / compared.length) : 0,
    lowConfidence: all.filter((e) => e.confidence !== null && e.confidence < MIN_CONFIDENCE).length,
  };
};

const GapBadge = ({ gap }: { gap: number | null }) =>
  gap === null ? <span className="text-muted-foreground">-</span> : gap === 0 ? (
    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">sama</Badge>
  ) : (
    <Badge variant="outline" className={cn(Math.abs(gap) >= 2 ? 'border-rose-300 text-rose-700 dark:text-rose-300' : 'border-amber-300 text-amber-700 dark:text-amber-300')}>
      {gap > 0 ? '+' : '−'}{Math.abs(gap)} tingkat
    </Badge>
  );

export const AiResultDashboard = ({
  open,
  onOpenChange,
  root,
  canApply,
  onExport,
  isExporting,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  root: ContractFolder;
  canApply: boolean;
  onExport: () => void;
  isExporting?: boolean;
  onChanged?: () => void;
}) => {
  const data = useMemo(() => buildAiComparison(root), [root]);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [applyScope, setApplyScope] = useState<{ id: string; label: string } | null>(null);

  const option = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Manual', 'AI'], top: 0 },
    grid: { left: 32, right: 12, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: data.cats.map((c) => c.code) },
    yAxis: { type: 'value', min: 0, max: 10 },
    series: [
      { name: 'Manual', type: 'bar', data: data.cats.map((c) => (Number.isNaN(c.manual) ? null : c.manual)), itemStyle: { color: '#2563eb' } },
      { name: 'AI', type: 'bar', data: data.cats.map((c) => (Number.isNaN(c.ai) ? null : c.ai)), itemStyle: { color: '#7c3aed' } },
    ],
  }), [data]);

  const toggleCat = (code: string) =>
    setOpenCats((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  const kpis = [
    { label: 'Skor total manual', value: fmtScore(data.totalManual), tip: 'Rata-rata kategori 1 sampai 8 dalam skala 0 sampai 100' },
    { label: 'Skor total AI', value: fmtScore(data.totalAi), tip: 'Dihitung dengan cara yang sama dari skor AI' },
    { label: 'Sama persis', value: `${data.exactPct}%`, tip: `Dari ${data.compared} elemen yang sudah dinilai evaluator dan AI` },
    { label: 'Selisih ≤ 1 tingkat', value: `${data.nearPct}%`, tip: 'Tingkat skor: 0, 3, 6, 10' },
    { label: `Keyakinan < ${MIN_CONFIDENCE.toLocaleString('id-ID')}`, value: `${data.lowConfidence} elemen`, tip: 'Perlu ditinjau evaluator' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[960px] overflow-y-auto" data-testid="ai-result-dashboard">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" /> Hasil CSMS AI</SheetTitle>
          <SheetDescription>{root.name}: perbandingan skor manual (evaluator) dan skor AI per kategori.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={onlyDiff} onCheckedChange={(v) => setOnlyDiff(v === true)} data-testid="ai-only-diff" /> Hanya yang berbeda
            </label>
            <div className="flex-1" />
            {canApply && (
              <Button variant="outline" size="sm" onClick={() => setApplyScope({ id: root.id, label: 'Seluruh kategori' })} data-testid="ai-apply-all">
                <Sparkles className="mr-1.5 h-4 w-4" /> Terapkan rekomendasi AI
              </Button>
            )}
            <Button size="sm" onClick={onExport} disabled={isExporting} data-testid="ai-export-excel">
              {isExporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Ekspor Excel
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {kpis.map((k) => (
              <Card key={k.label} title={k.tip}>
                <CardContent className="p-3">
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
                  <div className="text-xl font-semibold tabular-nums">{k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-3">
              <div className="text-xs font-medium mb-1">Skor per kategori (0 sampai 10)</div>
              <div style={{ height: 220 }}><ReactECharts options={option as any} className="w-full h-full" /></div>
            </CardContent>
          </Card>

          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-xs" data-testid="ai-result-table">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Kategori / elemen</th>
                  <th className="p-2 text-right font-medium">Manual</th>
                  <th className="p-2 text-right font-medium">AI</th>
                  <th className="p-2 text-left font-medium">Selisih</th>
                  <th className="p-2 text-right font-medium">Keyakinan</th>
                  <th className="p-2 text-left font-medium">Mode</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {data.cats.map((c) => {
                  const rows = c.elements.filter((e) => !onlyDiff || (e.gap !== null && e.gap !== 0));
                  if (onlyDiff && !rows.length) return null;
                  const isOpen = openCats.has(c.code) || onlyDiff;
                  const catGap = !Number.isNaN(c.manual) && !Number.isNaN(c.ai) ? level(c.ai) - level(c.manual) : null;
                  return (
                    <React.Fragment key={c.code}>
                      <tr className="border-t bg-muted/30">
                        <td className="p-2">
                          <button type="button" className="flex items-center gap-1 font-semibold text-left" onClick={() => toggleCat(c.code)}>
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} {c.code} {c.name}
                          </button>
                        </td>
                        <td className="p-2 text-right font-semibold tabular-nums">{fmtScore(c.manual)}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">{fmtScore(c.ai)}</td>
                        <td className="p-2"><GapBadge gap={catGap} /></td>
                        <td />
                        <td />
                        <td className="p-2 text-right">
                          {canApply && c.elements.some((e) => !Number.isNaN(e.ai)) && (
                            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-purple-700 dark:text-purple-300"
                              onClick={() => setApplyScope({ id: c.node.id, label: `Kategori ${c.code} ${c.name}` })} data-testid="ai-apply-category">
                              Pakai rekomendasi AI
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isOpen && rows.map((e) => (
                        <React.Fragment key={e.node.id}>
                          <tr className="border-t">
                            <td className="p-2 pl-7">{e.node.name}</td>
                            <td className="p-2 text-right tabular-nums">{e.assessed ? fmtScore(e.manual) : <span className="text-muted-foreground">belum</span>}</td>
                            <td className="p-2 text-right tabular-nums">{fmtScore(e.ai)}</td>
                            <td className="p-2"><GapBadge gap={e.gap} /></td>
                            <td className="p-2 text-right tabular-nums">
                              {e.confidence === null ? '-' : (
                                <span className={cn(e.confidence < MIN_CONFIDENCE && 'text-amber-700 dark:text-amber-400 font-semibold')}>
                                  {e.confidence.toLocaleString('id-ID')}{e.confidence < MIN_CONFIDENCE ? ' · tinjau' : ''}
                                </span>
                              )}
                            </td>
                            <td className="p-2">{e.mode ?? '-'}</td>
                            <td className="p-2 text-right">
                              {isAiNote(e.node.aiReasoning) && (
                                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setNote(note === e.node.id ? null : e.node.id)}>
                                  {note === e.node.id ? 'Tutup' : 'Catatan AI'}
                                </Button>
                              )}
                            </td>
                          </tr>
                          {note === e.node.id && (
                            <tr><td colSpan={7} className="p-3 bg-purple-50/40 dark:bg-purple-950/10"><AiReasoningView text={e.node.aiReasoning} /></td></tr>
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Skor kategori = rata-rata elemen yang sudah dinilai. Selisih dihitung dalam tingkat skor (0, 3, 6, 10); positif berarti AI lebih tinggi.
          </p>
        </div>

        <AiApplyDialog
          folderId={applyScope?.id ?? null}
          scopeLabel={applyScope?.label ?? ''}
          open={!!applyScope}
          onOpenChange={(o) => !o && setApplyScope(null)}
          onApplied={onChanged}
        />
      </SheetContent>
    </Sheet>
  );
};

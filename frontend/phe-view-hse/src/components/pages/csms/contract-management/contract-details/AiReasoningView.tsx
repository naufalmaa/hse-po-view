import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { ContractFolder } from '@/service/csms/folder-detail';

/**
 * Renders the formal AI assessment note written by csms-ai (server/reasoning_format.py):
 *   HASIL PENILAIAN AI - <element> / Skor akhir ... / 1. KESIMPULAN / 2. PENILAIAN JURI (2.1..2.3)
 *   / 3. REKOMENDASI ... / 4. DOKUMEN ...
 * Notes in older formats are shown as plain text.
 */

type Juror = { title: string; score: string; confidence: string; groups: { label: string; items: string[] }[] };
type Check = { label: string; status: 'TERPENUHI' | 'SEBAGIAN' | 'TIDAK'; note: string };
type Parsed = {
  mode: string;
  checks: Check[];
  score: string;
  status: string;
  confidence: string;
  conclusion: string;
  jurors: Juror[];
  recommendations: string[];
  documents: string[];
};

export const parseAiReasoning = (text?: string | null): Parsed | null => {
  if (!text || !text.startsWith('HASIL PENILAIAN AI')) return null;
  const lines = text.split('\n');
  const head = lines[1]?.match(/Skor akhir:\s*([^\s]+)\s*\(([^)]+)\)\s*\|\s*Tingkat keyakinan:\s*([^|]+?)\s*(?:\|\s*Mode:\s*(.+))?$/);
  const out: Parsed = {
    mode: head?.[4]?.trim() ?? '',
    checks: [],
    score: head?.[1] ?? '-',
    status: head?.[2] ?? '',
    confidence: head?.[3]?.trim() ?? '-',
    conclusion: '',
    jurors: [],
    recommendations: [],
    documents: [],
  };
  // section by title: 1 = kesimpulan, 2 = juri, 3 = rekomendasi, 4 = dokumen, 5 = checklist
  let section = 0;
  const sectionOf = (title: string) =>
    /KESIMPULAN/.test(title) ? 1 : /PENILAIAN JURI/.test(title) ? 2 : /REKOMENDASI/.test(title) ? 3 : /DOKUMEN/.test(title) ? 4 : /CHECKLIST/.test(title) ? 5 : 0;
  let juror: Juror | null = null;
  let group: { label: string; items: string[] } | null = null;
  for (const raw of lines.slice(2)) {
    const line = raw.trimEnd();
    const sec = line.match(/^\d\.\s+([A-Z].*)$/);
    if (sec) {
      section = sectionOf(sec[1]);
      continue;
    }
    const t = line.trim();
    if (!t) continue;
    if (section === 1) {
      out.conclusion = out.conclusion ? `${out.conclusion} ${t}` : t;
    } else if (section === 2) {
      const jh = t.match(/^\d\.\d\s+(.+?)\s+-\s+skor\s+(\S+)\s+\(keyakinan\s+([^)]+)\)$/);
      const gl = t.match(/^(Temuan|Bukti|Kekurangan):$/);
      const it = t.match(/^[a-z]\.\s+(.*)$/);
      if (jh) {
        juror = { title: jh[1], score: jh[2], confidence: jh[3], groups: [] };
        out.jurors.push(juror);
        group = null;
      } else if (gl && juror) {
        group = { label: gl[1], items: [] };
        juror.groups.push(group);
      } else if (it && group) {
        group.items.push(it[1]);
      }
    } else if (section === 5) {
      const c = t.match(/^(Check_[^:]+):\s*(TERPENUHI|SEBAGIAN|TIDAK)\s*(?:-\s*(.*))?$/);
      if (c) out.checks.push({ label: c[1], status: c[2] as Check['status'], note: c[3] ?? '' });
    } else if (section === 3 || section === 4) {
      const it = t.match(/^[a-z]\.\s+(.*)$/);
      if (it) (section === 3 ? out.recommendations : out.documents).push(it[1]);
    }
  }
  return out;
};

const scoreTone = (s: string) => {
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 'bg-muted text-muted-foreground border-border';
  return n >= 6
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800';
};

/** "file.pdf: quote" -> clickable file name when the file belongs to this element. */
const EvidenceItem = ({ text, files, onViewFile }: { text: string; files?: ContractFolder[]; onViewFile?: (f: ContractFolder) => void }) => {
  const idx = text.indexOf(':');
  const name = idx > 0 ? text.slice(0, idx).trim().replace(/^"|"$/g, '') : '';
  const quote = idx > 0 ? text.slice(idx + 1).trim() : text;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[_]+/g, ' ');
  const file = name
    ? files?.find((f) => norm(f.name) === norm(name) || norm(String((f as any).filePath ?? '')).endsWith(norm(name)) || norm(f.name).includes(norm(name)))
    : undefined;
  return (
    <li>
      {name &&
        (file && onViewFile ? (
          <button type="button" onClick={() => onViewFile(file)} className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400 hover:underline">
            <FileText className="h-3 w-3" />
            {name}
          </button>
        ) : (
          <span className="font-medium">{name}</span>
        ))}
      {name ? ': ' : ''}
      <span className="italic">{quote}</span>
    </li>
  );
};

export const AiReasoningView = ({
  text,
  files,
  onViewFile,
  compact = false,
}: {
  text?: string | null;
  files?: ContractFolder[];
  onViewFile?: (f: ContractFolder) => void;
  compact?: boolean;
}) => {
  const p = parseAiReasoning(text);
  if (!p) {
    return (
      <div className="whitespace-pre-wrap max-h-[180px] overflow-y-auto text-xs bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30 text-purple-950 dark:text-purple-200 leading-relaxed">
        {text}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3 text-xs', compact && 'max-h-[340px] overflow-y-auto pr-1')}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-[11px]', scoreTone(p.score))}>
          Skor {p.score} · {p.status}
        </Badge>
        <span className="text-muted-foreground">Tingkat keyakinan {p.confidence}</span>
        {p.mode && <Badge variant="outline" className="text-[10px]">{p.mode}</Badge>}
      </div>

      <section>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Kesimpulan</div>
        <p className="leading-relaxed text-foreground">{p.conclusion}</p>
      </section>

      {p.checks.length > 0 && (
        <section>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Checklist rubrik</div>
          <div className="rounded-lg border border-border overflow-hidden">
            {p.checks.map((c) => (
              <div key={c.label} className="flex items-start gap-2 px-2 py-1 text-[11px] border-b border-border last:border-0">
                <span className={cn('mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  c.status === 'TERPENUHI' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : c.status === 'SEBAGIAN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')}>
                  {c.status === 'TERPENUHI' ? '✓' : c.status === 'SEBAGIAN' ? '◐' : '✗'}
                </span>
                <span className="font-medium min-w-[9rem]">{c.label.replace(/^Check_\d+_/, '').replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">{c.note}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.jurors.length > 0 && (
        <section>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Penilaian Juri</div>
          <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
            {p.jurors.map((j) => (
              <div key={j.title} className="rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-950 p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-purple-900 dark:text-purple-100 text-[11px]">{j.title}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{j.confidence}</Badge>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', scoreTone(j.score))}>{j.score}/10</Badge>
                  </div>
                </div>
                {j.groups.map((g) => (
                  <div key={g.label} className="mt-1.5">
                    <div className="text-[10px] font-semibold text-muted-foreground">{g.label}</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-700 dark:text-gray-300">
                      {g.items.map((it, i) =>
                        g.label === 'Bukti' ? <EvidenceItem key={i} text={it} files={files} onViewFile={onViewFile} /> : <li key={i}>{it}</li>,
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {(p.recommendations.length > 0 || p.documents.length > 0) && (
        <section className={cn('grid gap-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20 p-2.5', !compact && 'md:grid-cols-2')}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rekomendasi untuk skor 10</div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">{p.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
          {p.documents.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dokumen yang perlu dilengkapi</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">{p.documents.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

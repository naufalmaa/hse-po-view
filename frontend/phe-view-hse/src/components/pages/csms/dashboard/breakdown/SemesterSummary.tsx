import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SemesterCompletionRateExtended } from './types';
import ProgressBar from './ProgressBar';

interface SemesterSummaryProps {
    semester: number;
    data: SemesterCompletionRateExtended;
    year: number;
    t: any;
}

const SummaryStat = ({ label, value, fg, bg, border }: { label: string, value: string | number, fg: string, bg: string, border: string }) => (
    <div
        className={cn("p-2 rounded-lg text-center border", bg, border)}
    >
        <div className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</div>
        <div className={cn("text-[17px] font-bold mt-0.5 tracking-tight", fg)}>{value}</div>
    </div>
);

export const SemesterSummary: React.FC<SemesterSummaryProps> = ({ semester, data, year, t }) => {
    const items = data.items || [];
    const total = items.length;
    const completed = items.filter(i => i.isFinal).length;
    const ongoing = items.filter(i => !i.isFinal).length;
    const avgProgress = total > 0 ? Math.round(items.reduce((s, i) => s + (i.fillingProgress || 0), 0) / total) : 0;

    return (
        <div className="p-4 bg-card border border-border rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <span className="w-[30px] h-[30px] rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar size={16} />
                </span>
                <div className="text-[14px] font-bold text-foreground">
                    {t(($: { csms: { dashboard: { completionRate: { semester: any; }; }; }; }) => $.csms.dashboard.completionRate.semester)} {semester === 1 ? 'I' : 'II'} {year}
                </div>
                <div className="flex-1" />
                <span
                    className="px-2.5 py-1 rounded text-[11px] font-bold text-white"
                    style={{ backgroundColor: avgProgress >= 50 ? '#3D6FE8' : '#D9462B' }}
                >
                    {avgProgress}%
                </span>
            </div>

            <div>
                <div className="flex justify-between mb-1.5">
                    <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t(($: { csms: { dashboard: { completionRate: { completionRate: any; }; }; }; }) => $.csms.dashboard.completionRate.completionRate)}
                    </span>
                    <span className="text-[11px] font-bold text-foreground">{avgProgress}%</span>
                </div>
                <ProgressBar value={avgProgress} color="#3D6FE8" />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <SummaryStat
                    label={t(($: { csms: { dashboard: { completionRate: { total: any; }; }; }; }) => $.csms.dashboard.completionRate.total)}
                    value={total} fg="text-foreground" bg="bg-card" border="border-border"
                />
                <SummaryStat
                    label={t(($: { csms: { dashboard: { completionRate: { completed: any; }; }; }; }) => $.csms.dashboard.completionRate.completed)}
                    value={completed} fg="text-green-600 dark:text-green-400" bg="bg-green-50/50 dark:bg-green-950/20" border="border-green-100 dark:border-green-900/40"
                />
                <SummaryStat
                    label={t(($: { csms: { dashboard: { breakdown: { ongoingLabel: any; }; }; }; }) => $.csms.dashboard.breakdown.ongoingLabel)}
                    value={ongoing} fg="text-amber-600 dark:text-amber-400" bg="bg-amber-50/50 dark:bg-amber-950/20" border="border-amber-100 dark:border-amber-900/40"
                />
            </div>
        </div>
    );
};

export default SemesterSummary;

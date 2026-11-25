import React from 'react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from "@/lib/i18n-typed";

interface EvaluationBadgeProps {
    evaluated: boolean;
    date?: string;
    score?: number | null;
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

export const EvaluationBadge: React.FC<EvaluationBadgeProps> = ({ evaluated, date, score }) => {
    const { t } = useAppTranslation();

    if (evaluated) {
        const passed = score != null && score >= 60;
        const statusLabel = score == null ? null : (passed ? t($ => $.csms.dashboard.breakdown.passedStatus) : t($ => $.csms.dashboard.breakdown.failedStatus));
        const statusClass = passed 
            ? 'bg-[#E7F5EC] dark:bg-green-950/30 text-[#1F8A4F] dark:text-green-400 border-[#9BD3B0] dark:border-green-900/30' 
            : 'bg-[#FEE7E2] dark:bg-red-950/30 text-[#B0331C] dark:text-red-400 border-[#F2A89A] dark:border-red-900/30';

        return (
            <span
                className="inline-flex items-center rounded-full overflow-hidden border border-[#C8D8F2] dark:border-blue-900/40 text-[11.5px] font-semibold"
                title={date ? t($ => $.csms.dashboard.breakdown.assessedAtDate).replace('{{date}}', formatDate(date)) : t($ => $.csms.dashboard.breakdown.assessed)}
            >
                {statusLabel && (
                    <span
                        className={cn("px-2 py-0.5 border-r dark:border-blue-900/40", statusClass)}
                    >
                        {statusLabel}
                    </span>
                )}
                {score != null && (
                    <span className="px-2 py-0.5 bg-[#1E4FB5] dark:bg-blue-900 text-white dark:text-blue-100 tabular-nums">
                        {score.toFixed(2)}
                    </span>
                )}
                {score == null && (
                    <span className="px-2 py-0.5 bg-[#EEF4FF] dark:bg-blue-950/40 text-[#1E4FB5] dark:text-blue-400">
                        {t($ => $.csms.dashboard.breakdown.assessed)}
                    </span>
                )}
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-50/50 dark:bg-stone-900/30 text-[#7A7468] dark:text-muted-foreground text-[11.5px] font-semibold border border-dashed border-stone-200 dark:border-stone-800"
            title={t($ => $.csms.dashboard.breakdown.noComplianceAssessment)}
        >
            <span className="text-[9px]">○</span>
            {t($ => $.csms.dashboard.breakdown.notAssessedYet)}
        </span>
    );
};

export default EvaluationBadge;
export { formatDate };

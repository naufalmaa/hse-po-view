import React, { useState } from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { cn } from '@/lib/utils';
import { CompletionRateItemExtended } from './types';
import { getComplianceTier, getTierClasses } from './utils';
import ContractCard from './ContractCard';

interface TypeGroupProps {
    type: string;
    items: CompletionRateItemExtended[];
    navigate: any;
}

export const TypeGroup: React.FC<TypeGroupProps> = ({ type, items, navigate }) => {
    const { t } = useAppTranslation();
    const [expanded, setExpanded] = useState(true);
    const isPB = type.toUpperCase().includes('PB') || type.toUpperCase().includes('BERJALAN');
    const label = isPB ? 'Penilaian Berjalan (PB)' : 'Penilaian Akhir (PA)';
    const icon = isPB ? 'PB' : 'PA';

    // Colors based on TypePill logic
    const bg = isPB ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-purple-50 dark:bg-purple-950/40';
    const fg = isPB ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400';

    // Aggregates
    const completedCount = items.filter(i => i.isFinal).length;
    const submissionRate = items.length > 0
        ? Math.round(items.reduce((s, i) => s + (i.fillingProgress || 0), 0) / items.length)
        : 0;
    const complianceRate = items.length > 0
        ? Math.round(items.reduce((s, i) => s + (i.isFinal ? 100 : 0), 0) / items.length)
        : 0;

    const tier = getComplianceTier(complianceRate);
    const tc = getTierClasses(tier);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "w-full grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center p-3 rounded-xl border transition-all text-left",
                    tc.container
                )}
            >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black", bg, fg)}>
                    {icon}
                </div>

                <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-foreground truncate">{label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t($ => $.csms.dashboard.breakdown.contractsCountAndCompleted)
                            .replace('{{count}}', String(items.length))
                            .replace('{{completedCount}}', String(completedCount))}
                    </div>
                </div>

                <div className="flex items-stretch gap-0 border-l border-border pl-3">
                    <div className="text-right pr-3 border-r border-border">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Submission</div>
                        <div className="text-[13px] font-bold text-foreground mt-0.5">{submissionRate}%</div>
                    </div>
                    <div className="text-right pl-3">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {t($ => $.csms.dashboard.breakdown.assessmentPerformanceValue).replace('{{type}}', icon)}
                        </div>
                        <div className="flex items-baseline gap-0.5 justify-end mt-0.5">
                            <span className={cn("text-[15px] font-bold", tc.text)}>{complianceRate}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">%</span>
                        </div>
                    </div>
                </div>

                <span className={cn(
                    "text-[14px] text-muted-foreground transition-transform duration-200 ml-2",
                    expanded ? "rotate-90" : "rotate-0"
                )}>
                    ›
                </span>
            </button>

            {expanded && (
                <div className="space-y-3 pl-5 ml-4 border-l-2 border-border py-1">
                    {items.map((item, idx) => (
                        <ContractCard key={`${item.contractId}-${idx}`} item={item} navigate={navigate} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TypeGroup;

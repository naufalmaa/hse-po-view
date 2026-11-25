import React, { useState } from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { cn } from '@/lib/utils';
import { CompletionRateItemExtended } from './types';
import ContractCard from './ContractCard';

interface StatusGroupProps {
    status: 'completed' | 'ongoing';
    items: CompletionRateItemExtended[];
    navigate: any;
}

export const StatusGroup: React.FC<StatusGroupProps> = ({ status, items, navigate }) => {
    const { t } = useAppTranslation();
    const [expanded, setExpanded] = useState(true);
    const label = status === 'completed' ? t($ => $.csms.dashboard.breakdown.statusCompleted) : t($ => $.csms.dashboard.breakdown.statusOngoing);
    const icon = status === 'completed' ? '✓' : '↻';
    
    // Classes
    const containerClass = status === 'completed'
        ? "bg-gradient-to-b from-[#F2FAF5] to-white dark:from-green-950/10 dark:to-stone-900/10 border-green-200 dark:border-green-900/30"
        : "bg-gradient-to-b from-[#FFF9EB] to-white dark:from-amber-950/10 dark:to-stone-900/10 border-amber-200 dark:border-amber-900/30";
    const textClass = status === 'completed' ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400";
    const ringClass = status === 'completed' ? "border-green-200 dark:border-green-900/40" : "border-amber-200 dark:border-amber-900/40";

    return (
        <div className="space-y-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left", containerClass)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg bg-card border flex items-center justify-center text-sm", ringClass, textClass)}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-[13.5px] font-bold text-foreground">{label}</div>
                        <div className="text-[11px] text-muted-foreground">
                            {t($ => $.csms.dashboard.breakdown.contractsCount).replace('{{count}}', String(items.length))}
                        </div>
                    </div>
                </div>
                <span className={cn(
                    "text-[14px] text-muted-foreground transition-transform duration-200",
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

export default StatusGroup;

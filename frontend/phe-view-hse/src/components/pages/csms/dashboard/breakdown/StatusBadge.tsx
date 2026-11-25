import React from 'react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from "@/lib/i18n-typed";

interface StatusBadgeProps {
    status: 'completed' | 'ongoing' | 'delayed' | 'reviewing';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const { t } = useAppTranslation();
    const map = {
        completed: { className: 'bg-[#E7F5EC] dark:bg-green-950/30 text-[#1F8A4F] dark:text-green-400', label: t($ => $.csms.dashboard.breakdown.statusCompleted), icon: '✓' },
        reviewing: { className: 'bg-[#EEF4FF] dark:bg-blue-950/30 text-[#1E4FB5] dark:text-blue-400', label: t($ => $.csms.dashboard.breakdown.statusReviewing), icon: '⚐' },
        delayed: { className: 'bg-[#FFF1E7] dark:bg-amber-950/30 text-[#B85B1A] dark:text-amber-400', label: t($ => $.csms.dashboard.breakdown.statusOngoing), icon: '◷' },
        ongoing: { className: 'bg-[#FFF1E7] dark:bg-amber-950/30 text-[#B85B1A] dark:text-amber-400', label: t($ => $.csms.dashboard.breakdown.statusOngoing), icon: '↻' },
    };
    const m = map[status] || map.ongoing;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap",
                m.className
            )}
        >
            <span className="text-[10px]">{m.icon}</span>{m.label}
        </span>
    );
};

export default StatusBadge;

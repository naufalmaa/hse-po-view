import React from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { AppRoute } from '@/constants/app-route';
import { cn } from '@/lib/utils';
import { CompletionRateItemExtended } from './types';
import ProgressBar from './ProgressBar';
import TypePill from './TypePill';
import StatusBadge from './StatusBadge';
import EvaluationBadge, { formatDate } from './EvaluationBadge';

interface ContractCardProps {
    item: CompletionRateItemExtended;
    navigate: any;
}

export const ContractCard: React.FC<ContractCardProps> = ({ item, navigate }) => {
    const { t } = useAppTranslation();
    const status = item.isFinal ? 'completed' : (item.fillingProgress === 100 ? 'reviewing' : 'ongoing');
    const type = item.contractfolderName;

    return (
        <div
            onClick={() => navigate({ to: AppRoute.csms.contractManagementDetails.url, search: { contractId: item.contractId } })}
            className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-3 p-3.5 bg-card text-card-foreground border border-border rounded-xl cursor-pointer transition-all hover:border-muted-foreground/30 hover:shadow-md dark:hover:shadow-black/25"
        >
            {/* Left rail: type pill */}
            <div className="flex flex-col items-center pt-0.5">
                <TypePill type={type} />
            </div>

            {/* Main Content Area */}
            <div className="min-w-0 flex flex-col gap-3">
                {/* Top: Title, Vendor, and Badges */}
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex flex-col">
                        <div className="text-[13.5px] font-semibold text-foreground truncate" title={item.contractTitle}>
                            {item.contractTitle}
                        </div>
                        <div className="flex gap-2 items-center mt-0.5 min-w-0">
                            <span className="text-[11.5px] text-muted-foreground truncate" title={item.vendorName || ''}>
                                {item.vendorName || '—'}
                            </span>
                            {item.vesselName && (
                                <span className="text-[10.5px] text-muted-foreground/80 whitespace-nowrap">· {item.vesselName}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 min-w-[140px] shrink-0">
                        <StatusBadge status={status} />
                        <EvaluationBadge evaluated={item.isFinal} date={item.dateAssessment} score={item.score} />
                    </div>
                </div>

                {/* Bottom: Progress Bar & Info */}
                <div className="w-full">
                    <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {t($ => $.csms.dashboard.breakdown.contractProgress)}
                        </span>
                        <span className="text-[11px] font-bold text-foreground">{item.fillingProgress}%</span>
                    </div>
                    <ProgressBar value={item.fillingProgress} color={item.fillingProgress === 100 ? '#22A85F' : '#E0A024'} />
                    <div className="flex justify-between items-center gap-2 text-[10.5px] text-muted-foreground/80 mt-1.5 flex-wrap">
                        <span className="truncate">{item.contractNumber || item.contractId.substring(0, 8)}</span>
                        <span className="whitespace-nowrap">
                            {t($ => $.csms.dashboard.breakdown.assessmentDate)} {formatDate(item.dateAssessment)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractCard;

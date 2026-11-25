import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalLevel } from './ContractCard';
import { useAppTranslation } from "@/lib/i18n-typed";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ApprovalStatus, ApprovalHistory } from '@/service/csms/contracts';

export type ApprovalStatusType = 'rejected' | 'pending' | 'waiting' | 'accept';

interface ApprovalStatusBadgeProps {
    status: ApprovalStatus;
    size?: 'sm' | 'md';
}

export function ApprovalStatusBadge({ status, size = 'md' }: ApprovalStatusBadgeProps) {
    const { isFullyApproved, nextRequiredLevel } = status;
    const { t } = useAppTranslation();

    if (isFullyApproved) {
        return (
            <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 font-medium",
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
            )}>
                <CheckCircle2 className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
                {t($ => $.contractList.statusFullyApproved)}
            </div>
        );
    }

    // If no history, it means we're at the start (pending evaluator)
    const currentLevel = nextRequiredLevel || 'evaluator';

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 text-orange-600 font-medium",
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        )}>
            <AlertCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            {t($ => $.contractList.statusPending, { level: currentLevel })}
        </div>
    );
}

interface ApprovalTimelineProps {
    status: ApprovalStatus;
    currentUserRole?: ApprovalLevel;
}

const APPROVAL_ORDER: ApprovalLevel[] = ['evaluator', 'verifikator', 'manager'] as ApprovalLevel[];

export function ApprovalTimeline({ status, currentUserRole }: ApprovalTimelineProps) {
    const { approvalHistory } = status;
    const nextRequiredLevel = status.nextRequiredLevel || 'evaluator';
    const { t } = useAppTranslation();

    const getStepInfo = (level: ApprovalLevel) => {
        const actions = approvalHistory[level as keyof ApprovalHistory];
        // Return only the last action if multiple exist
        return actions && actions.length > 0 ? actions[actions.length - 1] : undefined;
    };

    const getStepStatus = (level: ApprovalLevel): ApprovalStatusType => {
        const info = getStepInfo(level);
        if (info) {
            return info.status as ApprovalStatusType;
        }
        if (level === nextRequiredLevel) {
            return 'pending';
        }
        return 'waiting';
    };


    return (
        <div className="flex items-center w-full">
            {APPROVAL_ORDER.map((level, index) => {
                const stepStatus = getStepStatus(level);
                // Get full history for the popover
                const history = approvalHistory[level as keyof ApprovalHistory] || [];
                const isCurrentUserStep = level === currentUserRole && stepStatus === 'pending';
                const isLast = index === APPROVAL_ORDER.length - 1;

                return (
                    <div key={level} className={cn("flex items-center", !isLast && "flex-1")}>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 cursor-pointer",
                                    stepStatus === 'accept' && "bg-green-500 text-white",
                                    stepStatus === 'rejected' && "bg-red-500 text-white",
                                    stepStatus === 'pending' && "bg-orange-500 text-white animate-pulse",
                                    stepStatus === 'waiting' && "bg-muted text-muted-foreground",
                                    isCurrentUserStep && "ring-2 ring-orange-500 ring-offset-2"
                                )}>
                                    {stepStatus === 'accept' ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : stepStatus === 'rejected' ? (
                                        <XCircle className="h-4 w-4" />
                                    ) : (
                                        level.charAt(0).toUpperCase()
                                    )}
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-3">
                                    <div className="font-medium capitalize text-base border-b pb-2 flex justify-between items-center">
                                        <span>{level}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            stepStatus === 'accept' && "bg-green-100 text-green-700",
                                            stepStatus === 'rejected' && "bg-red-100 text-red-700",
                                            stepStatus === 'pending' && "bg-yellow-100 text-yellow-700",
                                            stepStatus === 'waiting' && "bg-gray-100 text-gray-700"
                                        )}>
                                            {stepStatus}
                                        </span>
                                    </div>

                                    {history.length > 0 ? (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {[...history].reverse().map((action, i) => (
                                                <div key={i} className="flex flex-col gap-1 text-sm bg-muted/30 p-2 rounded-md">
                                                    <div className="flex flex-col justify-between items-start mb-2">
                                                        <span className="font-medium truncate" title={action.userName}>
                                                            {action.userName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {new Date(action.approvedAt).toLocaleDateString()} {new Date(action.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                            action.status === 'accept' ? "bg-green-100 text-green-700" :
                                                                action.status === 'rejected' ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                                                                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                                        )}>
                                                            {action.status === 'accept' ? 'Accepted' :
                                                                action.status === 'rejected' ? 'Rejected' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    {action.note && (
                                                        <div className="text-xs mt-1 bg-background p-1.5 rounded border">
                                                            <span className="font-semibold mr-1">Note:</span>
                                                            {action.note}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic py-2 text-center">
                                            No history recorded
                                        </div>
                                    )}

                                    {isCurrentUserStep && (
                                        <div className="text-orange-600 dark:text-orange-400 font-medium text-xs pt-2 border-t border-dashed bg-orange-50 dark:bg-orange-950 p-2 rounded flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                            {t($ => $.contractList.tooltipYourApprovalNeeded)}
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {!isLast && (
                            <div className={cn(
                                "h-0.5 mx-2 flex-1",
                                getStepStatus(APPROVAL_ORDER[index + 1]) === 'accept' || stepStatus === 'accept'
                                    ? "bg-green-500/50"
                                    : "bg-border"
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

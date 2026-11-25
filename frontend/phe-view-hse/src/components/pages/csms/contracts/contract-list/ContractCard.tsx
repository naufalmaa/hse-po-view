import { Building2, Hash, Calendar, ChevronRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAppTranslation } from '@/lib/i18n-typed';
import { ApprovalStatus } from '@/service/csms/contracts';


// Types tailored to the API response sample and usage in the component
export type ApprovalLevel = 'evaluator' | 'verifikator' | string;

interface FolderInfo {
    folderId: string;
    folderName: string;
    folderDate: string;
    isFinal: boolean;
    score: string;
    approvalStatus: ApprovalStatus;
}

interface AssessmentPeriod {
    date: string;
    folderInfo: FolderInfo[];
}

export interface Contract {
    id: string;
    contractorId: string;
    contractorName: string; // The API might return this
    title: string;
    numberContract: string;
    startDate: string;
    endDate: string;
    nearestOngoingAssessmentDate: AssessmentPeriod[]; // Adapted to object array based on sample
    finalAssessmentDate?: string;
    note?: string;
    metrics?: {
        ongoingAssessmentsCompleted: number;
        finalAssessmentsCompleted: number;
    };
}

interface ContractCardProps {
    contract: Contract;
    currentUserRole?: ApprovalLevel; // Made optional as it might not be available yet
    onClick?: () => void;
}

export function ContractCard({ contract, currentUserRole, onClick }: ContractCardProps) {
    const {
        title,
        contractorName,
        numberContract,
        startDate,
        endDate,
        nearestOngoingAssessmentDate = [], // Default to empty array if undefined
    } = contract;
    const { t } = useAppTranslation();

    // Count folders needing current user's approval
    const pendingForUser = currentUserRole ? nearestOngoingAssessmentDate.flatMap(a =>
        (a.folderInfo || []).filter(f => {
            const status = f.approvalStatus;
            if (f.isFinal === false) return false;
            return status?.nextRequiredLevel === currentUserRole || (currentUserRole === 'evaluator' && status?.currentApprovalLevel === null);
        })
    ).length : 0;

    // Count fully approved folders
    const fullyApproved = nearestOngoingAssessmentDate.flatMap(a =>
        (a.folderInfo || []).filter(f => f.approvalStatus?.isFullyApproved)
    ).length;

    const totalFolders = nearestOngoingAssessmentDate.flatMap(a => a.folderInfo || []).length;

    return (
        <div
            className={cn(
                "bg-card border rounded-xl p-5 transition-all duration-200 cursor-pointer card-hover fade-in",
                pendingForUser > 0 && "border-l-4 border-l-orange-500" // using orange-500 as 'pending' variant might not exist in standard Badge
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {pendingForUser > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">
                                {t($ => $.contractList.pendingYourApprovalCount, { count: pendingForUser })}
                            </Badge>
                        )}
                    </div>
                    <h3 className="font-semibold text-base mb-1 line-clamp-1">{title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{contractorName || t($ => $.contractList.unknownContractor)}</span>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.contractNo)}</p>
                    <div className="flex items-center gap-1.5 text-sm font-mono">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        {numberContract}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.period)}</p>
                    <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {/* Handle potential date parsing errors gracefully */}
                        {startDate && endDate ? (
                            <>
                                {format(new Date(startDate), 'MMM yyyy')} - {format(new Date(endDate), 'MMM yyyy')}
                            </>
                        ) : (
                            <span>{t($ => $.contractList.invalidDate)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t($ => $.contractList.assessmentsCount, { count: totalFolders })}</span>
                        </div>
                        {fullyApproved > 0 && (
                            <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                                {t($ => $.contractList.completedCount, { count: fullyApproved })}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {totalFolders > 3 && (
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center border-2 border-card">
                                    +{totalFolders - 3}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

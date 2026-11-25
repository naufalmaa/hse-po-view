import { FolderOpen, Calendar, Award, ArrowRight, Building2, Hash } from 'lucide-react';
import { ApprovalLevel } from './ContractCard';
import { ApprovalTimeline, ApprovalStatusBadge } from './ApprovalStatusBadge';
import { ApprovalStatus, ApprovalHistory } from '@/service/csms/contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FolderInfo {
    folderId: string;
    folderName: string;
    folderDate: string;
    isFinal: boolean;
    score: string;
    approvalStatus: ApprovalStatus;
    contractId?: string; // Augmented for flat mapping
    projectInfo?: ProjectInfo;
}

export interface ProjectInfo {
    contractTitle: string;
    contractorName: string;
    numberContract: string;
}

interface FolderCardProps {
    folder: FolderInfo;
    currentUserRole?: ApprovalLevel;
    projectInfo?: ProjectInfo;
    showProjectInfo?: boolean;
    onApprove?: (folderId: string) => void;
    onReject?: (folderId: string) => void;
}

export function FolderCard({
    folder,
    currentUserRole,
    projectInfo,
    showProjectInfo = true,
    onApprove,
    onReject
}: FolderCardProps) {
    const { folderId, folderName, folderDate, score, approvalStatus } = folder;

    // If nextRequiredLevel is null, it means we're at the start (evaluator)
    const nextLevel = approvalStatus.nextRequiredLevel || 'evaluator';
    const needsCurrentUserApproval = (currentUserRole && !approvalStatus.isFullyApproved && nextLevel === currentUserRole) && (folder.isFinal === true);
    const isFinalFolder = folder.isFinal;

    // Check if current user has already approved
    const isApprovedByCurrentUser = currentUserRole &&
        approvalStatus.approvalHistory[currentUserRole as keyof ApprovalHistory]?.some(
            action => action.status === 'accept'
        );


    return (
        <div className={cn(
            "bg-card border rounded-xl p-4 transition-all duration-200 card-hover fade-in flex flex-col hover:border-primary/50 cursor-pointer",
            needsCurrentUserApproval && "border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500"
        )}>
            {/* Project Info Header */}
            {showProjectInfo && projectInfo && (
                <div className="mb-3 pb-3 border-b border-border/50">
                    <h4 className="font-semibold text-sm line-clamp-1 mb-1.5">
                        {projectInfo.contractTitle}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="line-clamp-1">{projectInfo.contractorName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 flex-shrink-0" />
                            <span className="font-mono">{projectInfo.numberContract}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Badge - Now on its own row */}
            <div className="mb-3">
                <ApprovalStatusBadge status={approvalStatus} size="sm" />
            </div>

            {/* Folder Info */}
            <div className="flex items-start gap-3 mb-4">
                <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    needsCurrentUserApproval ? "bg-orange-500/10" : "bg-muted"
                )}>
                    <FolderOpen className={cn(
                        "h-5 w-5",
                        needsCurrentUserApproval ? "text-orange-600" : "text-muted-foreground"
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-2">{folderName}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{folderDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            <span className="font-semibold text-foreground">{score}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Section */}
            <div className="pt-3 border-t border-border/50 mt-auto">
                <div className="mb-3 w-full">
                    <ApprovalTimeline status={approvalStatus} currentUserRole={currentUserRole} />
                </div>

                {(needsCurrentUserApproval && isFinalFolder) && (
                    <div className="flex gap-2 mt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5"
                            onClick={() => onReject?.(folderId)}
                        >
                            Reject
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => onApprove?.(folderId)}
                        >
                            Approve
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}

                {isApprovedByCurrentUser && !approvalStatus.isFullyApproved && (
                    <div className="text-center">
                        <span className="text-xs text-green-600 font-medium">You approved this folder</span>
                    </div>
                )}
            </div>
        </div>
    );
}

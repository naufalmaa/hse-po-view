import { ArrowLeft, Building2, Hash, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { showNotifSuccess } from '@/lib/show-notif';
import { format } from 'date-fns';
import { useAppTranslation } from "@/lib/i18n-typed";
import { Contract, ApprovalLevel } from './ContractCard';
import { FolderCard } from './FolderCard';

interface ContractDetailProps {
    contract: Contract;
    currentUserRole: ApprovalLevel;
    onBack: () => void;
}

export function ContractDetail({ contract, currentUserRole, onBack }: ContractDetailProps) {
    const { t } = useAppTranslation();
    const handleApprove = (folderId: string) => {
        showNotifSuccess({
            message: 'Folder approved successfully!',
            description: `You have approved this assessment as ${currentUserRole}.`
        });
        // In a real app we'd trigger a mutation here
    };

    const allFolders = (contract.nearestOngoingAssessmentDate || []).flatMap(a =>
        (a.folderInfo || []).map(f => ({ ...f, assessmentDate: a.date }))
    );

    const pendingForUser = allFolders.filter(
        f => f.approvalStatus && f.approvalStatus.nextRequiredLevel === currentUserRole && f.isFinal === true
    );

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="mb-4 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
                >

                    <ArrowLeft className="h-4 w-4" />
                    {t($ => $.contractList.backToContracts)}
                </Button>

                <div className="bg-card border rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            {pendingForUser.length > 0 && (
                                <Badge variant="outline" className="mb-2 bg-orange-100 text-orange-700 border-orange-200">
                                    {t($ => $.contractList.pendingYourApprovalCount, { count: pendingForUser.length })}
                                </Badge>
                            )}
                            <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>{contract.contractorName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-border/50">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.contractNo)}</p>
                            <div className="flex items-center gap-1.5 font-mono font-medium">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                                {contract.numberContract}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.startDate)}</p>
                            <div className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {contract.startDate && format(new Date(contract.startDate), 'dd MMM yyyy')}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.endDate)}</p>
                            <div className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {contract.endDate && format(new Date(contract.endDate), 'dd MMM yyyy')}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t($ => $.contractList.assessments)}</p>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{contract.metrics?.ongoingAssessmentsCompleted ?? 0}</span>
                                    <span className="text-muted-foreground text-sm">{t($ => $.contractList.ongoing)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assessment Timeline */}
            <div className="space-y-6">
                {(contract.nearestOngoingAssessmentDate || []).map((assessment, index) => {
                    const finalFolders = (assessment.folderInfo || []).filter(f => f.isFinal);

                    return (
                        <div key={`${assessment.date}-${index}`} className="slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                <h3 className="font-semibold text-lg">
                                    {t($ => $.contractList.assessmentDate, { date: assessment.date && format(new Date(assessment.date), 'dd MMMM yyyy') })}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                    {t($ => $.contractList.folderCount, { count: finalFolders.length })}
                                </Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-5 border-l-2 border-border ml-1">
                                {finalFolders.map((folder) => (
                                    <FolderCard
                                        key={folder.folderId}
                                        folder={folder}
                                        currentUserRole={currentUserRole}
                                        showProjectInfo={false}
                                        onApprove={handleApprove}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

import React from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ContractFolder } from '@/service/csms/folder-detail';
import { FolderDetails, ScoreDisplay, ApprovalProgress, AuditorSection, ActionButtons } from './root-folder-selector';
import { isFinalFolder, renderStatusBadge } from './root-folder-selector/utils';
import { AuditorRejectNote } from './contract-detail/AuditorRejectNote';
import { AiEvaluationButton } from './AiEvaluationButton';
import { AiResultDashboard } from './AiResultDashboard';
import { AiApplyDialog } from './AiApplyDialog';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, Edit2, Sparkles, BarChart3 } from 'lucide-react';
import { useUpdateAssessmentDate } from '@/service/csms/folder-detail';
import { useExportAiEvaluation } from '@/service/csms/contract-management-api';
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';
import { getAiScore } from './FolderTree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DatePicker from '@/components/custom/components/DatePicker';

interface StatsFolderProps {
    selectedRootFolder: ContractFolder;
    filteredApprovalsData: any;
    isLoadingUsers: boolean;
    refreshFolders?: () => void;
    filteredUsersData: any;
    canManageAuditors: boolean;
    onCompleteFolder?: (folder: ContractFolder) => void;
    handleExportEvaluation: () => void;
    handleExportCatatanPerbaikan: () => void;
    handleExportEchsms: () => void;
    isExportEvaluationPending: boolean;
    isExportCatatanPerbaikanPending: boolean;
    isExportEchsmsPending: boolean;
    onStatusChange?: (folderId: string, status: string, progressMessage?: string) => void;
}

export const StatsFolder: React.FC<StatsFolderProps> = ({
    selectedRootFolder,
    filteredApprovalsData,
    isLoadingUsers,
    refreshFolders,
    filteredUsersData,
    canManageAuditors,
    onCompleteFolder,
    handleExportEvaluation,
    handleExportCatatanPerbaikan,
    handleExportEchsms,
    isExportEvaluationPending,
    isExportCatatanPerbaikanPending,
    isExportEchsmsPending,
    onStatusChange,
}) => {
    const { t } = useAppTranslation();
    const updateAssessmentDateMutation = useUpdateAssessmentDate();
    const exportAiEvaluation = useExportAiEvaluation();
    const [isEditingDate, setIsEditingDate] = React.useState(false);
    const [showAiDashboard, setShowAiDashboard] = React.useState(false);
    const [showAiApply, setShowAiApply] = React.useState(false);
    const [tempDate, setTempDate] = React.useState<Date | undefined>(
        selectedRootFolder.assessmentDate ? new Date(selectedRootFolder.assessmentDate) : undefined
    );

    const handleExportAiEvaluation = () => {
        exportAiEvaluation.mutate({
            contractId: selectedRootFolder.contractId,
            folderId: selectedRootFolder.id
        }, {
            onSuccess: (response: any) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Evaluation_Report_AI.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            },
            onError: (error: any) => {
                showNotifError({ message: error?.message || "Gagal mengunduh laporan AI" });
            }
        });
    };

    const hasAiEvaluated = React.useMemo(() => {
        if (selectedRootFolder.aiStatus && selectedRootFolder.aiStatus !== 'pending') {
            return true;
        }
        const checkChildren = (nodes?: ContractFolder[]): boolean => {
            if (!nodes) return false;
            return nodes.some(node => {
                if (node.aiStatus && node.aiStatus !== 'pending') {
                    return true;
                }
                if (node.children && node.children.length > 0) {
                    return checkChildren(node.children);
                }
                return false;
            });
        };
        return checkChildren(selectedRootFolder.children);
    }, [selectedRootFolder]);

    // Update tempDate when selectedRootFolder changes
    React.useEffect(() => {
        setTempDate(selectedRootFolder.assessmentDate ? new Date(selectedRootFolder.assessmentDate) : undefined);
    }, [selectedRootFolder.assessmentDate]);

    const handleUpdateDate = async () => {
        if (!tempDate) return;

        try {
            const localDateAtMidnightUTC = new Date(Date.UTC(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()));
            await updateAssessmentDateMutation.mutateAsync({
                contractId: selectedRootFolder.contractId,
                folderId: selectedRootFolder.id,
                assessmentDate: localDateAtMidnightUTC.toISOString()
            });
            showNotifSuccess({
                message: t($ => $.contractManagement.rootFolderSelector.assessmentDate) + " " + t($ => $.shared.success)
            });
            setIsEditingDate(false);
            if (refreshFolders) refreshFolders();
        } catch (error: any) {
            showNotifError({
                message: error.message || t($ => $.shared.failed)
            });
        }
    };

    return (
        <div className="bg-muted/50 rounded-lg p-4 h-full">
            <FolderDetails selectedRootFolder={selectedRootFolder} />

            {/* show the total score of the selected root folder */}
            <ScoreDisplay selectedRootFolder={selectedRootFolder} />

            <div className="space-y-3">
                {/* Show approval progress */}
                {isFinalFolder(selectedRootFolder) === true ? (
                    <div className='flex flex-col space-y-3'>
                        <ApprovalProgress
                            selectedRootFolder={selectedRootFolder}
                            usersData={filteredApprovalsData}
                            isLoadingUsers={isLoadingUsers}
                            refreshFolders={refreshFolders}
                        />
                    </div>
                ) : null}

                {/* Show auditor information */}
                <AuditorSection
                    selectedRootFolder={selectedRootFolder}
                    usersData={filteredUsersData}
                    isLoadingUsers={isLoadingUsers}
                    canManageAuditors={canManageAuditors}
                    refreshFolders={refreshFolders}
                />

                {/* show the status and note */}
                {selectedRootFolder.status && (
                    <div className="rounded-md bg-muted p-3">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t($ => $.contractManagement.rootFolderSelector.status)}
                            </span>
                        </div>
                        <div className="mt-1 ml-4">
                            {renderStatusBadge(selectedRootFolder.status)}
                        </div>
                    </div>
                )}

                {selectedRootFolder.note && (
                    <div className="rounded-md bg-muted p-3">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t($ => $.contractManagement.rootFolderSelector.note)}
                            </span>
                        </div>
                        {selectedRootFolder.note.length > 200 ? (
                            <div className="mt-1 ml-4">
                                <p className="text-sm text-foreground">
                                    {selectedRootFolder.note.substring(0, 200)}...
                                </p>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
                                            {t($ => $.contractManagement.rootFolderSelector.viewMore)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="max-w-md max-h-60 overflow-y-auto">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {selectedRootFolder.note}
                                        </p>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground mt-1 ml-4 whitespace-pre-wrap">
                                {selectedRootFolder.note}
                            </p>
                        )}
                    </div>
                )}

                {/* Auditor Reject Note */}
                {!isFinalFolder(selectedRootFolder) && selectedRootFolder.approvalStatus?.currentApprovalLevel && (
                    <AuditorRejectNote
                        actions={selectedRootFolder.approvalStatus.approvalHistory?.[selectedRootFolder.approvalStatus.currentApprovalLevel]}
                        role={selectedRootFolder.approvalStatus.currentApprovalLevel}
                    />
                )}

                {/* Show assessment date */}
                {selectedRootFolder.isComplete && (
                    <div className="rounded-md bg-muted p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {t($ => $.contractManagement.rootFolderSelector.assessmentDate)}
                                </span>
                            </div>
                            {canManageAuditors && (
                                <Popover open={isEditingDate} onOpenChange={setIsEditingDate}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4">
                                        <div className="space-y-4">
                                            <h4 className="font-medium leading-none">{t($ => $.contractManagement.rootFolderSelector.assessmentDate)}</h4>
                                            <div className="grid gap-2">
                                                <DatePicker
                                                    value={tempDate}
                                                    onChange={setTempDate}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setIsEditingDate(false)}>
                                                    {t($ => $.shared.cancel)}
                                                </Button>
                                                <Button size="sm" onClick={handleUpdateDate} disabled={updateAssessmentDateMutation.isPending}>
                                                    {t($ => $.shared.save)}
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                        <div className="mt-1 ml-4 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {selectedRootFolder.assessmentDate
                                    ? format(new Date(selectedRootFolder.assessmentDate), 'dd MMMM yyyy', { locale: id })
                                    : '-'}
                            </span>
                        </div>
                    </div>
                )}

                {/* AI Evaluation Button - shown when isComplete and not yet evaluated */}
                {selectedRootFolder.isComplete && !hasAiEvaluated && (
                    <div data-tour="ai-evaluate">
                    <AiEvaluationButton
                        selectedRootFolder={selectedRootFolder}
                        refreshFolders={refreshFolders}
                        onStatusChange={onStatusChange}
                    />
                    </div>
                )}

                {/* AI Score Display & Bulk Apply - shown when aiScore/aiStatus exists */}
                {selectedRootFolder.isComplete && hasAiEvaluated && (
                    <div className="rounded-md bg-muted p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    AI Score
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const computedRootAiScore = getAiScore(selectedRootFolder);
                                    if (computedRootAiScore === null || computedRootAiScore === -1) {
                                        return (
                                            <span className="text-3xl font-bold px-4 py-2 rounded-lg border bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50">
                                                N/A
                                            </span>
                                        );
                                    }
                                    return (
                                        <>
                                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${computedRootAiScore >= 60
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                            }`}>
                                                {computedRootAiScore >= 60 ? 'Lulus' : 'Tidak Lulus'}
                                            </div>
                                            <span className="text-3xl font-bold px-4 py-2 rounded-lg border bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50">
                                                {computedRootAiScore.toFixed(2)}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        {selectedRootFolder.aiReasoning && (
                            <p className="mt-1 ml-4 text-xs text-muted-foreground line-clamp-3">
                                {selectedRootFolder.aiReasoning}
                            </p>
                        )}
                        {canManageAuditors && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAiApply(true)}
                                disabled={isFinalFolder(selectedRootFolder)}
                                data-testid="ai-apply-all-stats"
                                className="w-full mt-2 border-purple-200 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-400 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                Terapkan Hasil Rekomendasi AI
                            </Button>
                        )}
                        <div data-tour="ai-evaluate">
                        <AiEvaluationButton
                            selectedRootFolder={selectedRootFolder}
                            refreshFolders={refreshFolders}
                            onStatusChange={onStatusChange}
                            isReevaluate={true}
                        />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAiDashboard(true)}
                            data-testid="ai-result-button"
                            className="w-full mt-2 border-purple-200 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-400 text-xs font-semibold flex items-center justify-center gap-2"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Result CSMS AI
                        </Button>
                        <AiResultDashboard
                            open={showAiDashboard}
                            onOpenChange={setShowAiDashboard}
                            root={selectedRootFolder}
                            canApply={canManageAuditors && !isFinalFolder(selectedRootFolder)}
                            onExport={handleExportAiEvaluation}
                            isExporting={exportAiEvaluation.isPending}
                            onChanged={refreshFolders}
                        />
                        <AiApplyDialog
                            folderId={showAiApply ? selectedRootFolder.id : null}
                            scopeLabel="Seluruh kategori"
                            open={showAiApply}
                            onOpenChange={setShowAiApply}
                            onApplied={refreshFolders}
                        />
                    </div>
                )}

                {/* Buttons for Finalize and Export to PDF */}
                <ActionButtons
                    selectedRootFolder={selectedRootFolder}
                    onCompleteFolder={onCompleteFolder}
                    onExportEvaluation={handleExportEvaluation}
                    onExportCatatanPerbaikan={handleExportCatatanPerbaikan}
                    onExportEchsms={handleExportEchsms}
                    isExportEvaluationPending={isExportEvaluationPending}
                    isExportCatatanPerbaikanPending={isExportCatatanPerbaikanPending}
                    isExportEchsmsPending={isExportEchsmsPending}
                    refreshFolders={refreshFolders}
                />
            </div>
        </div>
    );
};

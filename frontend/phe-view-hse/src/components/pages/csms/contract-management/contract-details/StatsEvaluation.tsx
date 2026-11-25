import React from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { Activity, Download, FileCheck, Files } from 'lucide-react';
import { ContractFolder } from '@/service/csms/folder-detail';

interface StatsEvaluationProps {
    selectedRootFolder: ContractFolder | null;
}

export const StatsEvaluation: React.FC<StatsEvaluationProps> = ({ selectedRootFolder }) => {
    const { t } = useAppTranslation();

    const totalAssessmentFolders = selectedRootFolder?.exportStatistics?.totalAssessmentFolders || 0;
    const fullyApprovedFolders = selectedRootFolder?.exportStatistics?.fullyApprovedFolders || 0;
    const exportedFiles = selectedRootFolder?.exportStatistics?.exportedFiles || 0;
    const completionRate = totalAssessmentFolders > 0
        ? Math.round((fullyApprovedFolders / totalAssessmentFolders) * 100)
        : 0;

    return (
        <div className="bg-muted/50 rounded-lg p-0 h-full">
            <div className="space-y-6">
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                            {t($ => $.contractManagement.rootFolderSelector.docEvaluation.title)}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground/80 italic font-medium ml-7">
                        {t($ => $.contractManagement.rootFolderSelector.docEvaluation.description)}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Folders */}
                    <div className="group bg-background border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Files className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {t($ => $.contractManagement.rootFolderSelector.docEvaluation.totalFolders)}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-3xl font-black tracking-tighter">
                                    {totalAssessmentFolders}
                                </h4>
                                <span className="text-xs font-medium text-muted-foreground">{t($ => $.labels.folders)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Approved Folders */}
                    <div className="group bg-background border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <FileCheck className="h-6 w-6 text-emerald-500" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {t($ => $.contractManagement.rootFolderSelector.docEvaluation.approvedFolders)}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-3xl font-black tracking-tighter">
                                    {fullyApprovedFolders}
                                </h4>
                                <span className="text-xs font-medium text-muted-foreground">{t($ => $.labels.folders)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Exported Files */}
                    <div className="group bg-background border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all duration-300 md:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Download className="h-6 w-6 text-orange-500" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {t($ => $.contractManagement.rootFolderSelector.docEvaluation.exportedFiles)}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-3xl font-black tracking-tighter">
                                    {exportedFiles}
                                </h4>
                                <span className="text-xs font-medium text-muted-foreground">{t($ => $.labels.files)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Visualizer */}
                {/* <div className="relative overflow-hidden bg-background border rounded-2xl p-6 shadow-sm border-l-4 border-l-primary">
                    <div className="relative z-10">
                        <div className="flex items-end justify-between mb-5">
                            <div>
                                <h4 className="font-bold text-foreground text-lg uppercase tracking-tight">
                                    {t($ => $.contractManagement.rootFolderSelector.docEvaluation.completionRate)}
                                </h4>
                                <p className="text-sm text-muted-foreground">{t($ => $.contractManagement.rootFolderSelector.percentageLabelInfo)}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-primary tracking-tighter">
                                    {completionRate}%
                                </span>
                            </div>
                        </div>

                        <div className="relative h-4 w-full bg-muted rounded-full overflow-hidden mb-2 shadow-inner">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-in-out"
                                style={{ width: `${completionRate}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                            </div>
                        </div>

                        <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                            <span>{t($ => $.labels.progress)}: 0%</span>
                            <span className="text-primary italic">Keep it up!</span>
                            <span>{t($ => $.labels.target)}: 100%</span>
                        </div>
                    </div>

                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                        <Activity className="h-32 w-32 rotate-12" />
                    </div>
                </div> */}
            </div>
        </div>
    );
};

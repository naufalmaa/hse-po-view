import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Calendar, Eye, Edit, Trash, Plus, Ship } from 'lucide-react';
import { Contract, OngoinAssesmentDate } from '@/service/csms/folder-detail';
import { useNavigate } from '@tanstack/react-router';
import { AppRoute } from "@/constants/app-route";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { OngoingAssessmentDatesManager } from './OngoingAssessmentDatesManager';
import { DataTablePagination } from '@/components/custom/table';
import { useAppTranslation } from "@/lib/i18n-typed";
import { getNearestOngoingAssessmentDate, getAllAssessmentDates } from '@/lib/lib-contract';
import { AssessmentDatesStepper } from './AssessmentDatesStepper';
import { Badge } from '@/components/ui/badge';
import { EMPLOYEE_TYPE, getEmployeeColor, getEmployeeLabel } from '@/constants/app-enum';
import { date_to_string } from '@/lib/my-utils';
import { cn } from '@/lib/utils';

export const getRiskLevelBadgeClass = (riskLevel?: string) => {
    switch (riskLevel) {
        case 'Low Risk':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
        case 'Medium Risk':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
        case 'High Risk':
            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
        default:
            return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
};

interface CardContractProps {
    data: Contract[];
    isLoading: boolean;
    paginationData?: {
        page: number;
        view: number;
        total: number;
        totalPages: number;
    };
    onPaginationChange?: (paginationData: { page: number; limit: number }) => void;
    onEditContract?: (contract: Contract) => void;
    onDeleteContract?: (contractId: string, contractTitle: string) => void;
    onReloadContracts?: () => void; // Add reload function prop
    isEnableAction: boolean
}

export const CardContract: React.FC<CardContractProps> = ({
    data,
    isLoading,
    paginationData,
    onPaginationChange,
    onEditContract,
    onDeleteContract,
    onReloadContracts,
    isEnableAction
}) => {
    const { t } = useAppTranslation();
    const navigate = useNavigate();
    const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

    // Show contract detail - navigates to the separate route
    const showContractDetail = (contractId: string) => {
        navigate({
            to: AppRoute.csms.contractManagementDetails.url,
            search: {
                contractId,
            }
        });
    };

    if (isLoading) {
        return (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t($ => $.contractManagement.loading)}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-green-600 dark:text-green-400 text-lg font-semibold mb-2">🎉 {t($ => $.contractManagement.form.title.label)}!</div>
                <div className="text-gray-500 dark:text-gray-400">{t($ => $.contractManagement.form.title.label)}</div>
            </div>
        );
    }

    // Calculate completion percentage for a contract
    const calculateCompletionPercentage = (contract: Contract) => {
        const ongoingCompleted = contract.metrics?.ongoingAssessmentsCompleted || 0;
        const finalCompleted = contract.metrics?.finalAssessmentsCompleted || 0;
        const total = ongoingCompleted + finalCompleted;

        // For simplicity, we'll assume each contract has 2 possible assessments (ongoing and final)
        const percentage = (finalCompleted / total) * 100;
        return (percentage);
    };

    // Handle dialog open/close
    const handleDialogOpenChange = (contractId: string, open: boolean) => {
        setOpenDialogs(prev => ({
            ...prev,
            [contractId]: open
        }));
    };

    // Handle pagination change
    const handlePaginationChange = (newPaginationData: { page: number; limit: number; total: number; totalPages: number }) => {
        if (onPaginationChange) {
            onPaginationChange({
                page: newPaginationData.page,
                limit: newPaginationData.limit
            });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.map((contract) => {
                    const startDate = contract.startDate ? date_to_string(new Date(contract.startDate), "dd/MM/yyyy") : 'N/A';
                    const endDate = contract.endDate ? date_to_string(new Date(contract.endDate), "dd/MM/yyyy") : 'N/A';
                    const contractorDisplay = contract.contractorName || contract.contractorId || 'N/A';
                    const ongoingCompleted = contract.metrics?.ongoingAssessmentsCompleted || 0;
                    const finalCompleted = contract.metrics?.finalAssessmentsCompleted || 0;
                    const completionPercentage = calculateCompletionPercentage(contract);

                    return (
                        <Card
                            key={contract.id}
                            className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                        >
                            <CardContent className="px-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="text-lg font-semibold line-clamp-2 cursor-pointer hover:text-primary"
                                            title={contract.title}
                                            onClick={() => showContractDetail(contract.id)}
                                        >
                                            {contract.title}
                                        </h3>
                                    </div>
                                    {isEnableAction && <div className="flex space-x-1 ml-2">
                                        {onEditContract && (
                                             <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEditContract(contract)}
                                                className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                                                title={t($ => $.contractManagement.updateContract)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onDeleteContract && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDeleteContract(contract.id, contract.title)}
                                                className="text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                                title={t($ => $.contractManagement.deleteContract)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>}
                                </div>

                                <div className="flex justify-between items-center gap-2 mb-2 w-full">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={contract.numberContract}>
                                        <span className="font-medium text-gray-400 dark:text-gray-500 mr-1.5">
                                            {t($ => $.contractManagement.contractNumber)}:
                                        </span>
                                        {contract.numberContract}
                                    </p>
                                    {contract.category && (
                                        <Badge variant="outline" className="shrink-0">
                                            <span className={`w-2 h-2 rounded-full ${getEmployeeColor(contract.category)}`} />
                                            {getEmployeeLabel(contract.category) || contract.category}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex justify-between items-center gap-2 mb-4 w-full">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={contract.riskAssessmentId || "-"}>
                                        <span className="font-medium text-gray-400 dark:text-gray-500 mr-1.5">
                                            Risk ID:
                                        </span>
                                        {contract.riskAssessmentId || "-"}
                                    </p>
                                    <Badge variant="outline" className={cn("shrink-0 text-xs font-medium", getRiskLevelBadgeClass(contract.riskLevel))}>
                                        {contract.riskLevel || "N/A"}
                                    </Badge>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-start mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mt-1">
                                            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t($ => $.contractManagement.contractor)}</p>
                                            <p
                                                className="text-sm font-medium truncate"
                                                title={contractorDisplay}
                                            >
                                                {contractorDisplay}
                                            </p>
                                        </div>
                                    </div>

                                    {contract.category === EMPLOYEE_TYPE.marine.value && (
                                        <div className="flex items-start mb-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mt-1">
                                                <Ship className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="ml-3 flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t($ => $.contractManagement.vesselName)}</p>
                                                <p
                                                    className="text-sm font-medium truncate"
                                                    title={contract.vesselName || '-'}
                                                >
                                                    {contract.vesselName || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mt-1">
                                            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t($ => $.contractManagement.contractDate)}</p>
                                            <p className="text-sm font-medium ">
                                                {startDate} - {endDate}
                                            </p>
                                        </div>
                                    </div>

                                    {/* <div className="mt-4">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t($ => $.contractManagement.contractProgress)}</span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{Math.round(completionPercentage)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                                                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div> */}

                                    {/* show stepper component */}
                                    <AssessmentDatesStepper assessmentDates={contract.nearestOngoingAssessmentDate} />

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                                            <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t($ => $.contractManagement.metrics.finalAssessments)}</p>
                                            <p className="text-xl font-bold text-green-700 dark:text-green-300">{finalCompleted}</p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t($ => $.contractManagement.metrics.ongoingAssessments)}</p>
                                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{ongoingCompleted}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ongoing Assessment Dates Manager */}
                                {isEnableAction && <div className="mt-4">
                                    <Dialog onOpenChange={(open) => handleDialogOpenChange(contract.id, open)}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full flex items-center gap-2">
                                                <Plus className="h-4 w-4" />
                                                {t($ => $.contractManagement.manageOngoingDates)}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
                                            <DialogHeader>
                                                <DialogTitle>{t($ => $.contractManagement.manageOngoingDates)}</DialogTitle>
                                            </DialogHeader>
                                            <OngoingAssessmentDatesManager
                                                contractId={contract.id}
                                                initialDates={getAllAssessmentDates(contract)}
                                                onDatesUpdated={() => {
                                                }}
                                                onReloadContracts={onReloadContracts}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>}

                                <Button
                                    onClick={() => showContractDetail(contract.id)}
                                    className="w-full mt-4"
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t($ => $.contractManagement.viewDetails)}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Pagination Component */}
            {paginationData && onPaginationChange && (
                <div className="mt-4">
                    <DataTablePagination
                        showPageSize={false}
                        pageIndex={paginationData.page - 1} // Convert to 0-based index
                        setPageIndex={(pageIndex) => {
                            handlePaginationChange({
                                page: pageIndex + 1, // Convert back to 1-based index
                                limit: paginationData.view,
                                total: paginationData.total,
                                totalPages: paginationData.totalPages
                            });
                        }}
                        pageSize={paginationData.view}
                        setPageSize={(pageSize) => {
                            handlePaginationChange({
                                page: 1, // Reset to first page
                                limit: pageSize,
                                total: paginationData.total,
                                totalPages: paginationData.totalPages
                            });
                        }}
                        rowsCount={paginationData.total}
                        paginationData={{
                            page: paginationData.page,
                            limit: paginationData.view,
                            total: paginationData.total,
                            totalPages: paginationData.totalPages
                        }}
                        onPaginationChange={handlePaginationChange}
                    />
                </div>
            )}
        </div>
    );
};
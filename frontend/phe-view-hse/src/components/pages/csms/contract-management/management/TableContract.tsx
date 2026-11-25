import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, useDataTable, createRowNumberColumn } from '@/components/custom/table';
import { Contract } from '@/service/csms/folder-detail';
import { useNavigate } from '@tanstack/react-router';
import { AppRoute } from "@/constants/app-route";
import { Eye, Edit, Trash, Plus, MoreHorizontal, CalendarCog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OngoingAssessmentDatesManager } from './OngoingAssessmentDatesManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppTranslation } from "@/lib/i18n-typed";
import { getNearestOngoingAssessmentDate, getAllAssessmentDates } from '@/lib/lib-contract';

interface TableContractProps {
  data: Contract[];
  isLoading: boolean;
  paginationData: {
    page: number;
    view: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (paginationData: { page: number; limit: number }) => void;
  onEditContract?: (contract: Contract) => void;
  onDeleteContract?: (contractId: string, contractTitle: string) => void;
  onReloadContracts?: () => void; // Add reload function prop
  isEnableAction?: boolean;
}

export const TableContract: React.FC<TableContractProps> = ({
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

  // State to control dropdown menu visibility per row
  const [openDropdownRowId, setOpenDropdownRowId] = useState<string | null>(null);

  // Show contract detail - navigates to the separate route
  const showContractDetail = (contractId: string) => {
    navigate({
      to: AppRoute.csms.contractManagementDetails.url,
      search: {
        contractId,
      }
    });
  };

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

  const minColumnSize = 120;

  // Table columns
  const columns = useMemo(() => [
    createRowNumberColumn<Contract>({
      accessorKey: "rowNum",
      id: "rowNum",
      paginationData: {
        page: paginationData.page,
        limit: paginationData.view,
        total: paginationData.total,
        totalPages: paginationData.totalPages
      }
    }),
    {
      accessorKey: "title",
      enableSorting: true,
      meta: { label: t($ => $.contractManagement.contractTitle) },
      header: t($ => $.contractManagement.contractTitle),
      size: 200,
      minSize: 200,
      cell: ({ row }: any) => (
        <div>
          <div
            className="font-medium line-clamp-2 cursor-pointer hover:underline"
            onClick={() => showContractDetail(row.original.id)}
            title={row.original.title || '-'}
          >
            {row.original.title || '-'}
          </div>
          <div className="text-sm text-muted-foreground">{row.original.numberContract || '-'}</div>
        </div>
      )
    },
    {
      accessorKey: "dates",
      enableSorting: false,
      meta: { label: t($ => $.contractManagement.contractDate) },
      header: t($ => $.contractManagement.contractDate),
      size: minColumnSize,
      minSize: minColumnSize,
      cell: ({ row }: any) => {
        const startDate = row.original.startDate ? new Date(row.original.startDate).toLocaleDateString() : 'N/A';
        const endDate = row.original.endDate ? new Date(row.original.endDate).toLocaleDateString() : 'N/A';
        return (
          <div className="text-sm">
            {startDate} - {endDate}
          </div>
        );
      }
    },
    {
      accessorKey: "contractorName",
      enableSorting: true,
      meta: { label: t($ => $.contractManagement.contractor) },
      header: t($ => $.contractManagement.contractor),
      size: minColumnSize * 2,
      minSize: minColumnSize * 2,
      cell: ({ row }: any) => {
        const contractorDisplay = row.original.contractorName || row.original.contractorId || 'N/A';
        return (
          <div>
            <div className="">{contractorDisplay}</div>
          </div>
        );
      }
    },
    {
      accessorKey: "progress",
      enableSorting: false,
      meta: { label: t($ => $.contractManagement.contractProgress) },
      header: t($ => $.contractManagement.contractProgress),
      size: minColumnSize,
      minSize: minColumnSize,
      cell: ({ row }: any) => {
        const completionPercentage = calculateCompletionPercentage(row.original);
        const ongoingCompleted = row.original.metrics?.ongoingAssessmentsCompleted || 0;
        const finalCompleted = row.original.metrics?.finalAssessmentsCompleted || 0;

        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-medium">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                {t($ => $.contractManagement.metrics.ongoingAssessments)}: {ongoingCompleted}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                {t($ => $.contractManagement.metrics.finalAssessments)}: {finalCompleted}
              </Badge>
            </div>
          </div>
        );
      }
    },
    {
      id: "actions",
      meta: { label: t($ => $.contractManagement.actions) },
      header: t($ => $.contractManagement.actions),
      size: 80,
      minSize: 80,
      cell: ({ row }: any) => (
        <div className="flex justify-start">
          <DropdownMenu open={openDropdownRowId === row.original.id} onOpenChange={(isOpen) => {
            if (isOpen) {
              setOpenDropdownRowId(row.original.id);
            } else {
              setOpenDropdownRowId(null);
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setOpenDropdownRowId(null);
                showContractDetail(row.original.id);
              }}>
                <Eye className="mr-2 h-4 w-4" />
                <span>{t($ => $.contractManagement.viewDetails)}</span>
              </DropdownMenuItem>
              {isEnableAction && (
                <>
                  {onEditContract && (
                    <DropdownMenuItem onClick={() => {
                      setOpenDropdownRowId(null);
                      onEditContract(row.original);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>{t($ => $.contractManagement.updateContract)}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setOpenDropdownRowId(null);
                      handleDialogOpenChange(row.original.id, true);
                    }}
                  >
                    <CalendarCog className="mr-2 h-4 w-4" />
                    <span>{t($ => $.contractManagement.manageOngoingDates)}</span>
                  </DropdownMenuItem>
                  {onDeleteContract && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setOpenDropdownRowId(null);
                          onDeleteContract(row.original.id, row.original.title);
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>{t($ => $.contractManagement.deleteContract)}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </>)}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden dialog that gets triggered from dropdown */}
          <Dialog open={openDialogs[row.original.id] || false} onOpenChange={(open) => handleDialogOpenChange(row.original.id, open)}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{t($ => $.contractManagement.manageOngoingDates)}</DialogTitle>
              </DialogHeader>
              <OngoingAssessmentDatesManager
                contractId={row.original.id}
                initialDates={getAllAssessmentDates(row.original)}
                onDatesUpdated={() => {
                }}
                onReloadContracts={onReloadContracts}
              />
            </DialogContent>
          </Dialog>
        </div>
      )
    }
  ], [paginationData, onEditContract, onDeleteContract, onReloadContracts, openDialogs, openDropdownRowId]);

  const { table } = useDataTable({
    data: data || [],
    columns,
    pageCount: paginationData.totalPages || -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["actions"] },
      pagination: { pageIndex: paginationData.page - 1, pageSize: paginationData.view },
    },
    manualSorting: false,
    manualPagination: true,
    onPaginationChange: (updater: any) => {
      const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;

      // Call parent pagination handler if provided
      if (onPaginationChange) {
        onPaginationChange({
          page: nextPagination.pageIndex + 1, // Convert 0-based to 1-based
          limit: nextPagination.pageSize,
        });
      }
    },
    manualFiltering: false,
  });

  if (isLoading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        {t($ => $.contractManagement.loading)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-green-600 dark:text-green-400 text-lg font-semibold mb-2">🎉 {t($ => $.contractManagement.form.title.label)}!</div>
        <div className="text-gray-500 dark:text-gray-400">{t($ => $.contractManagement.form.title.label)}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <DataTable
        table={table}
        totalRowCount={paginationData.total}
        paginationData={{
          page: paginationData.page,
          limit: paginationData.view,
          total: paginationData.total,
          totalPages: paginationData.totalPages
        }}
        showPageSize={false}
        styles={{ container: { default: "border-none" }, pagination: { default: " px-4 pb-4" } }}
      />
    </div>
  );
};
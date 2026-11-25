import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { SmartCardDashboardEmployee, Month } from '@/service/employee/smart-card';
import FilterBadges from "./FilterBadges";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { onCreateEmployee } from "../validation/templates/employee-template";
import FormCreateEmployee from "../validation/FormCreateEmployee";
import { useEmployeeCreate } from "@/service/employee";
import { useReprocessGroup } from "@/service/employee/smart-card-upload";
import { useQueryClient } from "@tanstack/react-query";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  data: any[]; // Changed from SmartCardDashboardEmployee[] to any[] to allow suggestions and errorId fields
  months: Month[];
  monthlyTotals: Record<string, number>;
  grandTotal: number;
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  form: any;
  companiesData: any[];
  onFilterSubmit: (values: any) => void;
  vesselsData?: any[];
  projectsData?: any[];
  isLoading?: boolean;
}

const DashboardViewEmployee = ({
  data,
  months,
  monthlyTotals,
  grandTotal,
  onPaginationChange,
  paginationData,
  form,
  companiesData,
  onFilterSubmit,
  vesselsData = [],
  projectsData = [],
  isLoading = false,
}: Props) => {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);

  const employeeCreateMutation = useEmployeeCreate();
  const reprocessGroupMutation = useReprocessGroup();

  const employeeStatus = form.watch('employeeStatus') || 'all';

  const handleMatchSuggestion = (errorId: string, employeeId: string) => {
    if (!errorId) return;
    reprocessGroupMutation.mutate(
      { groupId: errorId, employeeId },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: ['employee-list'] });
          showNotifSuccess({ message: res.message || 'Successfully matched employee' });
          onFilterSubmit(form.getValues());
        },
        onError: (err: any) => {
          showNotifError({ message: err.message || 'Failed to match employee' });
        }
      }
    );
  };

  const handleCreateEmployee = (employeeName: string, companyId?: string, category?: string) => {
    const contractorOptions = companiesData?.map((contractor: any) => ({
      value: contractor.id,
      label: contractor.name,
    })) || [];

    const defaultValues = {
      employeeName: employeeName || "",
      subContractorId: companyId || "",
      category: category?.toLowerCase() || ""
    };

    onCreateEmployee(
      t,
      setConfirmationCreate,
      (body: Record<string, string>) => {
        employeeCreateMutation.mutate(
          { body },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['employee-list'] });
              showNotifSuccess({ message: 'Employee created successfully' });
              onFilterSubmit(form.getValues());
            },
            onError: (error: any) => {
              showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message });
            },
          }
        );
      },
      FormCreateEmployee,
      contractorOptions,
      defaultValues
    );
  };

  const sortBy = form.watch('sortBy') || 'employeeName';
  const orderBy = form.watch('orderBy') || 'asc';

  const handleSort = (field: string) => {
    let newOrder = 'asc';
    if (sortBy === field) {
      newOrder = orderBy === 'asc' ? 'desc' : 'asc';
    }
    form.setValue('sortBy', field);
    form.setValue('orderBy', newOrder);
    onFilterSubmit(form.getValues());
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy === field) {
      return orderBy === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'mitra':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
      case 'project':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
      case 'marine':
      case 'crew marine':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getRateClass = (rate: number) => {
    if (rate >= 100) {
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800 font-bold';
    } else if (rate >= 60) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
    } else {
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getCellClass = (count: number) => {
    if (count === 0) {
      return 'bg-red-50/50 text-red-700 dark:bg-red-950/10 dark:text-red-400 text-center font-medium';
    } else if (count === 1) {
      return 'bg-amber-50/50 text-amber-700 dark:bg-amber-950/10 dark:text-amber-400 text-center font-medium';
    } else {
      return 'bg-green-50/50 text-green-700 dark:bg-green-950/10 dark:text-green-400 text-center font-medium';
    }
  };

  const renderSkeletons = () => {
    return Array.from({ length: paginationData.limit || 5 }).map((_, i) => (
      <tr key={`skeleton-${i}`} className="animate-pulse">
        <td className="p-3">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </td>
        <td className="p-3 text-center">
          <Skeleton className="h-6 w-16 mx-auto rounded-full" />
        </td>
        {months.map(m => (
          <td key={`skeleton-month-${m.key}`} className="p-3 border-l border-r border-border/50 text-center">
            <Skeleton className="h-4 w-8 mx-auto" />
          </td>
        ))}
        <td className="p-3 text-center bg-muted/10">
          <Skeleton className="h-4 w-8 mx-auto" />
        </td>
        <td className="p-3 text-center">
          <Skeleton className="h-4 w-8 mx-auto" />
        </td>
        <td className="p-3 text-center">
          <Skeleton className="h-6 w-12 mx-auto rounded-full" />
        </td>
      </tr>
    ));
  };

  return (
    <div className="w-full space-y-4 px-2">
      <FilterBadges
        form={form}
        companiesData={companiesData}
        onFilterSubmit={onFilterSubmit}
        vesselsData={vesselsData}
        projectsData={projectsData}
      />
      <div className="border border-border rounded-lg overflow-x-auto bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <th
                className="p-3 text-center min-w-[140px] cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('employeeName')}
              >
                {t($ => $.smartCard.table.employeeName)} {renderSortIndicator('employeeName')}
              </th>
              <th
                className="p-3 text-center min-w-[100px] cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('category')}
              >
                {t($ => $.smartCard.table.category)} {renderSortIndicator('category')}
              </th>
              {months.map(m => (
                <th key={m.key} className="p-3 text-center min-w-[80px]">{m.label}</th>
              ))}
              <th
                className="p-3 text-center min-w-[140px] font-bold cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('totalSubmissions')}
              >
                {t($ => $.smartCard.table.totalSubmission)} {renderSortIndicator('totalSubmissions')}
              </th>
              <th className="p-3 text-center min-w-[80px]">{t($ => $.smartCard.table.target)}</th>
              <th
                className="p-3 text-center min-w-[90px] cursor-pointer hover:bg-muted select-none"
                onClick={() => handleSort('rate')}
              >
                {t($ => $.smartCard.table.rate)} {renderSortIndicator('rate')}
              </th>
              {/* {employeeStatus === 'unmatched' && (
                <th className="p-3 text-center min-w-[120px]">{t($ => $.shared.action || 'Action')}</th>
              )} */}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              renderSkeletons()
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5 + months.length} className="p-8 text-center text-muted-foreground">
                  {t($ => $.smartCard.table.noEmployeesFound)}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-left">
                    <div className="font-medium text-foreground">{row.employeeName || '-'}</div>
                    <div className="text-xs text-muted-foreground">{row.companyName || '-'}</div>
                    {(row.category?.toLowerCase() === 'crew marine' || row.category?.toLowerCase() === 'marine') && (
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                        Vessel: {row.vesselName || '-'}
                      </div>
                    )}
                    {row.category?.toLowerCase() === 'project' && (
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                        Project: {row.projectName || '-'}
                      </div>
                    )}
                    {employeeStatus === 'unmatched' && row.suggestions && row.suggestions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-border/80">
                        <div className="text-[10px] text-muted-foreground font-medium mb-1.5">
                          {t($ => $.smartCardValidation.errorGroups.suggestions.title || 'Saran Pencocokan')}:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {row.suggestions.map((suggestion: any) => (
                            <Button
                              key={suggestion.id}
                              variant="outline"
                              size="sm"
                              disabled={reprocessGroupMutation.isPending}
                              onClick={() => handleMatchSuggestion(row.errorId, suggestion.id)}
                              className="text-[10px] h-6 px-2 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800 text-blue-700 flex items-center gap-1 font-normal"
                            >
                              <span>{suggestion.employeeName} @ {suggestion.companyName}</span>
                              <Badge className="text-[9px] h-4 px-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-none font-semibold">
                                {Math.round(suggestion.similarity * 100)}%
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={getCategoryBadgeClass(row.category)}>
                      {row.category || '-'}
                    </Badge>
                  </td>
                  {months.map(m => {
                    const count = row.monthlySubmissions[m.key] || 0;
                    return (
                      <td key={m.key} className={`p-3 border-l border-r border-border/50 ${getCellClass(count)}`}>
                        {count}
                      </td>
                    );
                  })}
                  <td className="p-3 font-bold text-center bg-muted/10">{row.totalSubmissions}</td>
                  <td className="p-3 text-center text-muted-foreground">{row.target}</td>
                  <td className="p-3 text-center">
                    <Badge className={getRateClass(row.rate)} variant="outline">
                      {row.rate}%
                    </Badge>
                  </td>
                  {employeeStatus === 'unmatched' && (
                    <td className="p-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateEmployee(row.employeeName || '', row.companyId || '', row.category || '')}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 h-8 px-2"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t($ => $.employee.smartCard.validation.createEmployee)}
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}

            {/* Summary Row */}
            {!isLoading && data.length > 0 && (
              <tr className="bg-muted/40 font-bold border-t-2 border-border">
                <td colSpan={2} className="p-3 text-center text-foreground">{t($ => $.smartCard.table.totalSubmission)}</td>
                {months.map(m => {
                  const pageMonthlyTotal = data.reduce((sum, row) => sum + (row.monthlySubmissions[m.key] || 0), 0);
                  return (
                    <td key={m.key} className="p-3 text-center text-foreground border-l border-r border-border/50 bg-muted/20">
                      {pageMonthlyTotal}
                    </td>
                  );
                })}
                <td className="p-3 text-center text-primary bg-primary/5 text-lg" colSpan={3}>
                  {data.reduce((sum, row) => sum + (row.totalSubmissions || 0), 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginationData.totalPages > 1 && (
        <div className="border-t border-border p-2">
          <DataTablePagination
            showPageSize={true}
            pageIndex={paginationData.page - 1} // Convert to 0-based index
            setPageIndex={(pageIndex) => {
              if (onPaginationChange) {
                onPaginationChange({
                  page: pageIndex + 1, // Convert back to 1-based index
                  limit: paginationData.limit,
                  total: paginationData.total,
                  totalPages: paginationData.totalPages,
                });
              }
            }}
            pageSize={paginationData.limit}
            setPageSize={(pageSize) => {
              if (onPaginationChange) {
                onPaginationChange({
                  page: 1, // Reset to first page
                  limit: pageSize,
                  total: paginationData.total,
                  totalPages: paginationData.totalPages,
                });
              }
            }}
            rowsCount={paginationData.total}
            paginationData={paginationData}
            onPaginationChange={onPaginationChange}
          />
        </div>
      )}

      {/* Dialog Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
    </div>
  );
};

export default DashboardViewEmployee;

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LuBriefcase, LuBuilding2 } from "react-icons/lu";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { Employee } from '@/service/employee/smart-card';
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  data: Employee[];
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  toolbarNew?: React.ReactNode;
  isLoading?: boolean;
}

const CardViewEmployee = ({ data, onPaginationChange, paginationData, toolbarNew, isLoading = false }: Props) => {
  const { t } = useAppTranslation();

  const getCategoryBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'mitra':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700';
      case 'project':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700';
      case 'marine':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getStatusBadgeClass = (statusOnDuty: boolean) => {
    return statusOnDuty 
      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700' 
      : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700';
  };

  const renderSkeletons = () => {
    return Array.from({ length: paginationData.limit || 6 }).map((_, i) => (
      <Card key={`skeleton-${i}`} className="rounded-lg border border-border shadow-sm animate-pulse">
        <CardContent className="px-4 py-4">
          <div className="flex justify-between items-start mb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end w-full">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="px-2 overflow-hidden">
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-row gap-2 justify-end p-0 bg-card/50">
          <div className="flex flex-row gap-2">
            {toolbarNew}
          </div>
        </div>

        {/* Employees Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSkeletons()}
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-border rounded-lg bg-card shadow-sm">
            {t($ => $.smartCard.table.noEmployeesFound)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((employee, index) => (
              <Card key={index} className="rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="px-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {employee.employeeName || '-'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getCategoryBadgeClass(employee.category)}>
                        {employee.category || t($ => $.smartCard.table.na)}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {employee.companyName && (
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-primary/10 rounded-full">
                            <LuBuilding2 className="h-3 w-3 text-primary" />
                          </div>
                          <span>{employee.companyName}</span>
                        </div>
                      )}
                      
                      {employee.position && (
                        <div className="flex items-center space-x-2">
                          <LuBriefcase className="h-4 w-4" />
                          <span>{employee.position}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-end w-full">
                      <Badge variant="outline" className={getStatusBadgeClass(employee.statusOnDuty)}>
                        <span className={`w-2 h-2 rounded-full mr-1 ${employee.statusOnDuty ? 'bg-green-500' : 'bg-red-500'}`} />
                        {employee.statusOnDuty ? t($ => $.smartCard.table.onDuty) : t($ => $.smartCard.table.off)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination - Using DataTablePagination like OngoingActivitiesPopover.tsx */}
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
      </div>
    </div>
  );
};

export default CardViewEmployee;
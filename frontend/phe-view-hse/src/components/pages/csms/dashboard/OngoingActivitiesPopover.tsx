import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Activity } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { to_decimal_formatted, string_date_formatted } from "@/lib/my-utils";
import NotificationItem from "./NotificationItem";
import { DataTablePagination } from "@/components/custom/table/data-table-pagination";
import { useState, useEffect } from "react";

interface OngoingActivitiesPopoverProps {
  isOngoingActivitiesPopoverOpen: boolean;
  setIsOngoingActivitiesPopoverOpen: (open: boolean) => void;
  handleOngoingActivitiesClick: () => void;
  isOngoingActivitiesLoading: boolean;
  ongoingActivities: any[];
  dashboardData: any;
  ongoingActivitiesMeta?: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
  };
  onOngoingActivitiesPageChange?: (page: number, limit: number) => void;
}

const OngoingActivitiesPopover = ({
  isOngoingActivitiesPopoverOpen,
  setIsOngoingActivitiesPopoverOpen,
  handleOngoingActivitiesClick,
  isOngoingActivitiesLoading,
  ongoingActivities,
  dashboardData,
  ongoingActivitiesMeta,
  onOngoingActivitiesPageChange
}: OngoingActivitiesPopoverProps) => {
  const { t } = useAppTranslation();
  const [localPage, setLocalPage] = useState(0);
  const [localLimit, setLocalLimit] = useState(10);

  useEffect(() => {
    // Reset to first page when popover is closed
    if (!isOngoingActivitiesPopoverOpen) {
      setLocalPage(0);
    }
  }, [isOngoingActivitiesPopoverOpen]);

  const handlePageChange = (page: number, limit: number) => {
    // page is already 1-based from the parent handler, convert to 0-based for local state
    setLocalPage(page - 1);
    setLocalLimit(limit);

    if (onOngoingActivitiesPageChange) {
      onOngoingActivitiesPageChange(page, limit);
    }
  };

  return (
    <Popover open={isOngoingActivitiesPopoverOpen} onOpenChange={setIsOngoingActivitiesPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className="bg-card text-card-foreground rounded-lg border border-border p-3 flex items-center space-x-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={handleOngoingActivitiesClick}
        >
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t($ => $.csms.dashboard.charts.ongoingActivities)}</p>
            <p className="text-sm font-bold text-foreground">
              {to_decimal_formatted(dashboardData?.ongoingActivitiesCount ?? 0, 0)}
            </p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-108 max-h-128 overflow-y-auto rounded-xl shadow-lg border border-border p-0 bg-popover text-popover-foreground">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-foreground">{t($ => $.csms.dashboard.charts.activitiesInProgress)}</h3>
        </div>
        {isOngoingActivitiesLoading ? (
          <div className="p-4 flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {ongoingActivities.length > 0 ? (
                Object.keys(ongoingActivities).map((key: string) => {
                  const notification = ongoingActivities[key as any];
                  // Check if it's the new notification format
                  if (typeof notification === 'object' && notification !== null && 'folderId' in notification) {
                    return <NotificationItem key={`notif-${notification.id || key}-${key}`} notification={notification} index={parseInt(key)} />;
                  }
                  // Fallback to the original activity format
                  return (
                    <div key={`act-${notification.id || key}-${key}`} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.contractName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.assessmentType && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mr-2">
                                {notification.assessmentType}
                              </span>
                            )}
                            {notification.status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${notification.status === 'On Going'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-muted text-muted-foreground'
                                }`}>
                                {notification.status}
                              </span>
                            )}
                          </p>
                        </div>
                        {notification.daysRemaining !== undefined && (
                          <div className="ml-2 flex-shrink-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${notification.daysRemaining < 0
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : notification.daysRemaining <= 7
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              }`}>
                              {notification.daysRemaining < 0
                                ? `${Math.abs(notification.daysRemaining)} days overdue`
                                : `${notification.daysRemaining} days left`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex text-xs text-muted-foreground">
                        <span>{string_date_formatted({ localeId: "id-ID", dateString: notification.startDate, format: "dd-MM-yyyy" })} - {string_date_formatted({ localeId: "id-ID", dateString: notification.endDate, format: "dd-MM-yyyy" })}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {t($ => $.shared.noData)}
                </div>
              )}
            </div>
            {ongoingActivitiesMeta && ongoingActivitiesMeta.totalPages > 1 && (
              <div className="border-t border-border p-2">
                <DataTablePagination
                  showPageSize={false}
                  pageIndex={localPage} // Use local 0-based page state
                  setPageIndex={(pageIndex) => handlePageChange(pageIndex + 1, localLimit)}
                  pageSize={ongoingActivitiesMeta.view}
                  setPageSize={(pageSize) => handlePageChange(1, pageSize)}
                  rowsCount={ongoingActivitiesMeta.total}
                  paginationData={{
                    page: ongoingActivitiesMeta.page + 1,
                    limit: ongoingActivitiesMeta.view,
                    total: ongoingActivitiesMeta.total,
                    totalPages: ongoingActivitiesMeta.totalPages
                  }}
                  onPaginationChange={(pagination) => handlePageChange(pagination.page, pagination.limit)}
                />
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default OngoingActivitiesPopover;
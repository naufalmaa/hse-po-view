import React from "react";
import { Badge } from "@/components/ui/badge";
import { LuClock, LuUser } from "react-icons/lu";
import { Link } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { CertificateTypeColors, NotificationStatusColors } from "@/constants/app-enum";
import { useAppTranslation } from "@/lib/i18n-typed";
import { string_date_formatted } from "@/lib/my-utils";
import { DataTablePagination } from "@/components/custom/table";
import { useNotificationMark } from "@/service/notification";

type Props = {
  data: any[];
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  toolbarNew?: React.ReactNode;
}

const ListViewNotification = ({ data, onPaginationChange, paginationData, toolbarNew }: Props) => {
  const { t } = useAppTranslation();
  const notificationMark = useNotificationMark();

  const getStatusBadge = (status: string) => {
    // Handle null, undefined, or empty status
    if (!status || typeof status !== 'string') {
      return (
        <Badge className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
          {t($ => $.notification.unknown)}
        </Badge>
      );
    }

    const colorClass = NotificationStatusColors[status.toLowerCase() as keyof typeof NotificationStatusColors] || NotificationStatusColors.active;

    return (
      <Badge className={`px-2.5 py-1 text-xs font-medium rounded-lg ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colorClass = CertificateTypeColors[type as keyof typeof CertificateTypeColors] || CertificateTypeColors.general;

    return (
      <Badge className={`px-2.5 py-1 text-xs font-medium rounded-lg ${colorClass}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  // Function to handle marking notification as read when detail link is clicked
  const handleDetailClick = (notificationId: string, isRead: boolean) => {
    // Only mark as read if it's currently unread
    if (!isRead) {
      notificationMark.mutate(notificationId);
    }
  };

  return (
    <div className="px-4 overflow-hidden">
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-row gap-2 justify-end p-0 bg-card/50">
          <div className="flex flex-row gap-2">
            {toolbarNew}
          </div>
        </div>

        {/* Notifications List */}
        <div className="border border-border rounded-lg overflow-hidden">
          {data.map((notification, index) => (
            <div
              key={`${notification.id}-${index}`}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 mb-3 md:mb-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {getTypeBadge(notification.type)}
                  {getStatusBadge(notification.status)}
                  {!notification.isRead && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t($ => $.notification.new)}</span>
                    </div>
                  )}
                </div>

                <h3 className="font-medium text-foreground mb-2">
                  {notification.message}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {notification.employeeName && (
                    <Link
                      className="flex items-center space-x-2 hover:underline text-foreground"
                      to={AppRoute.employee.detail.url}
                      search={{ id: notification.employeeId }}
                    >
                      <div className="p-1.5 bg-primary/10 rounded-full">
                        <LuUser className="h-3 w-3 text-primary" />
                      </div>
                      <span className="font-medium">{notification.employeeName}</span>
                    </Link>
                  )}

                  <div className="flex items-center space-x-2">
                    <LuClock className="h-4 w-4" />
                    <span>{string_date_formatted({ localeId: 'id', dateString: notification.triggeredAt, format: 'dd-MM-yyyy HH:mm' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                {notification.type === "assessment" ? (
                  <Link
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    to={AppRoute.csms.contractManagementDetails.url}
                    search={{ contractId: notification.contractId }}
                    onClick={() => handleDetailClick(notification.id, notification.isRead)}
                  >
                    {t($ => $.notification.viewDetails)}
                  </Link>
                ) : notification.type === "certificate" ? (
                  <Link
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    to={AppRoute.csms.qualification.url}
                    onClick={() => handleDetailClick(notification.id, notification.isRead)}
                  >
                    {t($ => $.notification.viewDetails)}
                  </Link>
                ) : (
                  <Link
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    to={AppRoute.employee.detail.url}
                    search={{ id: notification.employeeId }}
                    onClick={() => handleDetailClick(notification.id, notification.isRead)}
                  >
                    {t($ => $.notification.viewDetails)}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

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

export default ListViewNotification;
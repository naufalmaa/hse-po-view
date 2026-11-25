import { createFileRoute } from '@tanstack/react-router'
import { ContainerFilter, CardNotification, ListViewNotification } from "@/components/pages/notification/list";
import { useNotificationGet, useNotificationMarkAll } from "@/service/notification";
import { SkeTable } from "@/components/custom/skeleton";
import { AppRoute } from "@/constants/app-route";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { LuBell, LuFilter, LuMail, LuCheck, LuLayoutGrid, LuList, LuEye } from "react-icons/lu";
import { useState, useMemo } from "react";
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { useForm } from "react-hook-form";
import { useAppTranslation } from "@/lib/i18n-typed";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute('/_private/notification/list')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    onlyUnread: search.onlyUnread === 'true',
    orderBy: (search.orderBy as 'asc' | 'desc') || 'desc',
    limit: Number(search.limit) || 10,
    page: Number(search.page) || 1,
    view: (search.view as 'card' | 'list') || 'list', // Only accept card or list
  }),
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const navigate = Route.useNavigate()
  const pageParams = Route.useSearch()

  const [openFilter, setOpenFilter] = useState(false);
  const store = useAppStore();
  const initialFilter = store?.notificationList ?? defaultStore.notificationList;
  const form = useForm({
    defaultValues: {
      ...initialFilter,
      onlyUnread: initialFilter?.onlyUnread ? 'true' : 'false',
    }
  });

  // Set the initial view mode based on store or default to 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>(initialFilter?.viewMode === 'list' ? 'list' : 'card');

  // Update the store when view mode changes
  const updateViewMode = (newViewMode: 'card' | 'list') => {
    setViewMode(newViewMode);
    store.setNotificationList({ ...store?.notificationList, viewMode: newViewMode });
  };

  const notificationList = useNotificationGet({
    onlyUnread: pageParams.onlyUnread,
    orderBy: pageParams.orderBy,
    limit: pageParams.limit,
    page: pageParams.page - 1
  });
  const notifMarkAll = useNotificationMarkAll();

  // Merge employee and CSMS notifications into a single array
  const mergedNotifications = useMemo(() => {
    if (!notificationList.data?.data) return [];

    const employeeNotifications = notificationList.data.data.employee || [];
    const csmsNotifications = notificationList.data.data.csms || [];

    // Combine both arrays and sort by triggeredAt in descending order (newest first)
    const allNotifications = [...employeeNotifications, ...csmsNotifications].sort((a, b) => {
      const dateA = new Date(a.triggeredAt).getTime();
      const dateB = new Date(b.triggeredAt).getTime();
      return dateB - dateA;
    });

    return allNotifications;
  }, [notificationList.data]);

  const isLoading = () => {
    return (notificationList.isPending);
  }

  const handleMarkAllAsRead = () => {
    notifMarkAll.mutate(undefined, {
      onError: (error) => {
        console.error(t($ => $.notification.failedToMarkAllNotifications), error);
      }
    });
  };

  const getNotificationStats = () => {
    const data = notificationList?.data?.data;

    if (!data) return { total: 0, unread: 0 };

    const total = data.meta?.total || 0;
    const unread = mergedNotifications.filter((notif: any) => !notif.isRead).length || 0;

    return { total, unread };
  };

  const ViewFilterButton = () => {
    return (
      <Popover open={openFilter} onOpenChange={setOpenFilter}>
        <PopoverTrigger asChild>
          <Button
            disabled={isLoading()}
            variant="outline"
            className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
          >
            {isLoading() ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LuFilter className="h-4 w-4 mr-2" />
            )}
            {t($ => $.shared.filter)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <ContainerFilter
            form={form}
            onSubmit={onFilterSubmit}
            setOpenFilter={setOpenFilter} />
        </PopoverContent>
      </Popover>
    );
  }

  const ViewToggleButton = () => {
    const isCardView = viewMode === 'card';
    const isListView = viewMode === 'list';

    const getViewIcon = () => {
      if (isCardView) return <LuLayoutGrid className="h-4 w-4" />;
      if (isListView) return <LuList className="h-4 w-4" />;
      return <LuEye className="h-4 w-4" />;
    };

    const getViewLabel = () => {
      if (isCardView) return t($ => $.notification.cardView);
      if (isListView) return t($ => $.notification.listView);
      return t($ => $.notification.view);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-card border-border hover:bg-accent/50 transition-all duration-200">
            {getViewIcon()}
            <span className="ml-2 mr-1">{getViewLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => updateViewMode('card')}
            className={isCardView ? "bg-accent" : ""}
          >
            <LuLayoutGrid className="h-4 w-4 mr-2" />
            {t($ => $.notification.cardView)}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateViewMode('list')}
            className={isListView ? "bg-accent" : ""}
          >
            <LuList className="h-4 w-4 mr-2" />
            {t($ => $.notification.listView)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const onFilterSubmit = (data: any) => {
    const params = {
      ...pageParams,
      onlyUnread: data.onlyUnread,
      orderBy: data.orderBy,
      limit: pageParams.limit,
      page: 0
    }
    navigate({ to: AppRoute.notification.list.url, search: params });

    // Save filter values to store, including view mode
    store.setNotificationList({
      ...data,
      onlyUnread: data.onlyUnread === 'true',
      orderBy: data.orderBy,
      viewMode: viewMode
    });
  }

  // Handle pagination changes
  const handlePaginationChange = (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => {
    navigate({
      search: {
        ...pageParams,
        page: paginationData.page,
        limit: paginationData.limit,
      },
    });
  };

  // Render the appropriate view based on the view mode
  const renderNotificationView = () => {
    if (viewMode === 'card') {
      return (
        <CardNotification
          data={mergedNotifications}
          onPaginationChange={handlePaginationChange}
          paginationData={{
            ...pageParams,
            total: notificationList?.data?.meta?.total || 0,
            totalPages: notificationList?.data?.meta?.totalPages || 0,
          }}
          toolbarNew={
            <div className="flex gap-2">
              <ViewToggleButton />
              <ViewFilterButton />
            </div>
          }
        />
      );
    } else {
      return (
        <ListViewNotification
          data={mergedNotifications}
          onPaginationChange={handlePaginationChange}
          paginationData={{
            ...pageParams,
            total: notificationList?.data?.meta?.total || 0,
            totalPages: notificationList?.data?.meta?.totalPages || 0,
          }}
          toolbarNew={
            <div className="flex gap-2">
              <ViewToggleButton />
              <ViewFilterButton />
            </div>
          }
        />
      );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuBell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.notification.notificationCenter)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.notification.manageAndTrackNotifications)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isLoading() && notificationList.data && (() => {
              const stats = getNotificationStats();
              return (
                <>
                  <div className="flex items-center space-x-2">
                    {/* <Badge variant="secondary" className="px-3 py-1">
                      <LuMail className="h-3 w-3 mr-1" />
                      {stats.total} {t($ => $.notification.total)}
                    </Badge> */}
                    {/* {stats.unread > 0 && (
                        <Badge variant="destructive" className="px-3 py-1">
                          <LuMailOpen className="h-3 w-3 mr-1" />
                          {stats.unread} Unread
                        </Badge>
                      )} */}
                  </div>
                  {stats.unread > 0 && (
                    <Button
                      onClick={handleMarkAllAsRead}
                      disabled={notifMarkAll.isPending}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50 transition-all duration-200"
                    >
                      {notifMarkAll.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <LuCheck className="h-4 w-4 mr-2" />
                      )}
                      {t($ => $.notification.readAll)}
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="p-0">
          {isLoading() && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {notificationList.isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <LuBell className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.notification.errorLoadingNotifications)}</h3>
              <p className="text-destructive">{notificationList?.error?.message || t($ => $.notification.error)}</p>
            </div>
          )}

          {!isLoading() && notificationList?.data?.data && (
            <div className="rounded-lg overflow-hidden p-2">
              {renderNotificationView()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
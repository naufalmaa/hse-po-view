import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from "react";
import { useCsmsDashboard, useCsmsDashboardExport } from "@/service/csms/csms-dashboard";
import { useCsmsOngoingActivities } from "@/service/csms/csms-ongoing";
import { useCsmsIncomingActivities } from "@/service/csms/csms-incoming";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Download, Funnel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppTranslation } from '@/lib/i18n-typed';
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { useNavigate } from '@tanstack/react-router';
import { ContainerFilter, MetricCards, OngoingActivitiesPopover, IncomingActivitiesPopover, CompletionRateBreakdown, PerformanceAnalytics, ElementScoreBreakdown } from "@/components/pages/csms/dashboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute(
  '/_private/csms/dashboard',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const [openFilter, setOpenFilter] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [ongoingActivities, setOngoingActivities] = useState<any[]>([]);
  const [ongoingActivitiesMeta, setOngoingActivitiesMeta] = useState<any>(null);
  const [incomingActivities, setIncomingActivities] = useState<any[]>([]);
  const [incomingActivitiesMeta, setIncomingActivitiesMeta] = useState<any>(null);
  const [isOngoingActivitiesLoading, setIsOngoingActivitiesLoading] = useState(false);
  const [isIncomingActivitiesLoading, setIsIncomingActivitiesLoading] = useState(false);
  const [isOngoingActivitiesPopoverOpen, setIsOngoingActivitiesPopoverOpen] = useState(false);
  const [isIncomingActivitiesPopoverOpen, setIsIncomingActivitiesPopoverOpen] = useState(false);
  // Add state for timeline pagination
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineLimit, setTimelineLimit] = useState(10);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const store = useAppStore();
  const initialFilter = store?.csmsDashboard ?? defaultStore.csmsDashboard;

  const form = useForm({
    defaultValues: {
      ...initialFilter,
      // Ensure year is always a list of strings
      year: Array.isArray(initialFilter.year)
        ? initialFilter.year.map(y => y.toString())
        : [],
      // Set default limit
      limit: initialFilter.limit?.toString() || "10",
    }
  });

  const createBodyForm = (body: Record<any, any> = {}, page?: number, limit?: number) => {
    const newBody = { ...body };
    // For CSMS dashboard, ensure year is an array of integers
    if (newBody.year && Array.isArray(newBody.year)) {
      newBody.year = newBody.year.map((y: string | number) => parseInt(String(y), 10));
    } else {
      newBody.year = [];
    }
    // Add timeline pagination parameters
    newBody.page = (page !== undefined ? page : timelinePage) - 1; // Convert to 0-based index
    newBody.limit = limit !== undefined ? limit : (newBody.limit ? parseInt(newBody.limit, 10) : timelineLimit);
    return newBody;
  }

  const csmsDashboardMutation = useCsmsDashboard();
  const csmsDashboardExportMutation = useCsmsDashboardExport();
  const csmsOngoingActivitiesMutation = useCsmsOngoingActivities();
  const csmsIncomingActivitiesMutation = useCsmsIncomingActivities();

  const handleExport = () => {
    const filters = createBodyForm(form.getValues());
    
    toast.promise(csmsDashboardExportMutation.mutateAsync(filters), {
      loading: t($ => $.csms.dashboard.exportExcel.preparing),
      success: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const yearLabel = filters.year && filters.year.length > 0 ? filters.year.join('_') : new Date().getFullYear();
        link.setAttribute('download', `CSMS_Dashboard_Export_${yearLabel}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return t($ => $.csms.dashboard.exportExcel.success);
      },
      error: t($ => $.csms.dashboard.exportExcel.failed)
    });
  };

  const isLoading = () => {
    return csmsDashboardMutation.isPending;
  }

  const fetchData = (filters: any = {}) => {
    csmsDashboardMutation.mutate(
      filters,
      {
        onSuccess: (response: any) => {
          setDashboardData(response?.data);
        },
        onError: (error: any) => {
          console.error("Error fetching dashboard data:", error);
        }
      }
    );
  };

  useEffect(() => {
    fetchData(createBodyForm(form.getValues()));
  }, [timelinePage, timelineLimit]);

  const onFilterSubmit = (data: any) => {
    const newLimit = data.limit ? parseInt(data.limit, 10) : timelineLimit;
    setTimelineLimit(newLimit);

    // If we are already on page 1, setTimelinePage(1) won't trigger the useEffect.
    // So we need to call fetchData manually. Otherwise, the useEffect will handle it.
    if (timelinePage === 1) {
      fetchData(createBodyForm(data, 1, newLimit));
    } else {
      setTimelinePage(1);
    }

    setOpenFilter(false);
    store.setCsmsDashboard(createBodyForm(data, 1, newLimit));
  };

  const handleTimelinePageChange = (page: number, limit: number) => {
    setTimelinePage(page);
    setTimelineLimit(limit);
  };

  const handleOngoingActivitiesClick = (page: number = 1, limit: number = 10) => {
    if (dashboardData?.ongoingActivitiesCount > 0) {
      setIsOngoingActivitiesLoading(true);
      setIsOngoingActivitiesPopoverOpen(true);

      const filterData = {
        ...createBodyForm(form.getValues()),
        page: page - 1, // Convert to 0-based index
        limit
      };

      csmsOngoingActivitiesMutation.mutate(
        filterData,
        {
          onSuccess: (response: any) => {
            setOngoingActivities(response?.data || []);
            setOngoingActivitiesMeta(response?.meta || null);
            setIsOngoingActivitiesLoading(false);
          },
          onError: (error: any) => {
            setOngoingActivities([]);
            setOngoingActivitiesMeta(null);
            setIsOngoingActivitiesLoading(false);
          }
        }
      );
    }
  };

  const handleIncomingActivitiesClick = (page: number = 1, limit: number = 10) => {
    if (dashboardData?.incomingActivitiesCount > 0) {
      setIsIncomingActivitiesLoading(true);
      setIsIncomingActivitiesPopoverOpen(true);

      const filterData = {
        ...createBodyForm(form.getValues()),
        page: page - 1, // Convert to 0-based index
        limit
      };

      csmsIncomingActivitiesMutation.mutate(
        filterData,
        {
          onSuccess: (response: any) => {
            setIncomingActivities(response?.data || []);
            setIncomingActivitiesMeta(response?.meta || null);
            setIsIncomingActivitiesLoading(false);
          },
          onError: (error: any) => {
            console.error("Error fetching incoming activities:", error);
            setIncomingActivities([]);
            setIncomingActivitiesMeta(null);
            setIsIncomingActivitiesLoading(false);
          }
        }
      );
    }
  };

  const handleOngoingActivitiesPageChange = (page: number, limit: number) => {
    handleOngoingActivitiesClick(page, limit);
  };

  const handleIncomingActivitiesPageChange = (page: number, limit: number) => {
    handleIncomingActivitiesClick(page, limit);
  };

  const navigate = useNavigate();

  // Get unique years from completionRateBreakdown for tabs
  const completionYears = useMemo(() => {
    if (!Array.isArray(dashboardData?.completionRateBreakdown)) return [];
    return dashboardData.completionRateBreakdown.map((item: any) => item.year);
  }, [dashboardData?.completionRateBreakdown]);

  // Set the first year as active tab by default when we have data,
  // or if the currently selected year is no longer available in the new results
  useEffect(() => {
    if (completionYears.length > 0) {
      if (activeTab === null || !completionYears.includes(activeTab)) {
        setActiveTab(completionYears[0]);
      }
    } else if (activeTab !== null) {
      setActiveTab(null);
    }
  }, [completionYears, activeTab]);

  return (
    <div className="w-full space-y-6 ">
      {/* Header Section with Modern Design */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t($ => $.csms.dashboard.title)}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t($ => $.csms.dashboard.description)}</p>
          </div>
          <div className="flex items-center space-x-3">

            {/* Ongoing Activities Metric */}
            <OngoingActivitiesPopover
              isOngoingActivitiesPopoverOpen={isOngoingActivitiesPopoverOpen}
              setIsOngoingActivitiesPopoverOpen={setIsOngoingActivitiesPopoverOpen}
              handleOngoingActivitiesClick={() => handleOngoingActivitiesClick(1, 10)}
              isOngoingActivitiesLoading={isOngoingActivitiesLoading}
              ongoingActivities={ongoingActivities}
              dashboardData={dashboardData}
              ongoingActivitiesMeta={ongoingActivitiesMeta}
              onOngoingActivitiesPageChange={handleOngoingActivitiesPageChange}
            />

            {/* Incoming Activities Metric */}
            <IncomingActivitiesPopover
              isIncomingActivitiesPopoverOpen={isIncomingActivitiesPopoverOpen}
              setIsIncomingActivitiesPopoverOpen={setIsIncomingActivitiesPopoverOpen}
              handleIncomingActivitiesClick={() => handleIncomingActivitiesClick(1, 10)}
              isIncomingActivitiesLoading={isIncomingActivitiesLoading}
              incomingActivities={incomingActivities}
              dashboardData={dashboardData}
              incomingActivitiesMeta={incomingActivitiesMeta}
              onIncomingActivitiesPageChange={handleIncomingActivitiesPageChange}
            />

            <Popover open={openFilter} onOpenChange={setOpenFilter}>
              <PopoverTrigger asChild>
                <Button
                  disabled={isLoading()}
                  variant="outline"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 shadow-sm"
                >
                  {isLoading() ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Funnel className="h-4 w-4 mr-2" />
                  )}
                  {t($ => $.shared.filter)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-90 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <ContainerFilter
                  form={form as any}
                  onSubmit={onFilterSubmit}
                  setOpenFilter={setOpenFilter}
                />
              </PopoverContent>
            </Popover>

            <Button
              onClick={handleExport}
              disabled={csmsDashboardExportMutation.isPending}
              variant="outline"
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 shadow-sm"
            >
              {csmsDashboardExportMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t($ => $.shared.export)}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Cards with Modern Design */}
      <MetricCards dashboardData={dashboardData} />

      {/* Gantt Chart Section - Moved outside of tabs */}
      {/* <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t($ => $.csms.dashboard.charts.contractTimeline)}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t($ => $.csms.dashboard.charts.timelineDescription)}</p>
          </div>
        </div>
        <div className="p-6 relative">
          <div className="absolute inset-0 z-50">
            <SkeLoading loading={isLoading()} />
          </div>
          <GanttChart contracts={dashboardData?.timeline?.data || []} />
        </div>
        {dashboardData?.timeline?.meta && dashboardData?.timeline?.meta?.totalPages > 1 && (
          <div className="px-6 pb-6">
            <DataTablePagination
              showPageSize={false}
              pageIndex={timelinePage - 1} // Convert to 0-based index
              setPageIndex={(pageIndex: number) => handleTimelinePageChange(pageIndex + 1, timelineLimit)}
              pageSize={dashboardData?.timeline?.meta?.limit || timelineLimit}
              setPageSize={(pageSize: number) => handleTimelinePageChange(1, pageSize)}
              rowsCount={dashboardData?.timeline?.meta?.total || 0}
              paginationData={{
                page: timelinePage,
                limit: timelineLimit,
                total: dashboardData?.timeline?.meta?.total || 0,
                totalPages: dashboardData?.timeline?.meta?.totalPages || 1
              }}
              onPaginationChange={(pagination: { page: number; limit: number; total: number; totalPages: number }) => handleTimelinePageChange(pagination.page, pagination.limit)}
            />
          </div>
        )}
      </div> */}

      {/* Completion Rate Tabs Section */}
      <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border transition-all duration-300 hover:shadow-md">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">{t($ => $.csms.dashboard.charts.completionRate)}</h3>
            <p className="text-sm text-muted-foreground">{t($ => $.csms.dashboard.charts.completionRateDescription)}</p>
          </div>
        </div>
        <Tabs value={activeTab?.toString() || ''} onValueChange={(value) => setActiveTab(parseInt(value))} className="w-full">
          <TabsList className="flex justify-start w-full rounded-none border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-0 h-auto px-4 pt-2 gap-2 border-b border-border">
            {completionYears.map((year: number) => (
              <TabsTrigger
                key={year}
                value={year.toString()}
                className="relative h-10 rounded-lg text-muted-foreground hover:text-foreground data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 data-[state=active]:bg-card data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 font-medium data-[state=active]:z-10 data-[state=active]:-translate-y-1 transition-all duration-200"
              >
                {year}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="p-6">
            <PerformanceAnalytics 
              data={dashboardData?.performanceMetrics} 
              year={activeTab}
              isLoading={isLoading()} 
            />
            {completionYears.map((year: number) => (
              <TabsContent key={year} value={year.toString()} className="mt-0">
                <CompletionRateBreakdown
                  data={Array.isArray(dashboardData?.completionRateBreakdown) ? dashboardData.completionRateBreakdown.filter((item: any) => item.year === year) : []}
                />
                <div className="mt-8">
                  <ElementScoreBreakdown 
                    data={dashboardData?.elementBreakdown} 
                    semesterLabel={`${t($ => $.csms.dashboard.filter.year)} ${year}`}
                  />
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
import { createFileRoute } from '@tanstack/react-router'
import { useAppTranslation } from '@/lib/i18n-typed';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ClipboardList, Loader2, Search, Briefcase, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useObservationStatistics,
  useEmployeesWithoutObservations,
  useSmartCardDashboard,
  type Employee,
} from '@/service/employee/smart-card';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';
import { CardStats, FilterEmployee, NavigationSmartCard, ListViewEmployee, CardViewEmployee, DashboardViewEmployee } from '@/components/pages/employee/smart-card/smart-card';
import { useContractorGet } from '@/service/contractor-api';
import { useVesselGet } from '@/service/vessels-api';
import { useSubTypesList } from '@/service/sub-type-api';
import { useForm } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuFilter, LuLayoutGrid, LuList } from 'react-icons/lu';
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { date_to_string, string_to_date } from '@/lib/my-utils';
import { APP_CONFIG } from '@/constants/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute('/_private/employee/_smart-card/smart-card')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const user = auth?.user?.user;
  const isContractorUser = user?.role === 'contractor';
  const [hasInitialized, setHasInitialized] = useState(false);

  const store = useAppStore()
  const initialFilter = store?.smartCard ?? defaultStore.smartCard
  const form = useForm({
    defaultValues: {
      ...initialFilter,
      date_start: string_to_date(initialFilter.date_start, APP_CONFIG.dayFormat),
      date_end: string_to_date(initialFilter.date_end, APP_CONFIG.dayFormat),
      view: initialFilter.view || 'card',
      search: '',
      position: '',
      projectId: initialFilter.projectId || 'all',
      vesselId: initialFilter.vesselId || 'all',
      limit: 10,
      page: 0,
      employeeStatus: initialFilter.employeeStatus || 'all',
    }
  });

  const [paginationData, setPaginationData] = useState({
    page: 1,
    view: 10,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [dashboardPaginationData, setDashboardPaginationData] = useState({
    page: 1,
    view: 10,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Set the initial view mode based on store or default to 'card'
  const [viewMode, setViewMode] = useState<'card' | 'list'>(
    initialFilter?.view === 'list' ? 'list' : 'card'
  );

  // Update the store when view mode changes
  const updateViewMode = (newViewMode: 'card' | 'list') => {
    setViewMode(newViewMode);
    store.setSmartCard({ ...store?.smartCard, view: newViewMode });
  };

  const [openFilter, setOpenFilter] = useState(false);
  const [currentEmployeesData, setCurrentEmployeesData] = useState<Employee[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({ data: [], summary: { monthlyTotals: {}, grandTotal: 0 }, meta: { months: [] } });

  const { data: statistics, isLoading: isStatsLoading, refetch: refetchStats } = useObservationStatistics();
  const { data: companiesData, isLoading: isCompaniesLoading, refetch: refetchCompanies } = useContractorGet();
  const { data: pageListVesselData, isLoading: isVesselsLoading } = useVesselGet();
  const { data: subTypesListData, isLoading: isSubTypesLoading } = useSubTypesList();
  const employeesWithoutObservationsMutation = useEmployeesWithoutObservations();
  const smartCardDashboardMutation = useSmartCardDashboard();

  const vesselsData = pageListVesselData?.map((item: any) => ({
    id: item.id,
    name: item.vesselName
  })) || [];

  const projectsData = subTypesListData?.map((item: any) => ({
    value: item.id,
    label: item.name
  })) || [];

  const createBodyForm = (body: any) => {
    let date_start = '';
    let date_end = '';
    let category = ''
    let company = ''
    let projectId = ''
    let vesselId = ''
    
    if (body?.dateRange !== 'all') {
      date_start = date_to_string(body.date_start, APP_CONFIG.dayFormat);
      date_end = date_to_string(body.date_end, APP_CONFIG.dayFormat);
    }
    if (body?.company !== 'all') {
      company = body.company
    }
    if (body?.category !== 'all') {
      category = body.category
    }
    if (body?.projectId !== 'all') {
      projectId = body.projectId
    }
    if (body?.vesselId !== 'all') {
      vesselId = body.vesselId
    }

    const newBody = {
      ...body,
      date_start: date_start,
      date_end: date_end,
      category: category,
      company: company,
      projectId: projectId,
      vesselId: vesselId,
    }
    store.setSmartCard(body);
    return (newBody);
  }

  const isLoading = () => {
    return (
      isStatsLoading ||
      isCompaniesLoading ||
      employeesWithoutObservationsMutation.isPending ||
      smartCardDashboardMutation.isPending
    );
  };

  const loadDashboardData = async (body: Record<string, any>, pageIndex?: number, pageSize?: number) => {
    try {
      const activePage = pageIndex !== undefined ? pageIndex : dashboardPaginationData.page - 1;
      const activeLimit = pageSize !== undefined ? pageSize : dashboardPaginationData.limit;

      const dashboardBody = {
        ...body,
        page: activePage,
        limit: activeLimit,
      };

      const result = await smartCardDashboardMutation.mutateAsync(dashboardBody);
      if (result.success) {
        setDashboardData(result);
        setDashboardPaginationData({
          page: result.meta.page + 1,
          view: result.meta.view,
          limit: result.meta.view,
          total: result.meta.total,
          totalPages: result.meta.totalPages
        });
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const loadEmployeesWithoutObservations = async (showNotif: boolean = false, body: Record<string, any>, pageIndex?: number, pageSize?: number) => {
    try {
      const activePage = pageIndex !== undefined ? pageIndex : paginationData.page - 1;
      const activeLimit = pageSize !== undefined ? pageSize : paginationData.limit;

      const employeesBody = {
        ...body,
        page: activePage,
        limit: activeLimit,
      };

      const result = await employeesWithoutObservationsMutation.mutateAsync(employeesBody);
      if (result.success) {
        setCurrentEmployeesData(result.data);
        setPaginationData({
          page: result.meta.page + 1,
          view: result.meta.view,
          limit: result.meta.view,
          total: result.meta.total,
          totalPages: result.meta.totalPages
        });
        if (showNotif) {
          showNotifSuccess({ message: result?.message || 'Data loaded successfully' });
        }
      } else {
        showNotifError({ message: 'Failed to load employees data' });
      }
    } catch (error: any) {
      showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) || error?.message || 'Failed to load data' });
    }
  };

  const loadAllData = async (showNotif: boolean = false, body: Record<string, any>) => {
    await Promise.all([
      loadDashboardData(body),
      loadEmployeesWithoutObservations(showNotif, body)
    ]);
  };

  const handleRefreshData = async () => {
    await Promise.all([
      refetchStats(),
      refetchCompanies(),
      loadAllData(true, createBodyForm(form.getValues()))
    ]);
  };

  useEffect(() => {
    if (hasInitialized) return;

    if (!isContractorUser) {
      loadAllData(false, createBodyForm(form.getValues()));
      setHasInitialized(true);
    } else if (companiesData && companiesData.length > 0) {
      const contractorCompany = companiesData[0];
      form.setValue('company', contractorCompany.id);
      
      if (contractorCompany.category) {
        const cat = contractorCompany.category.toLowerCase();
        form.setValue('category', cat);
        if (cat === 'marine') {
          form.setValue('projectId', 'all');
        } else if (cat === 'project') {
          form.setValue('vesselId', 'all');
        }
      }

      // If contractor has vessels, set default vesselId to 'all'
      if (contractorCompany.vessels && contractorCompany.vessels.length > 0) {
        form.setValue('vesselId', 'all');
      }

      loadAllData(false, createBodyForm(form.getValues()));
      setHasInitialized(true);
    }
  }, [companiesData, isContractorUser, hasInitialized]);

  const handlePaginationChange = (pagination: { page: number; limit: number }) => {
    setPaginationData(prev => ({ ...prev, page: pagination.page, limit: pagination.limit }));
    loadEmployeesWithoutObservations(false, createBodyForm(form.getValues()), pagination.page - 1, pagination.limit);
  };

  const handleDashboardPaginationChange = (pagination: { page: number; limit: number }) => {
    setDashboardPaginationData(prev => ({ ...prev, page: pagination.page, limit: pagination.limit }));
    loadDashboardData(createBodyForm(form.getValues()), pagination.page - 1, pagination.limit);
  };

  const onFilterSubmit = (data: any) => {
    setDashboardPaginationData(prev => ({ ...prev, page: 1 }));
    setPaginationData(prev => ({ ...prev, page: 1 }));
    loadAllData(true, createBodyForm(data))
    setOpenFilter(false);
  }

  const ViewToggleButton = () => {
    const isCardView = viewMode === 'card';
    const isListView = viewMode === 'list';

    const getViewIcon = () => {
      if (isCardView) return <LuLayoutGrid className="h-4 w-4" />;
      return <LuList className="h-4 w-4" />;
    };

    const getViewLabel = () => {
      if (isCardView) return t($ => $.notification.cardView);
      return t($ => $.notification.listView);
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

  // Render the appropriate view based on the view mode
  const renderEmployeeView = () => {
    if (viewMode === 'list') {
      return (
        <ListViewEmployee
          data={currentEmployeesData}
          onPaginationChange={handlePaginationChange}
          paginationData={paginationData}
          isLoading={employeesWithoutObservationsMutation.isPending}
        />
      );
    } else {
      return (
        <CardViewEmployee
          data={currentEmployeesData}
          onPaginationChange={handlePaginationChange}
          paginationData={paginationData}
          isLoading={employeesWithoutObservationsMutation.isPending}
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
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.smartCard.title)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.smartCard.description)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <NavigationSmartCard
        onRefreshData={handleRefreshData}
        isRefreshing={isLoading()}
      />

      {/* Statistics Dashboard */}
      <CardStats statistics={statistics} isStatsLoading={isStatsLoading} />

      {/* Top Card: Dashboard Compliance */}
      <Card className="bg-white border border-border shadow-sm gap-2">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Dashboard Kepatuhan Kartu Pintar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col px-4 gap-0">
          <Tabs
            value={form.watch('employeeStatus') || 'all'}
            onValueChange={(val) => {
              form.setValue('employeeStatus', val);
              setDashboardPaginationData(prev => ({ ...prev, page: 1 }));
              setPaginationData(prev => ({ ...prev, page: 1 }));
              loadAllData(false, createBodyForm(form.getValues()));
            }}
            className="w-full"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <TabsList className="bg-muted text-muted-foreground p-0.5 rounded-lg">
                <TabsTrigger value="all" className="px-3 py-1.5 text-xs sm:text-sm">
                  {t($ => $.smartCard.filters.employeeStatusAll)}
                </TabsTrigger>
                <TabsTrigger value="registered" className="px-3 py-1.5 text-xs sm:text-sm">
                  {t($ => $.smartCard.filters.employeeStatusRegistered)}
                </TabsTrigger>
                <TabsTrigger value="unmatched" className="px-3 py-1.5 text-xs sm:text-sm">
                  {t($ => $.smartCard.filters.employeeStatusUnmatched)}
                </TabsTrigger>
              </TabsList>

              <div className="sm:flex sm:flex-row grid grid-cols-1 gap-4 justify-end flex-wrap px-2 w-full lg:w-auto">
                {/* Search Inputs */}
                <div className="relative w-full sm:w-64">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t($ => $.smartCard.filters.searchTooltip)}</p>
                      <p className="text-xs text-muted/80">Press Enter to submit</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    placeholder={t($ => $.smartCard.filters.searchPlaceholder)}
                    value={form.watch('search') || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue('search', e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        setDashboardPaginationData(prev => ({ ...prev, page: 1 }));
                        setPaginationData(prev => ({ ...prev, page: 1 }));
                        loadAllData(false, createBodyForm(form.getValues()));
                      }
                    }}
                    className="pl-8 pr-8 w-full"
                  />
                  {form.watch('search') && (
                    <X
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => {
                        form.setValue('search', '');
                        setDashboardPaginationData(prev => ({ ...prev, page: 1 }));
                        setPaginationData(prev => ({ ...prev, page: 1 }));
                        loadAllData(false, createBodyForm(form.getValues()));
                      }}
                    />
                  )}
                </div>

                <Popover open={openFilter} onOpenChange={setOpenFilter}>
                  <PopoverTrigger asChild>
                    <Button
                      disabled={isCompaniesLoading}
                      variant="outline"
                      className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      {isCompaniesLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LuFilter className="h-4 w-4 mr-2" />
                      )}
                      {t($ => $.shared.filter)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-95">
                    <FilterEmployee
                      form={form}
                      companiesData={companiesData}
                      projectsData={projectsData}
                      vesselsData={vesselsData}
                      isLoading={isCompaniesLoading}
                      onSubmit={onFilterSubmit}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Tabs>
          <DashboardViewEmployee
            data={dashboardData?.data || []}
            months={dashboardData?.meta?.months || []}
            monthlyTotals={dashboardData?.summary?.monthlyTotals || {}}
            grandTotal={dashboardData?.summary?.grandTotal || 0}
            onPaginationChange={handleDashboardPaginationChange}
            paginationData={dashboardPaginationData}
            form={form}
            companiesData={companiesData || []}
            onFilterSubmit={onFilterSubmit}
            vesselsData={vesselsData || []}
            projectsData={projectsData || []}
            isLoading={smartCardDashboardMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Bottom Card: Belum Mengisi */}
      <Card className="bg-gray-50 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700 gap-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              {t($ => $.smartCard.notFilledTitle)}
            </CardTitle>
            <ViewToggleButton />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col px-4 gap-0">
          {renderEmployeeView()}
        </CardContent>
      </Card>
    </div>
  );
}
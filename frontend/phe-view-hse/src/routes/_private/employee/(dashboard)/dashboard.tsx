import { Badge } from "@/components/ui/badge";
import { LuUsers, LuTrendingUp } from "react-icons/lu";
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from "react";
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { useForm } from "react-hook-form";
import { useEmployeeCompanyRank } from "@/service/employee";
import {
  useEmployeeDashboard,
  EmployeeDashboardResponse,
  EmployeeDashboardData,
  CompliancePerDocument,
  HealthRiskPerCategory
} from "@/service/employee/employee-dashboard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Funnel, Loader2 } from "lucide-react";
import { useAppTranslation } from '@/lib/i18n-typed';
import { showNotifError } from "@/lib/show-notif";
import { BarChart, StackedBarChart, StackedCompanyBarChart, ContainerFilter, FilterCompliance, FilterComplianceRank, FilterHealthRank, DashboardStatsCards, PieOnDuty } from "@/components/pages/employee/dashboard";
import { useContractorGet } from "@/service/contractor-api";
import { AppRoute } from "@/constants/app-route";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { useAuth } from "@/hooks/use-auth";
import { isContractor } from "@/types/auth";

export const Route = createFileRoute('/_private/employee/(dashboard)/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth();
  const isUserContractor = isContractor(auth?.user || null);
  const navigate = Route.useNavigate();
  const { t } = useAppTranslation();

  const [openFilter, setOpenFilter] = useState(false);
  const [openFilterCompliance, setOpenFilterCompliance] = useState(false);
  const [openFilterHealthRisk, setOpenFilterHealthRisk] = useState(false);
  const [openFilterComplianceRank, setOpenFilterComplianceRank] = useState(false);
  const [openFilterHealthRank, setOpenFilterHealthRank] = useState(false);
  const [openFilterCrewProject, setOpenFilterCrewProject] = useState(false);


  const store = useAppStore();
  const initialFilter = store?.employeeDashboard ?? defaultStore.employeeDashboard;
  const form = useForm({
    defaultValues: {
      ...initialFilter,
    }
  });
  const formComplianceRate = useForm({
    defaultValues: {
      ...initialFilter.complianceRate,
    }
  });
  const formHealthRisk = useForm({
    defaultValues: {
      ...initialFilter.healthRisk,
    }
  });
  const formComplianceRank = useForm({
    defaultValues: {
      ...initialFilter,
      ...initialFilter.complianceRank,
    }
  });
  const formHealthRank = useForm({
    defaultValues: {
      ...initialFilter,
      ...initialFilter.healthRank,
    }
  });
  const formCrewProject = useForm({
    defaultValues: { orderBy: 'desc' }
  });

  const selectedOhih = formHealthRank.watch("rankHealthOhih") || [];
  const isP13Active = selectedOhih.length === 3 && selectedOhih.includes("P1") && selectedOhih.includes("P2") && selectedOhih.includes("P3");
  const isP4Active = selectedOhih.length === 1 && selectedOhih.includes("P4");
  const isP57Active = selectedOhih.length === 3 && selectedOhih.includes("P5") && selectedOhih.includes("P6") && selectedOhih.includes("P7");


  const [subTypes, setSubTypes] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<EmployeeDashboardData | null>(null);
  const [complianceRate, setComplianceRate] = useState<CompliancePerDocument[] | null>(null);
  const [healthRisk, setHealthRisk] = useState<HealthRiskPerCategory[] | null>(null);
  const [complianceRank, setComplianceRank] = useState<any[] | null>(null);
  const [healthRank, setHealthRank] = useState<any[] | null>(null);
  const [crewProjectData, setCrewProjectData] = useState<any[] | null>(null);
  const [crewVesselData, setCrewVesselData] = useState<any[] | null>(null);

  const totalCrewProject = crewProjectData?.reduce((acc, curr) => acc + (curr.crewOnDuty || 0), 0) ?? 0;
  const totalCrewVessel = crewVesselData?.reduce((acc, curr) => acc + (curr.crewOnDuty || 0), 0) ?? 0;

  const contractorListQuery = useContractorGet();
  const employeeDashboardMutation = useEmployeeDashboard();
  const employeeCompanyRankMutation = useEmployeeCompanyRank();

  const isLoading = () => {
    return (contractorListQuery.isPending || employeeDashboardMutation.isPending || employeeCompanyRankMutation.isPending);
  }

  const createBodyForm = (body: Record<any, any> = {}) => {
    return {
      filter: {
        years: body?.years,
        category: body?.category,
        subContractorIds: body?.subContractorIds
      },
      options: {
        fileType: body?.fileType
      },
      rankComplianceDoc: body?.rankComplianceDoc,
      rankHealthOhih: body?.rankHealthOhih,
      rankHealthTypes: [body?.rankHealthTypes]
    }
  }

  useEffect(() => {
    if (contractorListQuery.data) {
      const newSubTypeOptions = contractorListQuery.data.map((item: any) => ({
        value: item.id,
        label: item.name
      }));

      setSubTypes(newSubTypeOptions);
    }
  }, [contractorListQuery.data]);

  useEffect(() => {
    fetchData(form.getValues());
  }, [])

  const sortingComplianceRate = (data_: CompliancePerDocument[], order: number) => {
    return data_.sort((a, b) => {
      return (b.pct - a.pct) * order;
    });
  }
  const sortingHealthRisk = (data_: HealthRiskPerCategory[], order: number) => {
    return data_.sort((a, b) => {
      return a.category.localeCompare(b.category) * order;
    });
  }
  const sortingComplianceRank = (data_: any[], order: number) => {
    const top10 = [...data_]
      .sort((a: any, b: any) => (b.pct ?? 0) - (a.pct ?? 0))
      .slice(0, 10);
    return top10.sort((a: any, b: any) => {
      return ((b.pct ?? 0) - (a.pct ?? 0)) * order;
    });
  }
  const sortingHealthRank = (data_: any[], order: number, keyType: string) => {
    const key = keyType === "status" ? "statusPct" : "followUpPct";
    const top10 = [...data_]
      .sort((a: any, b: any) => (b[key] ?? 0) - (a[key] ?? 0))
      .slice(0, 10);
    return top10.sort((a: any, b: any) => {
      return ((b[key] ?? 0) - (a[key] ?? 0)) * order;
    });
  }
  const sortingCrewData = (data_: any[], order: number) => {
    return data_.sort((a: any, b: any) => {
      return (b.crewOnDuty - a.crewOnDuty) * order;
    });
  }

  const httpEmployeeDashboard = (body: Record<any, any> = {}) => {
    employeeDashboardMutation.mutate(
      { body: createBodyForm(body) },
      {
        onSuccess: (response: EmployeeDashboardResponse) => {
          setDashboardData(response.data);
          setComplianceRate(sortingComplianceRate(response.data.compliancePerDocument ?? [], store?.employeeDashboard?.complianceRate?.orderBy === 'asc' ? -1 : 1));
          setHealthRisk(sortingHealthRisk(response.data.healthRiskPerCategory ?? [], store?.employeeDashboard?.healthRisk?.orderBy === 'asc' ? 1 : -1));
          setCrewProjectData(sortingCrewData(response.data.crewOnDutyByProject ?? [], 1));
          setCrewVesselData(sortingCrewData(response.data.crewOnDutyByVessel ?? [], 1));
          store.setEmployeeDashboard(form.getValues());
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  }
  const httpEmployeeCompanyRank = (body: Record<any, any> = {}) => {
    employeeCompanyRankMutation.mutate(
      { body: createBodyForm(body) },
      {
        onSuccess: (response: any) => {
          setComplianceRank(sortingComplianceRank(response?.data?.complianceRankByCompany ?? [], body?.complianceRank?.orderBy === 'asc' ? -1 : 1));
          setHealthRank(sortingHealthRank(response?.data?.healthRankByCompany ?? [], body?.healthRank?.orderBy === 'asc' ? -1 : 1, body?.rankHealthTypes));
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  }

  const fetchData = (body: Record<any, any> = {}) => {
    httpEmployeeDashboard(body);
    httpEmployeeCompanyRank(body);
  }

  const getBaseFilters = () => {
    const values = form.getValues();
    return {
      subContractorId: values.subContractorIds,
      category: values.category,
      fromDashboard: true,
    }
  }

  const onFilterSubmit = (body: Record<any, any> = {}) => {
    const body_ = {
      ...store?.employeeDashboard,
      ...body
    }
    formComplianceRank.reset({ ...body_, orderBy: body?.complianceRank?.orderBy });
    fetchData(body_);
  }

  const onFilterSubmitCompliance = (body: Record<any, any> = {}) => {
    // Update the store with new compliance rate settings
    store.setEmployeeDashboard({
      ...store?.employeeDashboard,
      complianceRate: {
        ...store?.employeeDashboard?.complianceRate,
        ...body
      }
    });

    // Create a new array reference to trigger re-render
    const currentData = complianceRate ? [...complianceRate] : [];
    const order = body?.orderBy === 'asc' ? -1 : 1;

    // Sort the data and update state
    const sortedData = sortingComplianceRate(currentData, order);
    setComplianceRate(sortedData);
  }

  const onFilterSubmitHealthRisk = (body: Record<any, any> = {}) => {
    // Update the store with new compliance rate settings
    store.setEmployeeDashboard({
      ...store?.employeeDashboard,
      healthRisk: {
        ...store?.employeeDashboard?.healthRisk,
        ...body
      }
    });

    // Create a new array reference to trigger re-render
    const currentData = healthRisk ? [...healthRisk] : [];
    const order = body?.orderBy === 'asc' ? 1 : -1;

    // Sort the data and update state
    const sortedData = sortingHealthRisk(currentData, order);
    setHealthRisk(sortedData);
  }

  const onFilterSubmitComplianceRank = (body: Record<any, any> = {}) => {
    const body_ = {
      ...store?.employeeDashboard,
      rankComplianceDoc: body?.rankComplianceDoc,
      orderBy: body?.orderBy,
      complianceRank: {
        ...store?.employeeDashboard?.complianceRank,
        orderBy: body?.orderBy,
      },
      healthRank: {
        ...store?.employeeDashboard?.healthRank,
        orderBy: store?.employeeDashboard?.healthRank?.orderBy,
      }
    }

    form.reset(body_);
    httpEmployeeCompanyRank(body_);
  }

  const onFilterSubmitHealthRank = (body: Record<any, any> = {}) => {
    const body_ = {
      ...store?.employeeDashboard,
      rankHealthOhih: body?.rankHealthOhih,
      rankHealthTypes: body?.rankHealthTypes,
      orderBy: body?.orderBy,
      healthRank: {
        ...store?.employeeDashboard?.healthRank,
        orderBy: body?.orderBy,
      },
      complianceRank: {
        ...store?.employeeDashboard?.complianceRank,
        orderBy: store?.employeeDashboard?.complianceRank?.orderBy,
      }
    }

    form.reset(body_);
    httpEmployeeCompanyRank(body_);
  }

  const handleHealthRankBadgeClick = (keys: string[]) => {
    formHealthRank.setValue("rankHealthOhih", keys);
    onFilterSubmitHealthRank(formHealthRank.getValues());
  }

  const onFilterSubmitCrewProject = (body: Record<any, any> = {}) => {
    const currentData = crewProjectData ? [...crewProjectData] : [];
    const order = body?.orderBy === 'asc' ? -1 : 1;
    setCrewProjectData(sortingCrewData(currentData, order));
  }



  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuUsers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.employee.dashboard.title)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.employee.dashboard.description)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="px-3 py-1">
              <LuTrendingUp className="h-3 w-3 mr-1" />
              {t($ => $.employee.dashboard.performanceAnalytics)}
            </Badge>
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
                    <Funnel className="h-4 w-4 mr-2" />
                  )}
                  {t($ => $.shared.filter)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <ContainerFilter
                  form={form}
                  subtypes={subTypes}
                  onSubmit={onFilterSubmit}
                  setOpenFilter={setOpenFilter} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStatsCards dashboardData={dashboardData} baseFilters={getBaseFilters()} />

      {(() => {
        const showProjectPie = !isUserContractor || (dashboardData?.contractorCategories?.some(cat => cat === 'project' || cat === 'mitra') ?? true);
        const showVesselPie = !isUserContractor || (dashboardData?.contractorCategories?.includes('marine') ?? true);
        
        return (
          <div className={`grid grid-cols-1 ${showProjectPie && showVesselPie ? "xl:grid-cols-2" : "xl:grid-cols-1"} gap-6`}>
            {showProjectPie && (
              <PieOnDuty
                isLoading={isLoading()}
                data={crewProjectData ?? []}
                total={totalCrewProject}
                title={isUserContractor ? "Kru Bertugas" : t($ => $.employee.dashboard.charts.crewOnDutyByProject)}
                description={isUserContractor ? "Total kru Anda yang sedang bertugas" : t($ => $.employee.dashboard.charts.totalCrewOnDutyByProject)}
                nameKey="projectName"
                filterComponent={
                  <Popover open={openFilterCrewProject} onOpenChange={setOpenFilterCrewProject}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading()}
                        className=""
                      >
                        {isLoading() ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Funnel className="h-3 w-3 mr-2" />
                        )}
                        {t($ => $.shared.filter)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <FilterCompliance
                        form={formCrewProject}
                        onSubmit={onFilterSubmitCrewProject}
                        setOpenFilter={setOpenFilterCrewProject}
                        defaultValues={{ orderBy: 'desc' }} />
                    </PopoverContent>
                  </Popover>
                }
                onClick={(item) => {
                  navigate({
                    to: AppRoute.employee.list.url,
                    search: {
                      ...getBaseFilters(),
                      subContractorId: item.subContractorId,
                      projectId: item.projectId,
                      vesselId: "",
                      statusOnDuty: "true",
                      category: [EMPLOYEE_TYPE.project.value, EMPLOYEE_TYPE.mitra.value].join(","),
                      viewMode: "tableSimple"
                    }
                  } as any)
                }}
              />
            )}

            {showVesselPie && (
              <PieOnDuty
                isLoading={isLoading()}
                data={crewVesselData ?? []}
                total={totalCrewVessel}
                title={isUserContractor ? "Kru Bertugas" : t($ => $.employee.dashboard.charts.crewOnDutyByVessel)}
                description={isUserContractor ? "Total kru Anda yang sedang bertugas" : t($ => $.employee.dashboard.charts.totalCrewOnDutyByVessel)}
                nameKey="vesselName"
                onClick={(item) => {
                  navigate({
                    to: AppRoute.employee.list.url,
                    search: {
                      ...getBaseFilters(),
                      projectId: "",
                      subContractorId: item.subContractorId,
                      vesselId: item.vesselId,
                      statusOnDuty: "true",
                      category: EMPLOYEE_TYPE.marine.value,
                      viewMode: "tableSimple"
                    }
                  } as any)
                }}
              />
            )}
          </div>
        );
      })()}



      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t($ => $.employee.dashboard.charts.complianceRatePerDocument)}</h3>
                <Popover open={openFilterCompliance} onOpenChange={setOpenFilterCompliance}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading()}
                      className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      {isLoading() ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Funnel className="h-3 w-3 mr-2" />
                      )}
                      {t($ => $.shared.filter)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <FilterCompliance
                      form={formComplianceRate}
                      onSubmit={onFilterSubmitCompliance}
                      setOpenFilter={setOpenFilterCompliance} />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t($ => $.employee.dashboard.charts.documentCompletionPerformance)}</p>
            </div>
          </div>
          <div className="p-6">
            <BarChart
              values={complianceRate ?? []}
              keyX={"pct"}
              keyY={"key"}
              color={'#3b82f6'}
              disableBarClick={true}
              tooltipFields={[
                {
                  label: t($ => $.employee.dashboard.submittedCount),
                  value: (item) => `${item.count} / ${item.total}`
                }
              ]}
              actions={[
                {
                  label: t($ => $.shared.detail),
                  onClick: (item) => {
                    navigate({
                      to: AppRoute.employee.list.url,
                      search: {
                        ...getBaseFilters(),
                        complianceDocKey: item.key,
                      }
                    } as any)
                  }
                }
              ]}
            />
          </div>
        </div>

{/* bar chart [1,2] */}
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t($ => $.employee.dashboard.charts.healthRiskRatePerCategory)}</h3>
                {/* <Popover open={openFilterHealthRisk} onOpenChange={setOpenFilterHealthRisk}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading()}
                      className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      {isLoading() ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Funnel className="h-3 w-3 mr-2" />
                      )}
                      {t($ => $.shared.filter)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <FilterCompliance
                      form={formHealthRisk}
                      onSubmit={onFilterSubmitHealthRisk}
                      setOpenFilter={setOpenFilterHealthRisk} />
                  </PopoverContent>
                </Popover> */}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t($ => $.employee.dashboard.charts.riskAssessmentDistribution)}</p>
            </div>
          </div>
          <div className="p-6">
            <StackedBarChart
              values={healthRisk ?? []}
              onClick={(category) => {
                navigate({
                  to: AppRoute.employee.list.url,
                  search: {
                    ...getBaseFilters(),
                    ohihReview: category,
                    viewMode: "simple"
                  }
                } as any)
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

{/* bar chart [2,1] */}
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t($ => $.employee.dashboard.charts.complianceRateRankByCompany)}</h3>
                <Popover open={openFilterComplianceRank} onOpenChange={setOpenFilterComplianceRank}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading()}
                      className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      {isLoading() ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Funnel className="h-3 w-3 mr-2" />
                      )}
                      {t($ => $.shared.filter)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <FilterComplianceRank
                      form={formComplianceRank}
                      onSubmit={onFilterSubmitComplianceRank}
                      setOpenFilter={setOpenFilterComplianceRank} />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t($ => $.employee.dashboard.charts.topCompaniesByCompliance)}</p>
            </div>
          </div>
          <div className="p-6">
            <BarChart
              values={complianceRank ?? []}
              keyX={"pct"}
              keyY={"company"}
              color={'#f59e0b'}
              disableBarClick={true}
              inverseY={false}
              isContractor={isUserContractor}
              allowedContractorIds={dashboardData?.allowedContractorIds || []}
              tooltipFields={[
                {
                  label: t($ => $.employee.dashboard.submittedCount),
                  value: (item) => `${item.count} / ${item.total}`
                }
              ]}
              actions={[
                {
                  label: t($ => $.shared.detail),
                  onClick: (item) => {
                    navigate({
                      to: AppRoute.employee.list.url,
                      search: {
                        ...getBaseFilters(),
                        subContractorId: item.subContractorId,
                        complianceDocKey: formComplianceRank.getValues().rankComplianceDoc,
                      }
                    } as any)
                  }
                }
              ]}
            />
          </div>
        </div>

{/* bar chart [2,2] */}
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t($ => $.employee.dashboard.charts.healthRateRankByCompany)}</h3>
                <Popover open={openFilterHealthRank} onOpenChange={setOpenFilterHealthRank}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading()}
                      className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      {isLoading() ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Funnel className="h-3 w-3 mr-2" />
                      )}
                      {t($ => $.shared.filter)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <FilterHealthRank
                      form={formHealthRank}
                      onSubmit={onFilterSubmitHealthRank}
                      setOpenFilter={setOpenFilterHealthRank} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center justify-between mt-2 gap-4">
                <p className="text-sm text-muted-foreground truncate" title={t($ => $.employee.dashboard.charts.topCompaniesByHealth)}>
                  {t($ => $.employee.dashboard.charts.topCompaniesByHealth)}
                </p>
                <div className="flex flex-row gap-2 shrink-0">
                  <Badge
                    variant={isP13Active ? "default" : "outline"}
                    className="cursor-pointer transition-all duration-200 text-xs font-semibold px-2.5 py-0.5 hover:opacity-90 select-none"
                    onClick={() => handleHealthRankBadgeClick(["P1", "P2", "P3"])}
                  >
                    P1-P3
                  </Badge>
                  <Badge
                    variant={isP4Active ? "default" : "outline"}
                    className="cursor-pointer transition-all duration-200 text-xs font-semibold px-2.5 py-0.5 hover:opacity-90 select-none"
                    onClick={() => handleHealthRankBadgeClick(["P4"])}
                  >
                    P4
                  </Badge>
                  <Badge
                    variant={isP57Active ? "default" : "outline"}
                    className="cursor-pointer transition-all duration-200 text-xs font-semibold px-2.5 py-0.5 hover:opacity-90 select-none"
                    onClick={() => handleHealthRankBadgeClick(["P5", "P6", "P7"])}
                  >
                    P5-P7
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <StackedCompanyBarChart
              values={healthRank ?? []}
              activeCategories={formHealthRank.watch("rankHealthOhih") || []}
              isContractor={isUserContractor}
              allowedContractorIds={dashboardData?.allowedContractorIds || []}
              onClick={(item) => {
                navigate({
                  to: AppRoute.employee.list.url,
                  search: {
                    ...getBaseFilters(),
                    subContractorId: item.subContractorId,
                    ohihReview: formHealthRank.getValues().rankHealthOhih || [],
                    viewMode: "simple"
                  }
                } as any)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
import { createFileRoute } from '@tanstack/react-router'
import { useDashboardMetrics, useDashboardExportPdf } from "@/service/dashboard";
import { useEffect, useState } from "react";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { date_to_string, string_to_date, to_decimal_compact } from "@/lib/my-utils";
import { Badge } from "@/components/ui/badge";
import { CardStats, IndicatorCard, FunnelChart, ContainerFilter, ExportPdfModal } from "@/components/pages/hse-performance";
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { useForm } from "react-hook-form";
import { showNotifError } from "@/lib/show-notif";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Download, Funnel, Loader2, Calendar, FileText, Layers, Ship, ChevronDown } from "lucide-react";
import { APP_CONFIG } from "@/constants/config";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useSubTypesList } from "@/service/sub-type-api";
import { useVesselGet } from "@/service/vessels-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/_private/_dashboard/hse-performance')({
  component: DashboardPage,
})

const metrics_top = [
  {
    key: "freeLtaDays",
    title: "Free LTA (Days)",
    bg: "bg-[#003049]",
    showYtd: false
  },
  {
    key: "freeRiDays",
    title: "Free RI (Days)",
    bg: "bg-[#9B1C1C]",
    showYtd: false
  },
  {
    key: "total_safe_manhours_all",
    title: "Total Safe Manhours",
    bg: "bg-[#B59F00]",
    showYtd: false
  },
  {
    key: "manhours",
    title: "Manhours (Day | YTD)",
    bg: "bg-[#1E7A1E]",
    showYtd: true
  },
  {
    key: "total_trir_all",
    title: "TRIR",
    bg: "bg-[#002B7F]",
    showYtd: false
  },
  {
    key: "mandays",
    title: "Mandays (Day | YTD)",
    bg: "bg-[#8E24AA]",
    showYtd: true
  },
]

const metrics_right = [
  {
    key: "karpit",
    title: "KARPIT (Day | YTD)",
    fg: "!border-[#003049]",
    bg: "bg-[#38A1E8]"
  },
  {
    key: "meeting",
    title: "Meeting (Day | YTD)",
    fg: "!border-[#9B1C1C]",
    bg: "bg-[#F1B23E]"
  },
  {
    key: "drill",
    title: "Drill (Day | YTD)",
    fg: "!border-[#B59F00]",
    bg: "bg-[#003049]"
  },
  {
    key: "inspection",
    title: "Inspection (Day | YTD)",
    fg: "!border-[#1E7A1E]",
    bg: "bg-[#1E7A1E]"
  },
  {
    key: "training",
    title: "Training (Day | YTD)",
    fg: "!border-[#002B7F]",
    bg: "bg-[#002B7F]"
  },
]

function DashboardPage() {
  const { t } = useAppTranslation();
  const [dataFunnels, setDataFunnels] = useState<any>(null);
  const [openFilter, setOpenFilter] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [subTypes, setSubTypes] = useState<any>(null);
  const [vesselList, setVesselList] = useState<any>(null);

  const store = useAppStore();
  const initialFilter = store?.hsePerformance ?? defaultStore.hsePerformance;
  const form = useForm({
    defaultValues: {
      ...initialFilter,
      date_start: string_to_date(initialFilter?.date_start),
      date_end: string_to_date(initialFilter?.date_end),
      vesselId: initialFilter?.vesselId ?? []
    }
  });

  const [activeFilter, setActiveFilter] = useState<any>(() => ({
    ...initialFilter,
    date_start: initialFilter?.date_start ? string_to_date(initialFilter.date_start) : new Date(),
    date_end: initialFilter?.date_end ? string_to_date(initialFilter.date_end) : new Date(),
  }));

  const createBodyForm = (body: Record<any, any> = {}) => {
    let newBody;
    if (body?.basis === "range") {
      let date_start_ = date_to_string(body?.date_start, APP_CONFIG.dayFormat);
      let date_end_ = date_to_string(body?.date_end, APP_CONFIG.dayFormat);
      newBody = {
        ...body,
        date_start: date_start_,
        date_end: date_end_,
      }
    }
    else {
      let { date_start, date_end, reset, ...newBody_ } = body;
      newBody = newBody_
    }

    return newBody;
  }

  const metricsMutation = useDashboardMetrics();
  const exportPdfMutation = useDashboardExportPdf();
  const pageListSubType = useSubTypesList();
  const pageListVesselQuery = useVesselGet();

  useEffect(() => {
    const initialBody = createBodyForm(form.getValues());
    getMetrics(initialBody);
    setActiveFilter(form.getValues());
  }, []);

  useEffect(() => {
    if (pageListSubType.data) {
      setSubTypes(pageListSubType.data.map((item: any) => ({
        value: item.id,
        label: item.name
      })));
    }
  }, [pageListSubType.isSuccess]);

  useEffect(() => {
    if (pageListVesselQuery.data) {
      const newVesselOptions = pageListVesselQuery.data.map((item: any) => ({
        value: item.id,
        label: item.vesselName,
        personnelCount: item.personnelCount
      }));
      setVesselList(newVesselOptions);
    }
  }, [pageListVesselQuery.isSuccess]);

  const isLoading = () => {
    return (metricsMutation.isPending || pageListSubType.isPending || pageListVesselQuery.isPending);
  }

  const getMetrics = (body: Record<any, any> = {}) => {
    metricsMutation.mutate({
      body: body
    }, {
      onSuccess: (data: any) => {
        // store.setDailyReportList(body);
        setDataFunnels(data?.lagging);
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    })
  }

  const onFilterSubmit = (body: Record<any, any> = {}) => {
    const bodyForm = createBodyForm(body);
    getMetrics(bodyForm);
    setOpenFilter(false);
    store.setHsePerformance(bodyForm);
    setActiveFilter(body);
  }

  // Active filter summaries
  const selectedFormTypes = (activeFilter?.formTypes || []) as string[];
  const isProjectSelected = selectedFormTypes.includes("project");
  const isMarineSelected = selectedFormTypes.includes("marine");

  let dateRangeText = "Semua Periode";
  if (activeFilter?.basis === "range") {
    const sDate = activeFilter?.date_start ? date_to_string(activeFilter.date_start) : "";
    const eDate = activeFilter?.date_end ? date_to_string(activeFilter.date_end) : "";
    dateRangeText = `${sDate} s/d ${eDate}`;
  } else if (activeFilter?.basis === "all") {
    dateRangeText = "Semua Periode";
  } else {
    dateRangeText = `Tahun ${new Date().getFullYear()} (YTD)`;
  }

  const formTypesText = selectedFormTypes.length > 0
    ? selectedFormTypes.map((str: string) => str.charAt(0).toUpperCase() + str.slice(1)).join(", ")
    : "Semua Form Type";

  // Subtype resolution
  const selectedSubtypeIds = (activeFilter?.subtype || []) as string[];
  const selectedSubtypeNames = (subTypes || [])
    .filter((st: any) => selectedSubtypeIds.includes(st.value))
    .map((st: any) => st.label);

  const isAllSubtypes = selectedSubtypeIds.length === 0 || (subTypes && selectedSubtypeIds.length >= subTypes.length);
  const subtypeCount = selectedSubtypeNames.length;
  const subtypeFirstName = selectedSubtypeNames[0] || "";
  const subtypeShortText = isAllSubtypes
    ? "Semua Subtype"
    : subtypeCount > 1
      ? `${subtypeFirstName} +${subtypeCount - 1}`
      : subtypeFirstName || "Semua Subtype";

  // Vessel resolution
  const selectedVesselIds = (activeFilter?.vesselId || []) as string[];
  const selectedVesselNames = (vesselList || [])
    .filter((v: any) => selectedVesselIds.includes(v.value))
    .map((v: any) => v.label);

  const isAllVessels = selectedVesselIds.length === 0 || (vesselList && selectedVesselIds.length >= vesselList.length);
  const vesselCount = selectedVesselNames.length;
  const vesselFirstName = selectedVesselNames[0] || "";
  const vesselShortText = isAllVessels
    ? "Semua Vessel"
    : vesselCount > 1
      ? `${vesselFirstName} +${vesselCount - 1}`
      : vesselFirstName || "Semua Vessel";

  const handleConfirmExport = () => {
    setIsExporting(true);
    setExportProgress(20);

    const body = createBodyForm(activeFilter);

    const progressTimer = setInterval(() => {
      setExportProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 400);

    exportPdfMutation.mutate(body, {
      onSuccess: (blob: any) => {
        clearInterval(progressTimer);
        setExportProgress(100);

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const periodStr = body.basis === 'range' && body.date_start && body.date_end
          ? `${body.date_start}_to_${body.date_end}`
          : `${new Date().getFullYear()}_YTD`;
        link.setAttribute('download', `hse-performance-${periodStr}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
          setOpenExportModal(false);
        }, 600);
      },
      onError: (error: any) => {
        clearInterval(progressTimer);
        setIsExporting(false);
        setExportProgress(0);
        showNotifError({ message: error?.message || 'Gagal mengekspor PDF HSE Performance' });
      },
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-lg p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{t($ => $.hsePerformance.pageTitle)}</h1>
            <p className="text-muted-foreground">{t($ => $.hsePerformance.pageDescription)}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={() => setOpenExportModal(true)}
              className="shadow-sm flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Ekspor ke PDF
            </Button>
            <Popover open={openFilter} onOpenChange={setOpenFilter}>
              <PopoverTrigger asChild>
                <Button disabled={false} className="shadow-sm">
                  {(isLoading()) ?
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Funnel className="mr-2 h-4 w-4" />}
                  {t($ => $.shared.filter)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <ContainerFilter
                  form={form}
                  onSubmit={onFilterSubmit}
                  setOpenFilter={setOpenFilter}
                  subTypes={subTypes}
                  vesselList={vesselList}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filter Summary Row */}
        <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            <Funnel className="h-3.5 w-3.5 text-primary" />
            <span>Filter Aktif:</span>
          </div>

          {/* Rentang Tanggal */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border/70 text-xs shadow-xs text-foreground">
            <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">Periode:</span>
            <span className="font-semibold">{dateRangeText}</span>
          </div>

          {/* Form Type */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border/70 text-xs shadow-xs text-foreground">
            <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Tipe:</span>
            <span className="font-semibold">{formTypesText}</span>
          </div>

          {/* Sub Type Filter */}
          {isProjectSelected && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs shadow-xs transition-all cursor-pointer select-none",
                    !isAllSubtypes && subtypeCount > 1
                      ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                      : "bg-card/80 hover:bg-muted/70 text-foreground border-border/70"
                  )}
                  title="Klik untuk melihat ringkasan Sub Type"
                >
                  <Layers className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span className="text-muted-foreground">Sub Type:</span>
                  <span className="font-semibold">{subtypeShortText}</span>
                  {!isAllSubtypes && subtypeCount > 1 ? (
                    <Badge variant="secondary" className="ml-0.5 px-1 py-0 text-[10px] bg-purple-200/80 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200 font-mono">
                      +{subtypeCount - 1}
                    </Badge>
                  ) : null}
                  <ChevronDown className="h-3 w-3 text-muted-foreground/70 ml-0.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3.5 shadow-xl border border-border/80 rounded-xl" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Layers className="h-3.5 w-3.5 text-purple-500" />
                      <span>Sub Type Terpilih</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 font-mono">
                      {isAllSubtypes ? "Semua Proyek" : `${subtypeCount} item`}
                    </Badge>
                  </div>

                  {isAllSubtypes ? (
                    <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-1.5">
                      <div className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
                        <span>Mencakup Seluruh Proyek</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Metrik dashboard saat ini mencakup gabungan seluruh Sub Type proyek ({subTypes?.length ?? 52} proyek) tanpa pembatasan filter.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1">
                        {selectedSubtypeNames.map((name: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded-md text-xs bg-muted/40 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                            <span className="font-medium truncate text-foreground text-[11px]">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Vessel Filter */}
          {isMarineSelected && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs shadow-xs transition-all cursor-pointer select-none",
                    !isAllVessels && vesselCount > 1
                      ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : "bg-card/80 hover:bg-muted/70 text-foreground border-border/70"
                  )}
                  title="Klik untuk melihat ringkasan Vessel"
                >
                  <Ship className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-muted-foreground">Vessel:</span>
                  <span className="font-semibold">{vesselShortText}</span>
                  {!isAllVessels && vesselCount > 1 ? (
                    <Badge variant="secondary" className="ml-0.5 px-1 py-0 text-[10px] bg-blue-200/80 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 font-mono">
                      +{vesselCount - 1}
                    </Badge>
                  ) : null}
                  <ChevronDown className="h-3 w-3 text-muted-foreground/70 ml-0.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3.5 shadow-xl border border-border/80 rounded-xl" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Ship className="h-3.5 w-3.5 text-blue-500" />
                      <span>Vessel Terpilih</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 font-mono">
                      {isAllVessels ? "Semua Kapal" : `${vesselCount} kapal`}
                    </Badge>
                  </div>

                  {isAllVessels ? (
                    <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-1.5">
                      <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                        <span>Mencakup Seluruh Kapal</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Metrik dashboard saat ini mencakup gabungan seluruh Vessel ({vesselList?.length ?? 0} kapal aktif) tanpa pembatasan filter.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1">
                        {selectedVesselNames.map((name: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded-md text-xs bg-muted/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span className="font-medium truncate text-foreground text-[11px]">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {metricsMutation?.isSuccess &&
        <div className="space-y-8">
          {/* Leading Indicator Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-green-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-foreground">{t($ => $.hsePerformance.leadingIndicator)}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(metrics_top).map(([index, metric]) => {
                const day = (metricsMutation?.data?.metricCards?.[metric?.key]?.day ?? 0);
                const ytd = (metricsMutation?.data?.metricCards?.[metric?.key]?.ytd ?? 0);
                let value_;
                if (metric?.showYtd) {
                  value_ = `${day.toLocaleString('id-ID')} | ${ytd.toLocaleString('id-ID')}`;
                } else {
                  value_ = `${day.toLocaleString('id-ID')}`;
                }

                return (
                  <CardStats key={index} title={metric?.title}
                    value={value_}
                    className=""
                    classNameTitleContainer={`${metric?.bg} text-white`} />
                )
              })}
            </div>
          </div>

          {/* Lagging Indicator Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-orange-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-foreground">{t($ => $.hsePerformance.laggingIndicator)}</h2>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex lg:flex-row flex-col gap-6">
                <div className="flex flex-col flex-1 items-center space-y-6">
                  <div className="flex flex-row gap-[300px]">
                    <Badge variant="secondary" className="px-4 py-2 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                      {t($ => $.hsePerformance.production)}
                    </Badge>
                    <Badge variant="secondary" className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                      {t($ => $.hsePerformance.marine)}
                    </Badge>
                  </div>
                  {dataFunnels &&
                    <div className="flex h-[500px] w-full">
                      <FunnelChart values={dataFunnels} />
                    </div>
                  }
                </div>
                <div className="flex lg:flex-col flex-row justify-center gap-4 flex-wrap">
                  {Object.entries(metrics_right).map(([index, metric]) => {
                    const day = (metricsMutation?.data?.rightCard?.[metric?.key]?.day ?? 0);
                    const ytd = (metricsMutation?.data?.rightCard?.[metric?.key]?.ytd ?? 0);

                    return (
                      <CardStats key={index} title={metric?.title}
                        value={`${day.toLocaleString('id-ID')} | ${ytd.toLocaleString('id-ID')}`}
                        className="min-w-[140px]"
                        classNameTitleContainer={`${metric?.bg} text-white`}
                        classNameValue="text-lg"
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Kartu Pintar Section */}
          {(() => {
            const insight = metricsMutation?.data?.smartCardInsight;
            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-1 bg-purple-500 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-foreground">{t($ => $.hsePerformance.kartuPintar)}</h2>
                  </div>
                  {insight?.dateRange && (
                    <Badge variant="outline" className="text-xs text-muted-foreground border-purple-200 dark:border-purple-800">
                      Periode Observasi: {insight.dateRange.start} s/d {insight.dateRange.end}
                    </Badge>
                  )}
                </div>
                <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                  {insight ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Status Tindak Lanjut */}
                      <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/20 border border-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Tindak Lanjut</span>
                          <Badge className="bg-purple-600 text-white text-[11px]">
                            Total: {insight.totalObservations?.toLocaleString('id-ID') ?? 0}
                          </Badge>
                        </div>
                        <div className="space-y-2 mt-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Closed (Selesai)
                            </span>
                            <span className="font-semibold font-mono">{insight.statusSummary?.closed?.toLocaleString('id-ID') ?? 0} ({insight.statusSummary?.closeRate ?? 0}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${insight.statusSummary?.closeRate ?? 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Open (Dalam Proses)
                            </span>
                            <span className="font-semibold font-mono">{insight.statusSummary?.open?.toLocaleString('id-ID') ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Top Unsafe Actions */}
                      <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/20 border border-muted/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                          Top Unsafe Action (TTA)
                        </span>
                        <div className="flex flex-col gap-2 mt-1">
                          {insight.topUnsafeActions && insight.topUnsafeActions.length > 0 ? (
                            insight.topUnsafeActions.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-sm gap-2">
                                <span className="text-foreground truncate text-xs" title={item.name}>
                                  {idx + 1}. {item.name}
                                </span>
                                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 shrink-0">
                                  {item.count}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">Tidak ada temuan Unsafe Action pada periode ini</p>
                          )}
                        </div>
                      </div>

                      {/* Top Unsafe Conditions */}
                      <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/20 border border-muted/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Top Unsafe Condition (KTA)
                        </span>
                        <div className="flex flex-col gap-2 mt-1">
                          {insight.topUnsafeConditions && insight.topUnsafeConditions.length > 0 ? (
                            insight.topUnsafeConditions.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-sm gap-2">
                                <span className="text-foreground truncate text-xs" title={item.name}>
                                  {idx + 1}. {item.name}
                                </span>
                                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 shrink-0">
                                  {item.count}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">Tidak ada temuan Unsafe Condition pada periode ini</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <IndicatorCard className="" classNameCard="bg-gradient-to-r from-muted/20 to-muted/10 min-h-[120px] border-0">
                      <MarkdownPreview source="" className="p-6 rounded-lg" />
                    </IndicatorCard>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      }

      <ExportPdfModal
        open={openExportModal}
        onOpenChange={setOpenExportModal}
        filters={createBodyForm(activeFilter)}
        filterSummary={{
          periodText: dateRangeText,
          formTypesText,
          subtypeText: subtypeShortText,
          vesselText: vesselShortText,
        }}
        onConfirmExport={handleConfirmExport}
        isExporting={isExporting}
        progress={exportProgress}
      />
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          header, nav, aside, .print\\:hidden, button, .popover-content {
            display: none !important;
          }
          .bg-card, .shadow-lg, .shadow-sm {
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
          .w-full {
            width: 100% !important;
          }
          .h-\\[500px\\] {
            height: 460px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardPage;

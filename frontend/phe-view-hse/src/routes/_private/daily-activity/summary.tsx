import { createFileRoute, useNavigate } from '@tanstack/react-router'
import PageTitle from "@/components/app/PageTitle";
import * as React from "react";
import { addDays } from 'date-fns';
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { useForm } from "react-hook-form";
import {
  SliderContainer,
} from "@/components/pages/daily-activity/components";
import { cn } from "@/lib/utils";
import { date_to_string, string_date_formatted, string_to_date } from "@/lib/my-utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Download, Funnel, Loader2, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppTranslation } from '@/lib/i18n-typed'
import { APP_CONFIG } from "@/constants/config";
import { showNotifError } from "@/lib/show-notif";
import { useReportList } from "@/service/report";
import { Card, CardContent } from "@/components/ui/card";
import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { marineFormList } from "@/components/pages/daily-report/create/lib/marine-template";
import {
  ContainerFilter,
} from '@/components/pages/daily-activity';
import { MarineViewer, ProjectViewer, ExportPdfModal } from '@/components/pages/daily-activity/summary';
import { REPORT_TYPE } from "@/constants/app-enum";
import { useSubTypesList } from "@/service/sub-type-api";
import { useVesselGet } from "@/service/vessels-api";
import { useDailyReportExportPdf } from "@/service/daily-report-api";

export const Route = createFileRoute(
  '/_private/daily-activity/summary',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { date_start, date_end, form_types, reset, subtypes } = Route.useSearch()

  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = React.useState(0);
  const [openFilter, setOpenFilter] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [dataCarousel, setDataCarousel] = useState(null);
  const [subTypes, setSubTypes] = useState<any>(null);
  const [vesselList, setVesselList] = useState<any>(null);

  const reportListMutation = useReportList();
  const pageListSubType = useSubTypesList();
  const pageListVesselQuery = useVesselGet();
  const dailyReportExportPdfMutation = useDailyReportExportPdf();

  const store = useAppStore();
  const initialFilter = store?.dailyActivity ?? defaultStore.dailyActivity;
  const todayNow = new Date();
  const firstDayOfMonth = new Date(todayNow.getFullYear(), todayNow.getMonth(), 1);
  const form = useForm({
    defaultValues: {
      ...initialFilter,
      date_start: date_start ? string_to_date(date_start) : firstDayOfMonth,
      date_end: date_end ? string_to_date(date_end) : todayNow,
      formTypes: form_types ?? ((initialFilter?.formTypes?.length > 0) ? initialFilter?.formTypes[0] : REPORT_TYPE.project.value),
      subtypes: subtypes ?? (initialFilter?.subtypes ?? []),
      reset: reset ?? (initialFilter?.reset ? initialFilter?.reset : false),
      vesselId: initialFilter?.vesselId ?? []
    }
  });

  const createBodyForm = (body: Record<any, any> = {}) => {
    return {
      ...body,
      date_start: (body?.reset === true) ? "" : date_to_string(body?.date_start, APP_CONFIG.dayFormat),
      date_end: (body?.reset === true) ? "" : date_to_string(body?.date_end, APP_CONFIG.dayFormat),
      formTypes: body?.formTypes ? [body?.formTypes] : [],
      subtypes: body?.subtypes ?? [],
      workLocations: body?.workLocations ?? [],
      vesselId: ((body?.formTypes === REPORT_TYPE.marine.value) && body?.vesselId) ? body?.vesselId : [],
      view: 200,
    }
  }

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
      setVesselList(pageListVesselQuery.data.map((item: any) => ({
        value: item.id,
        label: item.vesselName,
        personnelCount: item.personnelCount
      })));
    }
  }, [pageListVesselQuery.isSuccess]);

  useEffect(() => {
    const body = form.getValues();
    getListReport(createBodyForm(body));
  }, [])

  const isLoading = () => {
    return (reportListMutation.isPending || pageListSubType.isPending || pageListVesselQuery.isPending);
  }

  const getListReport = (body: Record<any, any> = {}) => {
    reportListMutation.mutate({
      body: body
    }, {
      onSuccess: (response: any) => {
        let tmp_data = response?.data;
        // Sort tmp_data by reportDate in ascending order
        if (tmp_data && Array.isArray(tmp_data)) {
          tmp_data.sort((a, b) => {
            const dateA = new Date(a.reportDate);
            const dateB = new Date(b.reportDate);
            return dateA.getTime() - dateB.getTime();
          });
        }
        setData(tmp_data);

        let dataCarousel_: any = [];
        for (let i = 0; i < tmp_data?.length; i++) {
          let assets_ = [];
          const supportingFiles = tmp_data[i]?.detail?.supportingFiles;
          const imageAssets = supportingFiles
            .filter((item: any) => item.fileType?.includes("image/"));

          for (let j = 0; j < imageAssets?.length; j++) {
            assets_.push({
              src: imageAssets[j]?.url ?? "",
              thumbnail: imageAssets[j]?.thumbnailUrl ?? "",
              note: imageAssets[j]?.note ?? "",
            })
          }

          dataCarousel_.push({
            id: tmp_data[i]?.id,
            reportDate: string_date_formatted({ localeId: "id-ID", dateString: tmp_data[i]?.reportDate, format: "MMMM dd, yyyy" }),
            assets: assets_,
            formType: tmp_data[i]?.formType,
            subtypeName: tmp_data[i]?.subtypeName,
            workLocationId: tmp_data[i]?.workLocationId,
            workLocationName: tmp_data[i]?.workLocationName,
            reportedBy: tmp_data[i]?.reportedBy,
            instansi: tmp_data[i]?.instansi,
            vesselName: tmp_data[i]?.vesselName
          })
        }

        setDataCarousel(dataCarousel_);
        store.setDailyActivity({ ...body, date_start: response?.meta?.date_start, date_end: response?.meta?.date_end, reset: false });
        if (response?.meta?.date_start && !body?.date_start) {
          form.setValue("date_start", string_to_date(response.meta.date_start));
        }
        if (response?.meta?.date_end && !body?.date_end) {
          form.setValue("date_end", string_to_date(response.meta.date_end));
        }
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    })
  }

  const onFilterSubmit = (body: Record<any, any> = {}) => {
    setSelectedActivity(0);
    getListReport(createBodyForm(body));
    setOpenFilter(false);
  }

  const [enableExportReport, setEnableExportReport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  const handleDownloadWithParams = async (exportParams: any) => {
    setEnableExportReport(true);
    setProgress(20);
    setShowProgress(true);

    dailyReportExportPdfMutation.mutate(
      exportParams,
      {
        onSuccess: (blob) => {
          setProgress(100);

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const filename = `daily-reports-${exportParams.date_start || 'export'}${exportParams.date_end && exportParams.date_end !== exportParams.date_start ? `_to_${exportParams.date_end}` : ''}.pdf`;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          setTimeout(() => {
            setEnableExportReport(false);
            setShowProgress(false);
            setProgress(0);
            setOpenExportModal(false);
          }, 800);
        },
        onError: (error: any) => {
          showNotifError({ message: error.message || t($ => $.dailyActivity.export.exportError) });
          setEnableExportReport(false);
          setShowProgress(false);
          setProgress(0);
        }
      }
    );
  };

  // Progress bar component
  const ProgressBar = () => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg shadow-lg w-96 p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          {t($ => $.dailyActivity.export.generatingPdf)}
        </h3>
        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {progress}%
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t($ => $.dailyActivity.export.pleaseWait)}
        </p>
      </div>
    </div>
  );

  const watchedDateStart = form.watch("date_start");
  const watchedDateEnd = form.watch("date_end");
  const watchedFormTypes = form.watch("formTypes");
  const watchedSubtypes = form.watch("subtypes");
  const watchedVesselId = form.watch("vesselId");

  const selectedSubtypes: string[] = Array.isArray(watchedSubtypes)
    ? watchedSubtypes
    : (watchedSubtypes ? [watchedSubtypes] : []);

  const selectedVessels: string[] = Array.isArray(watchedVesselId)
    ? watchedVesselId
    : (watchedVesselId ? [watchedVesselId] : []);

  const modalDefaultValues = React.useMemo(() => ({
    date_start: form.getValues("date_start"),
    date_end: form.getValues("date_end"),
    formTypes: form.getValues("formTypes"),
    subtypes: form.getValues("subtypes"),
    vesselId: form.getValues("vesselId"),
  }), [openExportModal]);

  // const className = "h-fit bg-gradient-to-br from-slate-50 to-slate-100 transition-all dark:from-slate-900 dark:to-slate-800 shadow-none";
  const className = "h-fit";
  return (
    <div className="w-full space-y-6">
      {showProgress && <ProgressBar />}
      <ExportPdfModal
        open={openExportModal}
        onOpenChange={setOpenExportModal}
        defaultValues={modalDefaultValues}
        subtypesList={subTypes || []}
        vesselList={vesselList || []}
        availableReports={data || []}
        isExporting={enableExportReport}
        progress={progress}
        onConfirmExport={handleDownloadWithParams}
      />
      <PageTitle title={<div>{t($ => $.dailyActivity.pageTitle)}</div>}
        // description={<div>A daily record of activities related to Health, Safety, Security, and Environment (HSSE) practices.</div>}
        showSeparator={false}
      />

      {reportListMutation.isError && <div className={"text-lg text-destructive"}>Error: {reportListMutation?.error?.message}</div>}

      <div className={"flex flex-row items-center justify-between gap-4 w-full"}>
        <div className={"flex flex-row flex-wrap items-center gap-2 min-w-0 flex-1"}>
          {(watchedDateStart || watchedDateEnd) && (
            <Badge variant={"outline"} className="shrink-0">
              {watchedDateStart ? date_to_string(watchedDateStart) : ''}
              {watchedDateEnd ? ` - ${date_to_string(watchedDateEnd)}` : ''}
            </Badge>
          )}
          {watchedFormTypes && (
            <Badge variant={"outline"} className="shrink-0 capitalize">
              {watchedFormTypes}
            </Badge>
          )}
          {((watchedFormTypes === REPORT_TYPE.project.value) && subTypes) && (
            <>
              {(selectedSubtypes.length === 0 || selectedSubtypes.length >= subTypes.length) ? (
                <Badge variant={"outline"} className="shrink-0">Semua Sub Type</Badge>
              ) : selectedSubtypes.length > 2 ? (
                <Badge variant={"outline"} className="shrink-0">{selectedSubtypes.length} Sub Type Dipilih</Badge>
              ) : (
                selectedSubtypes.map((id: string) => {
                  const label = subTypes.find((item: any) => item.value === id)?.label;
                  if (!label) return null;
                  return (
                    <Badge key={id} variant={"outline"} className="max-w-[200px] truncate shrink-0" title={label}>
                      {label}
                    </Badge>
                  );
                })
              )}
            </>
          )}
          {((watchedFormTypes === REPORT_TYPE.marine.value) && vesselList) && (
            <>
              {(selectedVessels.length === 0 || selectedVessels.length >= vesselList.length) ? (
                <Badge variant={"outline"} className="shrink-0">Semua Vessel</Badge>
              ) : selectedVessels.length > 2 ? (
                <Badge variant={"outline"} className="shrink-0">{selectedVessels.length} Vessel Dipilih</Badge>
              ) : (
                selectedVessels.map((id: string) => {
                  const label = vesselList.find((item: any) => item.value === id)?.label;
                  if (!label) return null;
                  return (
                    <Badge key={id} variant={"outline"} className="max-w-[200px] truncate shrink-0" title={label}>
                      {label}
                    </Badge>
                  );
                })
              )}
            </>
          )}
        </div>

        <div className={"flex flex-row items-center gap-2 shrink-0"}>
          {data && data.length > 0 && (
            <Button variant={"outline"} onClick={() => setOpenExportModal(true)} disabled={enableExportReport}>
              {enableExportReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {progress}%
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t($ => $.dailyActivity.export.exportToPdf)}
                </>
              )}
            </Button>
          )}
          <Popover open={openFilter} onOpenChange={setOpenFilter}>
            <PopoverTrigger asChild>
              <Button disabled={false}>
                {(isLoading()) ?
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Funnel className="mr-2 h-4 w-4" />}
                {t($ => $.shared.filter)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <ContainerFilter
                form={form}
                subtypes={subTypes}
                vesselList={vesselList}
                onSubmit={onFilterSubmit}
                setOpenFilter={setOpenFilter} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Loading State */}
      {reportListMutation.isPending && (
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t($ => $.dailyActivity.status.loading)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data && <div className={"flex flex-col gap-2"}>
        {data?.length === 0 ? <div className={"text-lg"}>{t($ => $.dailyActivity.status.noDataFound)}</div> :
          <div className='flex flex-col gap-4'>
            {dataCarousel &&
              <SliderContainer
                assets={dataCarousel}
                selectedAsset={selectedActivity}
                setSelectedAsset={setSelectedActivity}
                orientation={"horizontal"}
                onEditReport={(reportId: string) => {
                  navigate({
                    to: '/daily-report/edit',
                    search: {
                      project_id: reportId
                    }
                  });
                }}
              />}
            <div className={"flex flex-col md:grid md:grid-cols-1 gap-4"}>
              <div className={cn(`markdown-viewer ${className || ''}`, 'rounded-xl border shadow-sm')} /*style={{ maxHeight: `calc(100vh - 220px)`, overflowY: `auto` }}*/>
                <div className="sticky top-0 z-10 px-4 border-b bg-muted px-4 pt-3 pb-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>
                        {data?.[selectedActivity]?.formType === REPORT_TYPE.project.value
                          ? t($ => $.dailyActivity.viewer.projectReport, {
                            subtypeName: data?.[selectedActivity]?.subtypeName || 'Project',
                            reportDate: data?.[selectedActivity]?.reportDate
                          })
                          : t($ => $.dailyActivity.viewer.marineActivity, {
                            reportDate: new Date(data?.[selectedActivity]?.reportDate).toLocaleDateString('id-ID')
                          })}
                      </span>
                      {data?.[selectedActivity]?.workLocationName && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {data[selectedActivity].workLocationName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Reported by: {data?.[selectedActivity]?.reportedBy || 'Unknown'}</p>
                  </div>
                  {data?.[selectedActivity]?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs font-semibold bg-background shadow-xs hover:bg-muted text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 cursor-pointer"
                      onClick={() => {
                        navigate({
                          to: '/daily-report/edit',
                          search: {
                            project_id: data[selectedActivity].id
                          }
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                      Sunting Laporan
                    </Button>
                  )}
                </div>
                {(data?.[selectedActivity]?.formType === REPORT_TYPE.project.value) ?
                  <ProjectViewer
                    template={formList}
                    value={data?.[selectedActivity]}
                    onReportUpdated={(updatedDetail) => {
                      setData((prev: any) => {
                        if (!Array.isArray(prev)) return prev;
                        return prev.map((item, idx) => {
                          if (idx === selectedActivity || item.id === data?.[selectedActivity]?.id) {
                            return { ...item, detail: updatedDetail };
                          }
                          return item;
                        });
                      });
                    }}
                  /> :
                  <MarineViewer template={marineFormList} value={data?.[selectedActivity]} />
                }
              </div>
              {/* <div>
                <CardCustom className={cn(className, "h-full w-full p-6")}>
                  {dataCarousel && <ImageCarousel value={dataCarousel[selectedActivity]} />}
                </CardCustom>
              </div> */}
              {/* {(data?.[selectedActivity]?.formType === REPORT_TYPE.project.value) ?
                <MarkdownViewer 
                  template={formList} 
                  value={{
                    markdownContent: getProjectInfoMarkdown(
                      data?.[selectedActivity]?.detail, 
                      formList
                    )
                  }} 
                /> :
                <MarineInfoRight template={marineFormList} values={data?.[selectedActivity]?.detail} />
              } */}
            </div>
          </div>}
      </div>}
    </div>
  )
}

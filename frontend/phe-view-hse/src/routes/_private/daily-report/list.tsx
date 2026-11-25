import { createFileRoute } from '@tanstack/react-router'
import * as React from "react";
import { AppRoute } from "@/constants/app-route";
import { TableReport, ExplorerCardView, DuplicateReportModal } from "@/components/pages/daily-report/list";
import { SkeTable } from "@/components/custom/skeleton";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { useEffect, useState } from "react";
import { useReportDelete, useReportList } from "@/service/report";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Funnel, Loader2, FileText, Calendar, Filter, ArrowUpDown, RotateCcw, Layers, FolderKanban, Activity, Ship } from "lucide-react";
import { useAppTranslation } from '@/lib/i18n-typed';
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { useForm } from "react-hook-form";
import { APP_CONFIG } from "@/constants/config";
import { ContainerFilter } from "@/components/pages/daily-report/create";
import { date_to_string, string_to_date } from "@/lib/my-utils";
import { Badge } from "@/components/ui/badge";
import { useSubTypesList } from "@/service/sub-type-api";
import { useVesselGet } from "@/service/vessels-api";
import { LayoutGrid, Table } from 'lucide-react';
import { FaPlus } from "react-icons/fa6";
import { useAuth } from '@/hooks/use-auth';
import { isContractor, isCrew } from '@/types/auth';

export const Route = createFileRoute('/_private/daily-report/list')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const [confirmationModal, setConfirmationModal] = useState<ModalProps | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<any | null>(null);
  const [subTypes, setSubTypes] = useState<any>(null);
  const [vesselList, setVesselList] = useState<any>(null);

  const auth = useAuth();
  const userRole = auth?.user;

  const navigate = Route.useNavigate()

  const reportListMutation = useReportList();
  const reportDeleteMutation = useReportDelete();
  const pageListSubType = useSubTypesList();
  const pageListVesselQuery = useVesselGet();

  const [openFilter, setOpenFilter] = useState(false);
  const store = useAppStore();
  const initialFilter = store?.dailyReportList ?? defaultStore.dailyReportList;

  // Default to reportDate DESC (latest first)
  const defaultSort = initialFilter?.sort || "reportDate";
  const defaultOrder = (initialFilter?.order === "asc" && (!initialFilter?.sort || initialFilter?.sort === "reportDate") && initialFilter?.reset)
    ? "desc"
    : (initialFilter?.order || "desc");

  const form = useForm<any>({
    defaultValues: {
      ...initialFilter,
      sort: defaultSort,
      order: defaultOrder,
      subtypes: initialFilter?.subtypes ?? [],
      vesselId: initialFilter?.vesselId ?? [],
      selectByRange: initialFilter?.selectByRange?.toLowerCase() === "true" ? "true" : "false",
      date_start: (initialFilter?.reset === true || !(initialFilter?.selectByRange?.toLowerCase() === "true"))
        ? ""
        : string_to_date(initialFilter?.date_start),
      date_end: (initialFilter?.reset === true || !(initialFilter?.selectByRange?.toLowerCase() === "true"))
        ? ""
        : string_to_date(initialFilter?.date_end),
    }
  });
  const [pageParams, setPageParams] = useState({
    page: initialFilter?.page ?? 0,
    view: initialFilter?.view ?? 10,
    limit: initialFilter?.view ?? 10,
    total: 0,
    totalPages: 0,
  });

  const [viewMode, setViewMode] = useState(initialFilter?.viewMode ?? "table");

  const createBodyForm = (body: Record<any, any> = {}) => {
    const selectByRange = String(body?.selectByRange ?? "").toLowerCase() === "true";
    return {
      ...body,
      selectByRange: selectByRange,
      date_start: (body?.reset === true || !selectByRange) ? "" : date_to_string(body?.date_start, APP_CONFIG.dayFormat),
      date_end: (body?.reset === true || !selectByRange) ? "" : date_to_string(body?.date_end, APP_CONFIG.dayFormat),
      subtypes: body?.subtypes ?? [],
      vesselId: body?.vesselId ?? [],
    }
  }
  useEffect(() => {
    getListReport(createBodyForm(form.getValues()));
  }, [])

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
      })));
    }
  }, [pageListVesselQuery.isSuccess]);

  const isLoading = () => {
    return (reportListMutation.isPending || reportDeleteMutation.isPending || pageListSubType.isPending || pageListVesselQuery.isPending);
  }

  const getListReport = (body: Record<any, any> = {}) => {
    reportListMutation.mutate({
      body: body
    }, {
      onSuccess: (response: any) => {
        store.setDailyReportList({
          ...body, selectByRange: body?.selectByRange?.toString(), reset: false,
          date_start: response?.meta?.date_start, date_end: response?.meta?.date_end
        });
        setPageParams({
          page: response?.meta?.page + 1,
          view: response?.meta?.view,
          limit: response?.meta?.view,
          total: response?.meta?.total,
          totalPages: response?.meta?.totalPages,
        })
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    })
  }

  const onDeleteData = (item: any) => {
    setConfirmationModal({
      title: t($ => $.dailyReport.deleteConfirmation.title),
      content: <div>{t($ => $.dailyReport.deleteConfirmation.content)}<span
        className={"font-bold text-primary"}>{item?.reportDate?.split("T")[0] ?? ""}</span> ?</div>,
      textConfirm: t($ => $.dailyReport.deleteConfirmation.confirm),
      textCancel: t($ => $.dailyReport.deleteConfirmation.cancel),
      onConfirmClick: () => {
        reportDeleteMutation.mutate(
          { item },
          {
            onSuccess: () => {
              getListReport(createBodyForm(form.getValues()));
              showNotifSuccess({ message: "Success deleted report" });
            },
            onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message }),
          }
        );
        setConfirmationModal(null);
      },
      onCancelClick: () => setConfirmationModal(null),
    })
  }

  const onFilterSubmit = (body: Record<any, any> = {}) => {
    const body_form = createBodyForm({ ...body, page: 0 });
    getListReport(body_form);
    setOpenFilter(false);
  }

  const handlePaginationChange = (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => {
    form.setValue("page", paginationData.page - 1);
    form.setValue("view", paginationData.limit);
    const body_form = createBodyForm(form.getValues());
    getListReport(body_form);
  };

  const handleSortChange = (newSort: string, newOrder: string) => {
    form.setValue("sort", newSort);
    form.setValue("order", newOrder);
    form.setValue("page", 0);
    const body_form = createBodyForm(form.getValues());
    getListReport(body_form);
  };

  const handleResetFilter = () => {
    const resetData = {
      ...defaultStore.dailyReportList,
      sort: "reportDate",
      order: "desc",
      selectByRange: "false",
      date_start: "",
      date_end: "",
      subtypes: [],
      vesselId: [],
      page: 0,
      view: form.getValues("view") || 10,
    };
    form.reset(resetData);
    getListReport(createBodyForm(resetData));
  };

  const currentValues = form.watch();

  const getSortLabel = (sortField: string, orderDirection: string) => {
    const fieldMap: Record<string, string> = {
      reportDate: "Tanggal Laporan",
      reportedBy: "Dilaporkan Oleh",
      instansi: "Instansi",
      formType: "Tipe Laporan",
      subtypeName: "Sub Tipe / Vessel",
      vessel: "Vessel",
      vesselName: "Vessel",
      createdAt: "Tanggal Dibuat",
      updatedAt: "Tanggal Diperbarui",
    };
    const fieldName = fieldMap[sortField] || sortField;
    const isDate = sortField === "reportDate" || sortField === "createdAt" || sortField === "updatedAt";
    const direction = isDate
      ? (orderDirection === "desc" ? "Terbaru" : "Terlama")
      : (orderDirection === "desc" ? "Z → A" : "A → Z");
    return `${fieldName} (${direction})`;
  };

  const getSubtypeNames = () => {
    const subtypeIds = currentValues?.subtypes || [];
    if (!subtypeIds.length) return null;
    return subtypeIds
      .map((id: string) => subTypes?.find((s: any) => s.value === id)?.label || id)
      .join(", ");
  };

  const getVesselNames = () => {
    const vesselIds = currentValues?.vesselId || [];
    if (!vesselIds.length) return null;
    return vesselIds
      .map((id: string) => vesselList?.find((v: any) => v.value === id)?.label || id)
      .join(", ");
  };

  const hasCustomFilter = currentValues?.selectByRange === "true" ||
    (currentValues?.subtypes && currentValues.subtypes.length > 0) ||
    (currentValues?.vesselId && currentValues.vesselId.length > 0) ||
    (currentValues?.formTypes && currentValues.formTypes.length > 0 && currentValues.formTypes.length < 2) ||
    currentValues?.sort !== "reportDate" ||
    currentValues?.order !== "desc";

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.dailyReport.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.dailyReport.pageDescription)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              {t($ => $.dailyReport.reportManagement)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {reportListMutation.isError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="text-destructive font-medium">Error: {reportListMutation?.error?.message}</div>
        </div>
      )}

      {/* Filter and Actions Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Filter Title & Description */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Filter & Pengurutan Aktif</h4>
              <p className="text-xs text-muted-foreground">
                Ringkasan filter dan urutan data laporan yang sedang ditampilkan
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {hasCustomFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilter}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 border border-dashed border-border"
                title="Reset ke default (Tanggal Laporan Terbaru)"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset Filter
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
              onClick={() => {
                store.setDailyReportList({
                  ...store.dailyReportList,
                  viewMode: store.dailyReportList.viewMode === 'table' ? 'grid' : 'table'
                });
                setViewMode(viewMode === "table" ? "grid" : "table");
              }}
              title={store.dailyReportList.viewMode === 'table' ? t($ => $.dailyReport.viewModes.switchToGridView) : t($ => $.dailyReport.viewModes.switchToTableView)}
            >
              {store.dailyReportList.viewMode === 'table' ? (
                <LayoutGrid className="h-4 w-4 mr-2" />
              ) : (
                <Table className="h-4 w-4 mr-2" />
              )}
              {store.dailyReportList.viewMode === 'table' ? t($ => $.dailyReport.viewModes.gridView) : t($ => $.dailyReport.viewModes.tableView)}
            </Button>

            <Popover open={openFilter} onOpenChange={setOpenFilter}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading()}
                  className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                >
                  {isLoading() ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Funnel className="h-4 w-4 mr-2" />
                  )}
                  {t($ => $.dailyReport.actions.filter)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <ContainerFilter
                  form={form}
                  subtypes={subTypes}
                  vesselList={vesselList}
                  onSubmit={onFilterSubmit}
                  setOpenFilter={setOpenFilter}
                  userRole={userRole}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filter Details Description Banner */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/60">
          {/* Rentang Waktu */}
          <Badge variant="outline" className="px-3 py-1 bg-blue-50/80 border-blue-200 text-blue-800 flex items-center gap-1.5 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs">
              <strong className="font-semibold text-blue-900 mr-1">Rentang:</strong>
              {currentValues?.selectByRange === "true" && currentValues?.date_start && currentValues?.date_end
                ? `${date_to_string(new Date(currentValues.date_start))} – ${date_to_string(new Date(currentValues.date_end))}`
                : "Semua Tanggal (Tanpa Batasan)"}
            </span>
          </Badge>

          {/* Tipe Laporan */}
          {!isCrew(userRole) && currentValues?.formTypes?.length > 0 && (
            <Badge variant="outline" className="px-3 py-1 bg-emerald-50/80 border-emerald-200 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs">
                <strong className="font-semibold text-emerald-900 mr-1">Tipe:</strong>
                {currentValues.formTypes
                  .map((str: string) => str.charAt(0).toUpperCase() + str.slice(1))
                  .join(", ")}
              </span>
            </Badge>
          )}

          {/* Sub Tipe (if chosen) */}
          {getSubtypeNames() && (
            <Badge variant="outline" className="px-3 py-1 bg-amber-50/80 border-amber-200 text-amber-800 flex items-center gap-1.5 shadow-2xs">
              <FolderKanban className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs">
                <strong className="font-semibold text-amber-900 mr-1">Proyek:</strong>
                {getSubtypeNames()}
              </span>
            </Badge>
          )}

          {/* Vessel (if chosen) */}
          {getVesselNames() && (
            <Badge variant="outline" className="px-3 py-1 bg-cyan-50/80 border-cyan-200 text-cyan-800 flex items-center gap-1.5 shadow-2xs">
              <Ship className="h-3.5 w-3.5 text-cyan-600" />
              <span className="text-xs">
                <strong className="font-semibold text-cyan-900 mr-1">Vessel:</strong>
                {getVesselNames()}
              </span>
            </Badge>
          )}

          {/* Sort & Order Badge */}
          <Badge variant="outline" className="px-3 py-1 bg-indigo-50/80 border-indigo-200 text-indigo-800 flex items-center gap-1.5 shadow-2xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-xs">
              <strong className="font-semibold text-indigo-900 mr-1">Urutan:</strong>
              {getSortLabel(currentValues?.sort || "reportDate", currentValues?.order || "desc")}
            </span>
          </Badge>

          {/* Total Row Count Info */}
          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline-block">
            Total: <strong className="text-foreground">{pageParams.total.toLocaleString("id-ID")}</strong> laporan ditemukan
          </span>
        </div>
      </div>

      {/* Loading State */}
      {(reportListMutation.isPending || reportDeleteMutation.isPending) && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <SkeTable />
        </div>
      )}

      {/* Content Section */}
      {reportListMutation.isSuccess && (
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t($ => $.dailyReport.table.tableCardTitle)}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t($ => $.dailyReport.table.tableCardDescription)}
                </p>
              </div>
              <div>
                {!isContractor(userRole) && <Button
                  variant="default"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 transition-all duration-200"
                  onClick={async () => {
                    await navigate({ to: AppRoute.report.dailyReport.create.url })
                  }}
                >
                  <FaPlus className="h-4 w-4 mr-2" />
                  {t($ => $.dailyReport.actions.addReport)}
                </Button>}
              </div>
            </div>
          </div>

          <div className="p-6">
            {viewMode === "table" ?
              <TableReport data={reportListMutation?.data}
                sort={currentValues?.sort || "reportDate"}
                order={currentValues?.order || "desc"}
                onSortChange={handleSortChange}
                onEditClicked={(id_: string) => navigate({
                  to: AppRoute.report.dailyReport.edit.url,
                  search: { project_id: id_, step: 1 }
                })}
                onDuplicateClicked={(item: any) => setDuplicateReport(item)}
                onDeleteClicked={(item: any) => onDeleteData(item)}
                onPaginationChange={handlePaginationChange}
                paginationData={pageParams}
              /> :
              <ExplorerCardView data={reportListMutation?.data ?? {}}
                onEditClicked={(id_: string) => navigate({
                  to: AppRoute.report.dailyReport.edit.url,
                  search: { project_id: id_, step: 1 }
                })}
                onDuplicateClicked={(item: any) => setDuplicateReport(item)}
                onDeleteClicked={(item: any) => onDeleteData(item)}
                onPageSizeChange={
                  (pageSize: number, pageIndex: number) => {
                    form.setValue("page", pageIndex);
                    form.setValue("view", pageSize);
                    const body_form = createBodyForm(form.getValues());
                    getListReport(body_form);
                  }
                }
              />
            }
          </div>
        </div>
      )}

      {confirmationModal && <DialogModal modal={confirmationModal} variantSubmit={"destructive"} />}
      {duplicateReport && (
        <DuplicateReportModal
          open={!!duplicateReport}
          onClose={() => setDuplicateReport(null)}
          sourceReport={duplicateReport}
          subTypes={subTypes}
        />
      )}
    </div>
  )
}
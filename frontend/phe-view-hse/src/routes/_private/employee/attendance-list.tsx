import { useEffect } from "react";
import { createFileRoute } from '@tanstack/react-router'
import { ContainerFilter, ListView, StatsCards } from "@/components/pages/employee/attendance-list";
import { useAttendanceList, exportAttendanceExcel, useEmployeeLocations } from "@/service/employee/attendance-list";
import { Button } from "@/components/ui/button";
import { SkeTable } from "@/components/custom/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { LuCalendarDays } from "react-icons/lu";
import { useForm } from "react-hook-form";
import { useAppTranslation } from '@/lib/i18n-typed';
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { PopoverFilter } from "@/components/app/PopoverFilter";
import { date_to_string, string_to_date } from '@/lib/my-utils';
import { APP_CONFIG } from '@/constants/config';
import { useVesselGet } from "@/service/vessels-api";
import { useSubTypesList } from "@/service/sub-type-api";
import { useContractorGet } from "@/service/contractor-api";
import { useState } from "react";

export const Route = createFileRoute('/_private/employee/attendance-list')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();

  const store = useAppStore();
  const initialFilter = store?.attendanceList ?? defaultStore.attendanceList;

  // Use pageParams if available, otherwise fallback to store
  const form = useForm({
    defaultValues: {
      ...initialFilter,
      search: initialFilter.search || "",
      date_start: string_to_date(initialFilter.date_start, APP_CONFIG.dayFormat),
      date_end: string_to_date(initialFilter.date_end, APP_CONFIG.dayFormat),
      projectId: (initialFilter as any).projectId || [],
      vesselId: (initialFilter as any).vesselId || [],
      subContractorId: (initialFilter as any).subContractorId || [],
      location: (initialFilter as any).location || [],
    }
  });

  const attendanceListMutation = useAttendanceList();
  const attendanceList = attendanceListMutation.data;
  const isError = attendanceListMutation.isError;
  const error = attendanceListMutation.error;

  const [searchValue, setSearchValue] = useState("");

  const vesselListQuery = useVesselGet();
  const subTypesListQuery = useSubTypesList();
  const contractorListQuery = useContractorGet();
  const employeeLocationsQuery = useEmployeeLocations();

  const vesselList = vesselListQuery.data?.map((item: any) => ({
    value: item.id,
    label: item.vesselName,
  })) || [];

  const projectIdList = subTypesListQuery.data?.map((item: any) => ({
    value: item.id,
    label: item.name,
  })) || [];

  const contractorList = contractorListQuery.data?.map((item: any) => ({
    value: item.id,
    label: item.name,
  })) || [];

  const locationList = employeeLocationsQuery.data?.map((loc: string) => ({
    value: loc,
    label: loc,
  })) || [];

  const createBodyForm = (body: Record<any, any> = {}) => {
    let date_start_ = date_to_string(body?.date_start, APP_CONFIG.dayFormat);
    let date_end_ = date_to_string(body?.date_end, APP_CONFIG.dayFormat);

    const newBody: any = {
      ...body,
      selectByRange: "false",
      date_start: date_start_,
      date_end: date_end_,
    }
    if (body?.selectByRange === "true" || body?.selectByRange === true) {
      newBody.selectByRange = "true";
    }

    return newBody;
  }

  const getAttendanceList = (body: any) => {
    if (body.selectByRange === "false") {
      delete body?.date_start;
      delete body?.date_end;
      delete body?.reset;
      delete body?.selectByRange;
    }
    attendanceListMutation.mutate({ body });
  }

  // Initial fetch
  useEffect(() => {
    const formValues = createBodyForm(form.getValues());
    const payload = {
      ...initialFilter,
      ...formValues
    };
    getAttendanceList(payload);
  }, []);

  const isLoading = () => {
    return attendanceListMutation.isPending;
  }

  const onFilterSubmit = (data: any) => {
    const bodyForm = createBodyForm(data);

    const payload = {
      ...store.attendanceList, // Keep existing pagination/settings
      ...bodyForm,
      status: Array.isArray(bodyForm.status) ? bodyForm.status : (bodyForm.status ? [bodyForm.status] : []),
      page: 0 // Reset to first page on filter change
    };

    // Update store to keep filters during pagination
    store.setAttendanceList(payload);

    // Fetch data
    getAttendanceList(payload);
  }

  const handlePaginationChange = (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => {
    const newPage = paginationData.page - 1; // Store uses 0-indexed page
    const formValues = createBodyForm(form.getValues());

    let payload = {
      ...store.attendanceList,
      ...formValues,
      status: Array.isArray(formValues.status) ? formValues.status : (formValues.status ? [formValues.status] : []),
      page: newPage,
      limit: paginationData.limit,
    };

    // Update store
    store.setAttendanceList(payload);

    // Fetch data
    getAttendanceList(payload);
  };

  const renderView = () => {
    const paginationData = store.attendanceList;
    const commonProps = {
      data: attendanceList?.data || [],
      onPaginationChange: handlePaginationChange,
      paginationData: {
        page: paginationData.page + 1,
        limit: paginationData.limit,
        total: attendanceList?.meta?.totalEmployees || 0,
        totalPages: attendanceList?.meta?.totalPages || 0,
      },
      form,
      projectIdList,
      vesselList,
      contractorList,
      onFilterSubmit,
      setSearchValue,
      toolbarNew: (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            className="gap-2 h-10 px-4 border-dashed hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-300"
            onClick={async () => {
              const bodyForm = createBodyForm(form.getValues());
              const payload = {
                ...store.attendanceList,
                ...bodyForm,
                status: Array.isArray(bodyForm.status) ? bodyForm.status : (bodyForm.status ? [bodyForm.status] : []),
              };
              await exportAttendanceExcel(payload);
            }}
          >
            <Download className="h-4 w-4" />
            {t($ => $.shared.export)}
          </Button>
          <PopoverFilter
            form={form}
            onSubmit={onFilterSubmit}
            loading={isLoading()}
            ContainerFilter={ContainerFilter}
            vesselList={vesselList}
            projectIdList={projectIdList}
            contractorList={contractorList}
            locationList={locationList}
            showSearch={true}
            filterText={t($ => $.shared.filter)}
            searchInput={{
              placeholder: t($ => $.shared.searchPlaceholder),
              tooltipTitle: t($ => $.employeeList.searchTooltip),
            }}
            submitVariant="outline"
          />
        </div>
      )
    };

    return <ListView {...commonProps} />;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuCalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.attendanceList.title)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.attendanceList.desc)}</p>
            </div>
          </div>
        </div>
      </div>

      <StatsCards
        meta={attendanceList?.meta}
        isLoading={isLoading()}
      />

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="p-0">
          {isLoading() && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <Loader2 className="h-8 w-8 text-destructive animate-spin" /> {/* Or error icon */}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.shared.error)}</h3>
              <p className="text-destructive">{error?.message || t($ => $.shared.unknownError)}</p>
            </div>
          )}

          {!isLoading() && !isError && (
            <div className="rounded-lg overflow-hidden px-6">
              {renderView()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

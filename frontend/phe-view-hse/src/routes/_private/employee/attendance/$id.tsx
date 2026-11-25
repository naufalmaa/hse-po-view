import { useEffect, useState } from "react";
import { createFileRoute, Link } from '@tanstack/react-router'
import { AttendanceHeader, AttendanceHistory, AttendanceFilter } from "@/components/pages/employee/attendance";
import { useAttendanceList } from "@/service/employee/attendance-list";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAppTranslation } from '@/lib/i18n-typed';
import { PopoverFilter } from "@/components/app/PopoverFilter";
import { date_to_string, string_to_date } from '@/lib/my-utils';
import { APP_CONFIG } from '@/constants/config';
import { Button } from "@/components/ui/button";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";
import { AppRoute } from "@/constants/app-route";

export const Route = createFileRoute('/_private/employee/attendance/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams();
  const { t } = useAppTranslation();

  const form = useForm({
    defaultValues: {
      selectByRange: "false",
      date_start: string_to_date(date_to_string(new Date(), APP_CONFIG.dayFormat)),
      date_end: string_to_date(date_to_string(new Date(), APP_CONFIG.dayFormat)),
    }
  });

  const attendanceListMutation = useAttendanceList();
  const attendanceData = attendanceListMutation.data?.data?.[0]; // Expecting single employee
  const isError = attendanceListMutation.isError;
  const error = attendanceListMutation.error;

  const createBodyForm = (body: Record<any, any> = {}) => {
    let date_start_ = date_to_string(body?.date_start, APP_CONFIG.dayFormat);
    let date_end_ = date_to_string(body?.date_end, APP_CONFIG.dayFormat);

    let newBody = {
      ...body,
      employeeId: id, // Force employeeId
      selectByRange: "false",
      date_start: date_start_,
      date_end: date_end_,
      page: 0,
      limit: 5,
    }
    if (body?.selectByRange === "true" || body?.selectByRange === true) {
      newBody.selectByRange = "true";
    }

    return newBody as any;
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
    getAttendanceList(formValues);
  }, [id]);

  const isLoading = () => {
    return attendanceListMutation.isPending;
  }

  const onFilterSubmit = (data: any) => {
    // Reset pagination state to page 1
    const newPage = 1;
    setPagination(prev => ({ ...prev, page: newPage }));

    let body = {
      ...createBodyForm(data),
      page: newPage - 1, // API 0-indexed
      limit: pagination.limit,
    }
    getAttendanceList(body);
  }

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5
  });

  const handlePaginationChange = (nextPagination: { page: number; limit: number; total?: number; totalPages?: number }) => {
    setPagination(prev => ({ ...prev, page: nextPagination.page, limit: nextPagination.limit }));

    // Call API with new pagination
    const bodyForm = createBodyForm(form.getValues());
    const payload = {
      ...bodyForm,
      page: nextPagination.page - 1, // API usually 0-indexed
      limit: nextPagination.limit
    };
    getAttendanceList(payload);
  };

  // derived data
  const meta = attendanceListMutation.data?.meta;
  const historyData = attendanceData?.attendanceHistory || [];

  // If backend provides pagination meta, use it. Otherwise fallback to client-slicing (if backend returns all)
  const isServerSidePagination = !!meta;
  const totalRecords = isServerSidePagination ? (meta?.totalAttendanceRecords || 0) : historyData.length;
  // If server-side, calculate pages from total. If client-side, calculate from array length.
  const totalPages = isServerSidePagination ? (meta?.totalPages || Math.ceil(totalRecords / pagination.limit)) : Math.ceil(totalRecords / pagination.limit);

  // If server-side, data is already paginated. If client-side, slice it.
  const paginatedHistory = isServerSidePagination ? historyData : historyData.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  return (
    <div className="w-full space-y-6">
      {/* Header & Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => window.history.back()}>
          <LuArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t($ => $.attendance.title)}</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2 shadow-sm hover:bg-primary/10 hover:text-primary transition-all">
            <Link to={AppRoute.employee.detail.url} search={{ id } as any}>
              <LuExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Detail Pekerja</span>
            </Link>
          </Button>
          <PopoverFilter
            form={form}
            onSubmit={onFilterSubmit}
            loading={isLoading()}
            ContainerFilter={AttendanceFilter}
            showSearch={false}
            filterText={t($ => $.attendance.filter.title)}
            submitVariant="outline"
          />
        </div>
      </div>

      {isLoading() && !attendanceData && (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 text-center text-destructive">
            <p>{error?.message || t($ => $.shared.error)}</p>
            <Button variant="outline" onClick={() => getAttendanceList(createBodyForm(form.getValues()))} className="mt-4">
              {t($ => $.shared.retry)}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading() && !attendanceData && !isError && (
        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
          {t($ => $.attendance.history.noData)}
        </div>
      )}

      {attendanceData && (
        <div className="space-y-6">
          <AttendanceHeader employee={attendanceData} />

          <div className="space-y-4">
            <AttendanceHistory
              attendanceHistory={paginatedHistory}
              paginationData={{
                page: pagination.page,
                limit: pagination.limit,
                total: totalRecords,
                totalPages: totalPages
              }}
              onPaginationChange={handlePaginationChange}
              employeeId={id}
              currentStatusOnDuty={!!attendanceData.statusOnDuty}
              onSuccess={() => getAttendanceList(createBodyForm(form.getValues()))}
              employee={attendanceData}
            />
          </div>
        </div>
      )}
    </div>
  )
}

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { LuClock } from "react-icons/lu";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getShortName, getDaysFromCurrentDate, date_to_string, string_to_date } from "@/lib/my-utils";
import { Button } from "@/components/ui/button";
import { CiEdit, CiTrash } from "react-icons/ci";
import FormGeneral from "@/components/pages/employee/detail/FormGeneral";
import { onDataUpdated as onDataUpdatedEmployee } from "@/components/pages/employee/detail/template/employee";
import { DialogModalForm } from "@/components/custom/components";
import { EmployeeListResponse } from "@/service/employee/employee-list";
import { openStatusChangeDialog } from "./DialogStatusChange";
import { getOhihColor } from "./CardDetailsEmployee";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  data: EmployeeListResponse;
  onDetailClicked?: (id: string) => void;
  onDeleteClicked?: (item: any) => void;
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  enableAction?: boolean;
  isAdmin?: boolean;
  onEmployeeUpdated: (employeeId: string, body: Record<string, any>) => void;
  formData?: any; // Add formData prop to match TableEmployee
  userRole?: string;
  onManageAttendance?: (body: any) => void;
}

const CardSimpleEmployee = ({
  data,
  onDetailClicked,
  onDeleteClicked,
  onPaginationChange,
  paginationData,
  enableAction = true,
  isAdmin = false,
  onEmployeeUpdated,
  formData, // Destructure formData prop
  userRole,
  onManageAttendance
}: Props) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [confirmationPut, setConfirmationPut] = React.useState<any | null>(null);

  const OHIH_MAP: Record<string, number> = {
    'P1': 2,
    'P2': 4,
    'P3': 6,
    'P4': 8,
    'P5': 10,
    'P6': 12,
    'P7': 14,
  };

  const OHIH_HEX_MAP: Record<string, string> = {
    'P1': '#10b981', // Emerald 500
    'P2': '#84cc16', // Lime 500
    'P3': '#eab308', // Yellow 500
    'P4': '#f97316', // Orange 500
    'P5': '#ef4444', // Red 500
    'P6': '#991b1b', // Red 800
    'P7': '#0f172a', // Slate 900
  };

  const OhihHistory = ({ mcus, id }: { mcus: any[], id: string }) => {
    if (!mcus || mcus.length === 0) return <span className="text-[10px] text-muted-foreground/30 italic">No Data</span>;

    const history = [...mcus]
      .filter(m => m.ohihReview)
      .sort((a, b) => new Date(a.mcuDate).getTime() - new Date(b.mcuDate).getTime());

    if (history.length === 0) return <span className="text-[10px] text-muted-foreground/30 italic">No Data</span>;

    const width = 120;
    const height = 24;
    const latestReview = history[history.length - 1].ohihReview?.toUpperCase();
    const themeColor = OHIH_HEX_MAP[latestReview] || '#94a3b8';

    const points = history.map((m, i) => {
      const x = history.length === 1 ? 0 : (i / (history.length - 1)) * width;
      const y = OHIH_MAP[m.ohihReview?.toUpperCase()] || height / 2;
      return `${x},${y}`;
    }).join(" ");

    const areaPoints = [
      `${history.length === 1 ? width / 2 : 0},${height}`,
      ...history.map((m, i) => {
        const x = history.length === 1 ? width / 2 : (i / (history.length - 1)) * width;
        const y = OHIH_MAP[m.ohihReview?.toUpperCase()] || height / 2;
        return `${x},${y}`;
      }),
      `${history.length === 1 ? width / 2 : width},${height}`
    ].join(" ");

    const gradientId = `grad-${id}`;

    return (
      <div className="flex items-center self-start transition-all duration-300 group/ohih pt-1.5">
        <div className="flex items-center h-8">
          <TooltipProvider delayDuration={0}>
            <svg width={width} height={height} className="overflow-visible">
              {history.length === 1 && (
                <line
                  x1="0"
                  y1={OHIH_MAP[history[0].ohihReview?.toUpperCase()] || height / 2}
                  x2={width}
                  y2={OHIH_MAP[history[0].ohihReview?.toUpperCase()] || height / 2}
                  stroke={themeColor}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  className="opacity-40"
                />
              )}

              {history.length > 1 && (
                <polyline
                  points={points}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-90 group-hover/ohih:opacity-100 transition-all duration-300"
                />
              )}

              {history.map((m, i) => {
                const x = history.length === 1 ? 0 : (i / (history.length - 1)) * width;
                const y = OHIH_MAP[m.ohihReview?.toUpperCase()] || height / 2;
                const pointColor = OHIH_HEX_MAP[m.ohihReview?.toUpperCase()] || '#94a3b8';

                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <circle
                        cx={x}
                        cy={y}
                        r={history.length === 1 ? "4.5" : "3.5"}
                        fill={pointColor}
                        className="cursor-pointer transition-all duration-300 hover:r-6 stroke-white dark:stroke-slate-900 stroke-[2px]"
                      />
                    </TooltipTrigger>
                    <TooltipContent className="p-3 select-none shadow-2xl border-border/50 backdrop-blur-lg bg-white/95 dark:bg-slate-950/95 z-[100]" side="top">
                      <div className="flex flex-col gap-1 min-w-[90px]">
                        <span className="text-[12px] font-black uppercase tracking-widest" style={{ color: pointColor }}>
                          {m.ohihReview}
                          {m.mcuExpiredDate && new Date(m.mcuExpiredDate).getTime() < new Date().setHours(0, 0, 0, 0) ? " (Expired)" : ""}
                        </span>
                        <div className="h-[1px] w-full bg-border/40 my-0.5" />
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {date_to_string(string_to_date(m.mcuExpiredDate))}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </svg>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 overflow-hidden">
      <div className="flex flex-col gap-4">
        {/* Employees List in Card View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((employee: any, index: number) => {
            // Get last update badge info
            const lastUpdateInfo = getDaysFromCurrentDate(t, employee.updatedAt);

            // Latest OHIH Review
            const latestMcu = [...(employee?.mcus ?? [])].sort((a, b) => new Date(b.mcuDate).getTime() - new Date(a.mcuDate).getTime())[0];
            const latestOhih = latestMcu?.ohihReview;

            return (
              <div
                key={`${employee.id}-${index}`}
                className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* Employee name with avatar and row number */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee?.imageUrl} />
                      <AvatarFallback className="bg-secondary">
                        {getShortName(employee.employeeName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div
                          onClick={() => onDetailClicked && onDetailClicked(employee.id)}
                          className="font-medium text-foreground cursor-pointer hover:underline"
                        >
                          {employee.employeeName || '-'}
                        </div>
                        <Badge variant="outline" className="bg-muted">
                          {((paginationData.page - 1) * paginationData.limit) + index + 1}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{employee.subContractorName}</div>
                    </div>
                  </div>

                  {/* Category and Status */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant={"outline"}>
                      <span className={`w-2 h-2 rounded-full ${getEmployeeColor(employee.category)}`}></span>
                      {getEmployeeLabel(employee.category) || employee.category || t($ => $.employeeList.table.na)}
                    </Badge>
                    <Badge
                      variant={"outline"}
                      className={(isAdmin || userRole === 'contractor') ? "cursor-pointer hover:bg-accent" : ""}
                      {...((isAdmin || userRole === 'contractor') ? {
                        onClick: () => {
                          const employeeId = employee.id;
                          if (employeeId) {
                            if (userRole === 'contractor' && onManageAttendance) {
                              openStatusChangeDialog(t, employeeId, employee.statusOnDuty, setConfirmationPut, onManageAttendance);
                            } else if (isAdmin) {
                              navigate({ to: `/employee/attendance/${employeeId}` as any });
                            }
                          }
                        }
                      } : {})}
                    >
                      <span className={`w-2 h-2 rounded-full ${employee.statusOnDuty ? "bg-green-500" : "bg-red-500"}`} />
                      {employee.statusOnDuty ? t($ => $.employeeList.status.onDuty) : t($ => $.employeeList.status.off)}
                    </Badge>
                  </div>

                  {/* Position and vessel */}
                  <div className="space-y-3 mb-2">
                    {/* Position */}
                    {employee.position && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t($ => $.employeeList.table.position)}</span>
                        <div className="flex items-center gap-1">
                          {/* <LuBriefcase className="h-4 w-4 text-muted-foreground" /> */}
                          <span>{employee.position}</span>
                        </div>
                      </div>
                    )}

                    {/* Vessel */}
                    {employee.vesselName && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t($ => $.employeeList.table.vesselName)}</span>
                        <div className="flex items-center gap-1">
                          {/* <LuSailboat className="h-4 w-4 text-muted-foreground" /> */}
                          <span>{employee.vesselName}</span>
                        </div>
                      </div>
                    )}

                    {/* Date of Birth */}
                    {employee.dateOfBirth && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t($ => $.employeeList.table.dateOfBirth)}</span>
                        <div className="flex items-center gap-1">
                          {/* <LuCalendar className="h-4 w-4 text-muted-foreground" /> */}
                          <span>{employee.dateOfBirth}</span>
                        </div>
                      </div>
                    )}

                    {/* Identity Number */}
                    {employee.hssePassportNumber && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t($ => $.employeeList.table.hsseEPassport)}</span>
                        <div className="flex items-center gap-1">
                          {/* <LuUser className="h-4 w-4 text-muted-foreground" /> */}
                          <span>{employee.hssePassportNumber}</span>
                        </div>
                      </div>
                    )}

                    {/* Last Update Status */}
                    {employee.lastStatusUpdate && (
                      <div className="flex flex-row justify-between text-sm">
                        <span className="text-muted-foreground">{t($ => $.employeeList.table.daysOnBoard)}</span>
                        <div className="flex items-center gap-1">
                          {/* <LuUser className="h-4 w-4 text-muted-foreground" /> */}
                          {/* <span>{date_to_string(string_to_date(employee.lastStatusUpdate), "yyyy-MM-dd HH:mm")}</span> */}
                          <span>{employee.daysOnBoard || "0"} {t($ => $.employeeList.table.days)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer section with OHIH and Actions */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-border">
                    {/* OHIH History Sparkline */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{t($ => $.employeeList.table.ohih)}</span>
                        {latestOhih && (
                          <Badge className={`${getOhihColor(latestOhih)} font-bold px-2 py-0 h-5`}>
                            {latestOhih}
                            {latestMcu?.mcuExpiredDate && new Date(latestMcu.mcuExpiredDate).getTime() < new Date().setHours(0, 0, 0, 0) ? (
                              <span className="text-red-600 dark:text-red-400 font-extrabold ml-1">!</span>
                            ) : null}
                          </Badge>
                        )}
                      </div>
                      <OhihHistory mcus={employee.mcus} id={employee.id} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <LuClock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{lastUpdateInfo.labels}</span>
                      </div>

                    {/* Action buttons */}
                    {enableAction && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDataUpdatedEmployee(employee.id, employee, <FormGeneral isFormCreate={false} />, setConfirmationPut, onEmployeeUpdated, formData, t)}
                          className="h-8 px-2"
                        >
                          <CiEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteClicked && onDeleteClicked(employee)}
                          className="h-8 px-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <CiTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
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

        {/* Confirmation Dialog */}
        {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      </div>
    </div>
  );
};

export default CardSimpleEmployee;
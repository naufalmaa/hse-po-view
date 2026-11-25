import { DataTable, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Ship, Briefcase } from "lucide-react";
import React, { useMemo } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { string_date_formatted } from "@/lib/my-utils";
import { EmployeeWithAttendance } from "@/service/employee/attendance-list";
import { Button } from "@/components/ui/button";
import { getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import FilterBadges from "./FilterBadges";
import { getOhihColor } from "../list/CardDetailsEmployee";
import { cn } from "@/lib/utils";

type Props = {
    data: EmployeeWithAttendance[];
    onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
    paginationData: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    toolbarNew?: React.ReactNode;
    form: any;
    projectIdList: any[];
    vesselList: any[];
    contractorList: any[];
    onFilterSubmit: (values: any) => void;
    setSearchValue: (value: string) => void;
}

const ListView = ({
    data,
    onPaginationChange,
    paginationData,
    toolbarNew,
    form,
    projectIdList,
    vesselList,
    contractorList,
    onFilterSubmit,
    setSearchValue
}: Props) => {
    const { t } = useAppTranslation();

    const columns = useMemo(() => [
        createRowNumberColumn<EmployeeWithAttendance>({ accessorKey: "rowNum", id: "rowNum", paginationData }),
        {
            accessorKey: "employeeName",
            enableSorting: false,
            header: () => t($ => $.attendanceList.employee),
            cell: ({ row }: any) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={row.original.imageUrl} alt={row.original.employeeName || ""} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {row.original.employeeName?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <Link
                            to={`${AppRoute.employee.attendanceDetails.url}/${row.original.id}`}
                            className="font-medium hover:underline hover:text-primary truncate max-w-[200px]"
                        >
                            {row.original.employeeName}
                        </Link>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {row.original.position || "-"}
                        </span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: "statusOnDuty",
            enableSorting: false,
            header: () => t($ => $.attendanceList.attendanceList.status.label),
            cell: ({ row }: any) => {
                const status = row.original.statusOnDuty;
                return (
                    <Badge
                        variant={"outline"}
                        className="gap-1.5 px-2.5 py-0.5 h-6 text-xs font-normal"
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`} />
                        {status ? t($ => $.attendanceList.attendanceList.onDuty) : t($ => $.attendanceList.attendanceList.off)}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "category",
            enableSorting: false,
            header: () => t($ => $.attendanceList.attendanceList.category.label),
            cell: ({ cell }: any) => {
                const value = cell.getValue();
                const color = getEmployeeColor(value);
                const label = getEmployeeLabel(value);
                return <Badge variant={"outline"}><span className={`w-2 h-2 rounded-full ${color}`}></span> {label}</Badge>
            }
        },
        {
            accessorKey: "vesselAndProject",
            size: 200,
            minSize: 200,
            maxSize: 250,
            header: () => t($ => $.attendanceList.vesselAndProject),
            cell: ({ row }: any) => {
                const vesselName = row.original.vesselName;
                const matchedProject = row.original.projectId 
                    ? projectIdList?.find((p: any) => p.value === row.original.projectId)?.label 
                    : undefined;
                const projectName = matchedProject || row.original.projectName;

                return (
                    <div className="flex flex-col gap-1.5 py-1">
                        {vesselName && (
                            <div className="flex items-center gap-2 group" title={vesselName}>
                                <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                    <Ship className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-medium text-sm">
                                    {vesselName}
                                </span>
                            </div>
                        )}
                        {projectName && (
                            <div className="flex items-center gap-2 group" title={projectName}>
                                <div className="p-1 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                                    <Briefcase className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {projectName}
                                </span>
                            </div>
                        )}
                        {!vesselName && !projectName && <span className="text-muted-foreground">-</span>}
                    </div>
                );
            }
        },
        {
            id: "daysOnBoard",
            header: () => t($ => $.attendanceList.attendanceList.daysOnBoard),
            cell: ({ row }: any) => {
                const days = row.original.attendanceHistory?.[0]?.daysOnBoard;
                const isValidDays = days !== null && days !== undefined && !isNaN(Number(days));
                return (
                    <div>{isValidDays ? `${days} ${t($ => $.attendance.days)}` : "-"}</div>
                )
            }
        },
        {
            id: "ohihReview",
            header: () => t($ => $.attendanceList.lastOhihReview),
            cell: ({ row }: any) => {
                const review = row.original.ohihReview;
                return (
                    <Badge variant={"outline"} className={cn("font-bold", getOhihColor(review))}>
                        {review || "-"}
                    </Badge>
                )
            }
        },
        {
            id: "lastLocationOnDuty",
            header: () => t($ => $.attendanceList.lastLocationOnDuty),
            cell: ({ row }: any) => {
                const loc = row.original.lastOnDuty?.workLocationName
                    || (row.original.lastOnDuty?.locationAttendanceName && row.original.lastOnDuty?.locationAttendanceName !== '-' ? row.original.lastOnDuty?.locationAttendanceName : null)
                    || row.original.location
                    || (row.original.category === 'marine' ? row.original.vesselName : null)
                    || "-";
                return (
                    <div className="text-sm">
                        {loc}
                    </div>
                )
            }
        },
        {
            id: "lastLocationOffDuty",
            header: () => t($ => $.attendanceList.lastLocationOffDuty),
            cell: ({ row }: any) => {
                if (!row.original.lastOffDuty) {
                    return <div className="text-sm">-</div>;
                }
                const loc = row.original.lastOffDuty?.workLocationName
                    || (row.original.lastOffDuty?.locationAttendanceName && row.original.lastOffDuty?.locationAttendanceName !== '-' ? row.original.lastOffDuty?.locationAttendanceName : null)
                    || "-";
                return (
                    <div className="text-sm">
                        {loc}
                    </div>
                )
            }
        },
        {
            id: "lastOnDutyAttendance",
            header: () => t($ => $.attendanceList.lastOnDutyAttendance),
            cell: ({ row }: any) => {
                const date = row.original.lastOnDuty?.attendanceDate;
                return (
                    <div className="text-muted-foreground text-sm">
                        {date ? string_date_formatted({ localeId: "id-ID", dateString: date }) : "-"}
                    </div>
                )
            }
        },
        {
            id: "lastOffDutyAttendance",
            header: () => t($ => $.attendanceList.lastOffDutyAttendance),
            cell: ({ row }: any) => {
                const date = row.original.lastOffDuty?.attendanceDate;
                return (
                    <div className="text-muted-foreground text-sm">
                        {date ? string_date_formatted({ localeId: "id-ID", dateString: date }) : "-"}
                    </div>
                )
            }
        },
        {
            id: "actions",
            header: () => t($ => $.shared.actions),
            cell: ({ row }: any) => (
                <Link to={`${AppRoute.employee.attendanceDetails.url}/${row.original.id}`}>
                    <Button variant="outline" size={"sm"} className="px-3">
                        {t($ => $.shared.details)}
                    </Button>
                </Link>
            )
        }
    ], [t, paginationData]);

    const { table } = useDataTable({
        data: data || [],
        columns,
        pageCount: paginationData?.totalPages || -1,
        initialState: {
            columnPinning: { left: ["rowNum", "employeeName"], right: ["actions"] },
            pagination: { pageIndex: (paginationData?.page || 1) - 1, pageSize: paginationData?.limit || 10 },
        },
        manualPagination: true,
        onPaginationChange: (updater: any) => {
            const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;
            if (onPaginationChange) {
                onPaginationChange({
                    page: nextPagination.pageIndex + 1,
                    limit: nextPagination.pageSize,
                    total: paginationData.total,
                    totalPages: paginationData.totalPages
                });
            }
        }
    });

    return (
        <div className="space-y-4">
            {toolbarNew && (
                <div className="flex justify-end">
                    {toolbarNew}
                </div>
            )}
            <FilterBadges
                form={form}
                projectIdList={projectIdList}
                vesselList={vesselList}
                contractorList={contractorList}
                onFilterSubmit={onFilterSubmit}
                setSearchValue={setSearchValue}
            />
            <DataTable
                table={table}
                totalRowCount={paginationData.total}
                paginationData={paginationData}
                styles={{
                    container: {
                        default: "border"
                    }
                }}
            />
        </div>
    );
}

export default ListView;

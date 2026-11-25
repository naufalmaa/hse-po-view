import { DataTable, DataTableColumnHeader, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { useAppTranslation } from "@/lib/i18n-typed";
import React, { useMemo, useState } from "react";
import { UnmatchedLog, usePobUnmatchedLogDelete } from "@/service/employee/pob/pob-unmatched-logs";
import { AlertCircle, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";

interface PobUnmatchedLogsTableProps {
    data: UnmatchedLog[];
    loading: boolean;
}

export function PobUnmatchedLogsTable({ data, loading }: PobUnmatchedLogsTableProps) {
    const { t } = useAppTranslation();
    const queryClient = useQueryClient();
    const deleteMutation = usePobUnmatchedLogDelete();
    const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

    const handleDelete = (log: UnmatchedLog) => {
        setConfirmationDelete({
            title: t($ => $.pobUnmatchedLogs.delete.confirmTitle),
            desc: t($ => $.pobUnmatchedLogs.delete.confirmDesc),
            content: (
                <div className="text-sm text-muted-foreground">
                    {t($ => $.pobUnmatchedLogs.delete.confirmText)}
                </div>
            ),
            textConfirm: t($ => $.shared.delete),
            textCancel: t($ => $.shared.cancel),
            onConfirmClick: () => {
                deleteMutation.mutate(log.id, {
                    onSuccess: (data) => {
                        showNotifSuccess({ message: data.message || t($ => $.pobUnmatchedLogs.delete.success) });
                        queryClient.invalidateQueries({ queryKey: ['pobUnmatchedLogs'] });
                        setConfirmationDelete(null);
                    },
                    onError: (error: any) => {
                        showNotifError({ message: error.message || t($ => $.pobUnmatchedLogs.delete.error) });
                    }
                });
            },
            onCancelClick: () => setConfirmationDelete(null),
        });
    };

    const columns = useMemo(() => [
        createRowNumberColumn<UnmatchedLog>({ accessorKey: "rowNum", id: "rowNum" }),
        {
            accessorKey: "uploadedAt",
            minSize: 80,
            maxSize: 80,
            header: ({ column }: any) => <DataTableColumnHeader column={column} title={t($ => $.pobUnmatchedLogs.table.uploadedAt)} />,
            cell: ({ row }: any) => {
                const date = row.getValue("uploadedAt");
                return (
                    <div className="font-medium text-muted-foreground text-sm">
                        {date ? new Date(date).toLocaleString() : '-'}
                    </div>
                );
            }
        },
        {
            accessorKey: "filename",
            minSize: 200,
            maxSize: 200,
            header: ({ column }: any) => <DataTableColumnHeader column={column} title={t($ => $.pobUnmatchedLogs.table.filename)} />,
            cell: ({ row }: any) => (
                <div className="flex items-center text-foreground font-medium">
                    <Link
                        to={AppRoute.employee.pobUnmatchedDetails.url}
                        search={{ id: row.original.id }}
                        className="hover:underline hover:text-primary transition-colors cursor-pointer"
                    >
                        {row.getValue("filename") || '-'}
                    </Link>
                </div>
            )
        },
        {
            accessorKey: "unmatchedCount",
            minSize: 80,
            maxSize: 80,
            header: ({ column }: any) => <DataTableColumnHeader column={column} title={t($ => $.pobUnmatchedLogs.table.unmatchedCount)} />,
            cell: ({ row }: any) => {
                const count = row.getValue("unmatchedCount") as number;
                return (
                    <Badge variant="subtle-warning" className="px-2 py-0.5 text-xs font-semibold rounded-full flex items-center w-fit">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {count || 0}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            enableHiding: false,
            header: ({ column }: any) => <DataTableColumnHeader column={column} title={t($ => $.pobUnmatchedLogs.table.actions)} />,
            minSize: 50,
            maxSize: 50,
            cell: ({ row }: any) => {
                const log = row.original;

                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(log)}
                    >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">{t($ => $.shared.delete)}</span>
                    </Button>
                );
            },
        },
    ], [t, deleteMutation]);

    const { table } = useDataTable({
        data: data,
        columns,
        pageCount: -1,
        initialState: {
            pagination: { pageIndex: 0, pageSize: 10 }
        },
        manualPagination: false,
    });

    return (
        <>
            <DataTable
                table={table}
                styles={{
                    container: { default: "border" }
                }}
            />
            {confirmationDelete && (
                <DialogModal
                    modal={confirmationDelete}
                    variantSubmit="destructive"
                />
            )}
        </>
    )
}

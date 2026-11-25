import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { PobItem } from "@/service/employee/pob/pob-update";
import { CategoryKey, CategorySetting } from "./types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, useDataTable, createRowNumberColumn } from "@/components/custom/table";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo } from "react";

interface PobCategoryCardProps {
    categoryKey: CategoryKey;
    icon: React.ReactNode;
    items: PobItem[];
    settings: CategorySetting;
    colorClass: string;
    borderColorClass: string;
    onProcess: (key: CategoryKey) => void;
    isProcessing: boolean;
    onToggleUpdateStatus: (key: CategoryKey) => void;
    onPageChange: (key: CategoryKey, newPage: number) => void;
    itemsPerPage?: number;
}

export function PobCategoryCard({
    categoryKey,
    icon,
    items,
    settings,
    colorClass,
    borderColorClass,
    onProcess,
    isProcessing,
    onToggleUpdateStatus,
    onPageChange,
    itemsPerPage = 10
}: PobCategoryCardProps) {
    const { t } = useAppTranslation();

    const columns = useMemo<ColumnDef<PobItem>[]>(
        () => {
            const cols: ColumnDef<PobItem>[] = [
                createRowNumberColumn<PobItem>({
                    id: "rowNum",
                    accessorKey: "rowNum",
                    header: "No",
                    size: 50,
                    minSize: 50,
                    maxSize: 50,
                }),
                {
                    accessorKey: "employeeName",
                    header: t($ => $.pobUpdate.table.name),
                },
            ];

            if (categoryKey === "project") {
                cols.push({
                    accessorKey: "projectName",
                    header: t($ => $.pobUpdate.table.project),
                });
            }

            cols.push(
                {
                    accessorKey: "hssePassportNumber",
                    header: t($ => $.pobUpdate.table.passport),
                },
                {
                    accessorKey: "statusOnDuty",
                    size: 60,
                    minSize: 60,
                    maxSize: 60,
                    header: t($ => $.pobUpdate.table.status),
                    cell: ({ row }) => (
                        <div className="text-right">
                            <Badge variant={row.original.statusOnDuty ? "success" : "secondary"}>
                                {row.original.statusOnDuty ? "On Duty" : "Off Duty"}
                            </Badge>
                        </div>
                    ),
                }
            );

            return cols;
        },
        [categoryKey, t]
    );

    const { table } = useDataTable({
        data: items,
        columns,
        pageCount: -1,
        initialState: {
            pagination: {
                pageIndex: settings.currentPage - 1,
                pageSize: itemsPerPage,
            },
        },
        manualPagination: false,
    });

    const { pageIndex } = table.getState().pagination;

    useEffect(() => {
        if (pageIndex + 1 !== settings.currentPage) {
            onPageChange(categoryKey, pageIndex + 1);
        }
    }, [pageIndex, settings.currentPage, onPageChange, categoryKey]);

    if (items.length === 0) return null;

    return (
        <Card className={`py-0 shadow-lg border-border border-b-4 ${borderColorClass} overflow-hidden`}>
            <CardHeader className="bg-muted py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-full bg-white shadow-sm border ${borderColorClass.replace('border-b-', 'border-')}`}>
                            {icon}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">{t($ => `pobUpdate.categories.${categoryKey}`)}</CardTitle>
                            <CardDescription>{items.length} {t($ => $.pobUpdate.stats.detected)}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id={`update-status-${categoryKey}`}
                                checked={settings.updateStatus}
                                onCheckedChange={() => onToggleUpdateStatus(categoryKey)}
                            />
                            <Label htmlFor={`update-status-${categoryKey}`} className="text-xs">
                                {settings.updateStatus ? "On Duty" : "Off Duty"}
                            </Label>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={isProcessing} size="sm">
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    {t($ => $.pobUpdate.actions.processSelected)}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t($ => $.pobUpdate.confirmation.title)}</AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                        <span>
                                            Apakah Anda yakin ingin mengubah status duty menjadi{" "}
                                            <span className={`font-bold ${settings.updateStatus ? "text-green-500" : "text-red-500"}`}>
                                                {settings.updateStatus ? "On Duty" : "Off Duty"}
                                            </span>
                                            {" "}untuk semua pekerja{" "}
                                            <span className="font-semibold">
                                                {t($ => `pobUpdate.categories.${categoryKey}`)}
                                            </span>
                                            ?
                                        </span>
                                        <span className="block text-sm text-muted-foreground mt-2">
                                            Tindakan ini tidak dapat dibatalkan.
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t($ => $.pobUpdate.confirmation.cancel)}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onProcess(categoryKey)}>
                                        {t($ => $.pobUpdate.confirmation.confirm)}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <DataTable table={table} totalRowCount={items.length} styles={{ container: { default: "border" } }} />
            </CardContent>
        </Card>
    );
}

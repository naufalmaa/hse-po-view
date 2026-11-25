import React, { useMemo } from "react";
import { DataTable, DataTableColumnHeader, useDataTable } from "@/components/custom/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CiTrash, CiEdit } from "react-icons/ci";
import { Copy } from "lucide-react";
import { string_date_formatted } from "@/lib/my-utils";
import { useAppTranslation } from "@/lib/i18n-typed";
import { createRowNumberColumn } from "@/components/custom/table/data-table";

type Props = {
  data: any;
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    view: number; // Page size
    limit: number;
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  toolbarNew?: React.ReactNode;
  onEditClicked: (item: any) => void;
  onDeleteClicked: (item: any) => void;
  onDuplicateClicked?: (item: any) => void;
  sort?: string;
  order?: string;
  onSortChange?: (sort: string, order: string) => void;
}

const TableReport = ({ data, onEditClicked, onDeleteClicked, onDuplicateClicked, onPaginationChange, paginationData, sort = "reportDate", order = "desc", onSortChange }: Props) => {
  const { t } = useAppTranslation();

  const sorting = useMemo(() => {
    if (!sort) return [];
    return [{ id: sort, desc: order === "desc" }];
  }, [sort, order]);

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
    {
      accessorKey: "reportDate",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.reportDate)} />
      ),
      enableSorting: true,
      cell: ({ cell }: any) => {
        return <div className={""}>{string_date_formatted({ localeId: "id-ID", dateString: cell.getValue() })}</div>
      }
    },
    {
      accessorKey: "reportedBy",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.reportedBy)} />
      ),
      enableSorting: true,
    },
    {
      accessorKey: "instansi",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.instansi)} />
      ),
      enableSorting: true,
    },
    {
      accessorKey: "formType",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.type)} />
      ),
      enableSorting: true,
      cell: ({ cell }: any) => {
        const value = cell.getValue();
        return <Badge variant={"outline"}
          className={`text-gray-900 ${value === "project" ? "bg-blue-200 border-blue-500" : "bg-green-200 border-green-500"}`}>{cell.getValue()}</Badge>
      }
    },
    {
      accessorKey: "subtypeName",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.subType)} />
      ),
      enableSorting: true,
      cell: ({ row, cell }: any) => {
        const value = row.original?.formType;
        const vesselName = row.original?.vesselName;
        const workLocationName = row.original?.workLocationName;
        if (value === "project") {
          return (
            <div className="flex items-center gap-2">
              <span>{cell.getValue()}</span>
              {workLocationName && (
                <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300">
                  {workLocationName}
                </Badge>
              )}
            </div>
          )
        }
        else {
          return (<div>{vesselName}</div>)
        }
      }
    },
    {
      accessorKey: "action",
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.dailyReport.table.action)} className={"justify-center"} />)
      },
      enableSorting: false,
      size: 40,
      cell: ({ row }: any) => {
        return (<div className="flex flex-row items-center justify-center gap-0.5">
          <Button
            variant="ghost"
            size={"icon"}
            title="Duplikat Laporan"
            onClick={() => onDuplicateClicked && onDuplicateClicked(row.original)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size={"icon"} title="Edit Laporan" onClick={() => onEditClicked(row.original?.id ?? "")}><CiEdit /></Button>
          <Button variant="ghost" size={"icon"} title="Hapus Laporan" onClick={() => onDeleteClicked(row.original)}
            className={"text-destructive"}><CiTrash /></Button>
        </div>)
      }
    },
  ], [paginationData, t, onDuplicateClicked, onEditClicked, onDeleteClicked]);

  const { table } = useDataTable({
    data: data?.data || [],
    columns,
    pageCount: paginationData.totalPages || -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: paginationData.page, pageSize: paginationData.view },
      sorting,
    },
    sorting,
    manualSorting: true,
    manualPagination: true,
    onSortingChange: (updater: any) => {
      const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
      if (onSortChange) {
        if (!nextSorting || nextSorting.length === 0) {
          onSortChange("reportDate", "desc");
        } else {
          const first = nextSorting[0];
          onSortChange(first.id, first.desc ? "desc" : "asc");
        }
      }
    },
    onPaginationChange: (updater: any) => {
      const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;

      // Call parent pagination handler if provided
      if (onPaginationChange) {
        onPaginationChange({
          page: nextPagination.pageIndex + 1, // Convert 0-based to 1-based
          limit: nextPagination.view,
          total: paginationData.total,
        });
      }
    },
    manualFiltering: false,
  });

  return (
    <div className={""}>
      {data && <DataTable
        table={table}
        totalRowCount={paginationData.total ?? 0}
        paginationData={paginationData}
      >
      </DataTable>
      }
    </div>
  );
};

export default TableReport;
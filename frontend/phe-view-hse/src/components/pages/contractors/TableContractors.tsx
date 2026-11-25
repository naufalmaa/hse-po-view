import React, { useMemo } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTable, DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Button } from "@/components/ui/button";
import { CiEdit, CiTrash } from "react-icons/ci";
import { getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import { Badge } from "@/components/ui/badge";

type Props = {
  data: any[];
  loading: boolean;
  toolbarNew?: React.ReactNode;
  onEditClicked?: (item: any) => void;
  onDeleteClicked?: (item: any) => void;
  paginationData?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (pagination: { page: number; limit: number }) => void;
}

const TableContractors = ({ 
  data, 
  loading, 
  toolbarNew, 
  onEditClicked, 
  onDeleteClicked,
  paginationData,
  onPaginationChange
}: Props) => {
  const { t } = useAppTranslation();
  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
    {
      accessorKey: "name",
      meta: {
        label: t($ => $.contractors.name)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.contractors.name)} />)
      },
      enableSorting: true,
      size: 200
    },
    {
      accessorKey: "category",
      meta: {
        label: t($ => $.contractors.category)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.contractors.category)} />)
      },
      cell: ({ cell }: any) => {
        const value = cell.getValue();
        const color = getEmployeeColor(value);
        const label = getEmployeeLabel(value);
        if (!value) return null;
        return <Badge variant={"outline"}><span className={`w-2 h-2 rounded-full ${color}`}></span> {label}</Badge>
      }
    },
    {
      accessorKey: "action",
      size: 80,
      minSize: 80,
      enableSorting: false,
      meta: {
        label: t($ => $.contractors.form.delete.confirmText)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.contractors.form.delete.confirmText)} className={"justify-center"} />)
      },
      cell: ({ row }: any) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              size={"icon"}
              disabled={loading}
              onClick={() => onEditClicked && onEditClicked(row.original)}
            >
              <CiEdit />
            </Button>
            <Button
              variant="ghost"
              size={"icon"}
              disabled={loading}
              onClick={() => onDeleteClicked && onDeleteClicked(row.original)}
              className={"text-destructive"}
            >
              <CiTrash />
            </Button>
          </div>
        );
      }
    },
  ], [loading, onEditClicked, onDeleteClicked, t, paginationData])

  const { table } = useDataTable({
    data: data || [],
    columns,
    pageCount: paginationData?.totalPages || -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: (paginationData?.page || 1) - 1, pageSize: paginationData?.limit || 10 }, // Convert 1-based to 0-based
    },
    manualSorting: false,
    manualPagination: true,
    onPaginationChange: (updater: any) => {
      const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;
      
      // Call parent pagination handler if provided
      if (onPaginationChange) {
        onPaginationChange({
          page: nextPagination.pageIndex + 1, // Convert 0-based to 1-based
          limit: nextPagination.pageSize,
        });
      }
    },
    manualFiltering: false,
  });

  return (
    <div className={"px-0"}>
      {data && <DataTable
        table={table}
        styles={{ container: { default: "border" } }}
        totalRowCount={paginationData?.total ?? 0}
        paginationData={paginationData}
      >
        {/* <div className={"flex flex-row gap-2 justify-between"}>
          <div> </div>
          <div className={"flex flex-row gap-2"}>
            <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder={`${t($ => $.contractors.form.name.placeholder)}...`} />
            <DataTableViewOptions table={table} />
          </div>
          {toolbarNew}
        </div> */}
      </DataTable>
      }
    </div>
  );
}

export default TableContractors
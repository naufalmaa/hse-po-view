import { DataTable, DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import React, { useMemo } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Button } from "@/components/ui/button";
import { CiTrash, CiEdit } from "react-icons/ci";
import {createRowNumberColumn} from "@/components/custom/table/data-table";

type Props = {
  data: any[];
  loading: boolean;
  onCreateClicked?: () => void;
  onEditClicked: (item: any) => void;
  onDeleteClicked: (item: any) => void;
  toolbarNew?: React.ReactNode;
}
const TableVessel = ({ data, loading, onCreateClicked, onDeleteClicked, onEditClicked, toolbarNew }: Props) => {
  const { t } = useAppTranslation();

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum"}),
    {
      accessorKey: "vesselName",
      enableSorting: true,
      meta: {
        label: t($ => $.vessels.vesselName)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.vessels.vesselName)} />)
      },
    },
    {
      accessorKey: "type",
      enableSorting: true,
      meta: {
        label: t($ => $.vessels.type)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.vessels.type)} />)
      },
    },
    {
      accessorKey: "personnelCount",
      enableSorting: true,
      meta: {
        label: t($ => $.vessels.personnelCount)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.vessels.personnelCount)} />)
      },
    },
    {
      accessorKey: "extra.target",
      enableSorting: true,
      meta: {
        label: t($ => $.vessels.target) || "Target"
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.vessels.target) || "Target"} />)
      },
    },
    {
      accessorKey: "status",
      enableSorting: true,
      meta: {
        label: t($ => $.vessels.status)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.vessels.status)} />)
      },
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                status ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {status ? t($ => $.vessels.onHire) : t($ => $.vessels.offHire)}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: "action",
      size: 80,
      enableSorting: false,
      meta: {
        label: t($ => $.shared.action)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.shared.action)} className={"justify-center"} />)
      },
      cell: ({ row }: any) => {
        return (
          <div className="text-center">
            <Button variant="ghost" size={"icon"} disabled={loading} onClick={() => onEditClicked(row.original)}><CiEdit/></Button>
            <Button variant="ghost" size={"icon"} disabled={loading} onClick={() => onDeleteClicked(row.original)}
                    className={"text-destructive"}><CiTrash/></Button>
          </div>
        );
      }
    },
  ], [])

  const { table } = useDataTable({
    data: data || [],
    columns,
    pageCount: -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: 0, pageSize: 10 }, // Convert 1-based to 0-based
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  return (
    <div className={"px-4"}>
      {data && <DataTable
        table={table}
        styles={{container: {default: "border"}}}
      >
        <div className={"flex flex-row gap-2 justify-between"}>
          <div className={"flex flex-row gap-2"}>
            <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder={t($ => $.shared.searchPlaceholder) || "Search ..."} />
            <DataTableViewOptions table={table} />
          </div>
          {toolbarNew}
        </div>
      </DataTable>
      }
    </div>
  );
}

export default TableVessel
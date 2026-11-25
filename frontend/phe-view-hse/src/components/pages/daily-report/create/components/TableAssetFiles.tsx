import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumnHeader, useDataTable, createRowNumberColumn, createRowSelectColumn, DataTableSelection } from "@/components/custom/table";
import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilePenLineIcon } from "lucide-react";
import FormAssetNote from "@/components/pages/daily-report/create/components/FormAssetNote";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

type AssetFileData = {
  id: string;
  fileName: string;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  note: string;
  [key: string]: any;
};

type Props = {
  data: AssetFileData[],
  onEditAssets?: (item: AssetFileData) => void,
  onDeleteAssets?: (item: any) => void,
  className?: string,
  toolbar?: React.ReactNode;
}

const TableAssetFiles = ({ data, onEditAssets, onDeleteAssets, toolbar, className }: Props) => {
  const [tableData, setTableData] = React.useState(data);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  useEffect(() => {
    setTableData(data.sort((a, b) => a.fileName.localeCompare(b.fileName)));
  }, [data]);

  const columns = useMemo((): ColumnDef<AssetFileData>[] => [
    createRowNumberColumn<AssetFileData>({ accessorKey: "rowNum", id: "rowNum" }),
    createRowSelectColumn<AssetFileData>(),
    {
      accessorKey: "fileName",
      header: ({ column }) => (
        <div>
          <DataTableColumnHeader column={column} title={"File Name"} />
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const fileThumbnail = row.original?.thumbnailUrl;
        const fileType = row.original.fileType;
        const fileUrl = row.original.url;
        return (
          <div className={"flex flex-row gap-x-4 items-center"}>
            <div className="w-12 min-w-12 h-12">
              {fileType.includes("image/") ?
                <img className={"w-12 h-12 object-cover cursor-pointer rounded-xl"} src={fileThumbnail} alt={""}
                  onClick={() => window.open(fileUrl, "_blank")} /> :
                <div className={"w-12 h-12 bg-secondary rounded-xl"} />}
            </div>
            <div className={"flex flex-col gap-x-2 gap-y-1"}>
              <a className={"font-semibold hover:underline"} href={fileUrl} target={"_blank"}>{row.original.fileName}</a>
              <div className={"text-muted-foreground"}>
                Note: {row.original.note}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      id: "action",
      header: ({ column }) => (
        <div className={cn("flex justify-center")}>
          <DataTableColumnHeader column={column} title={"Action"} />
        </div>
      ),
      enableSorting: false,
      size: 40,
      cell: ({ row }) => {
        const [editModalOpen, setEditModalOpen] = useState(false);

        return (
          <div className={"flex items-center justify-center"}>
            <Popover open={editModalOpen} onOpenChange={setEditModalOpen}>
              <PopoverTrigger asChild>
                <Button size={"sm"} variant={"ghost"} className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"
                  onClick={(event) => {
                    event.preventDefault();
                    setEditModalOpen(true);
                  }}><FilePenLineIcon className="" /></Button>

              </PopoverTrigger>
              <PopoverContent className="w-80">
                <FormAssetNote onSubmitClicked={(item: any) => {
                  if (onEditAssets) {
                    onEditAssets({ ...row.original, notes: item?.notes });
                  }
                  setEditModalOpen(false);
                }}
                  title={"Edit Notes"}
                  defaultValues={{ notes: row.original.note }} />
              </PopoverContent>
            </Popover>
          </div>
        )
      }
    }
  ], [tableData]);

  const onDeleteAssetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const rows = table.getFilteredSelectedRowModel().rows;
    setConfirmationDelete({
      title: "Delete Assets",
      desc: `Are you sure want to delete this ${rows?.length} assets ?`,
      textConfirm: "Delete",
      textCancel: "Cancel",
      onConfirmClick: () => {
        if (onDeleteAssets) {
          onDeleteAssets({ ids: rows?.map(item => item?.original?.id) });
        }
        // Clear table selection after delete operation
        table.resetRowSelection();
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

  const { table } = useDataTable<AssetFileData>({
    data: tableData || [],
    columns: columns,
    pageCount: -1,
    initialState: {
      columnPinning: { left: ["rowNum", "select"], right: ["action"] },
      pagination: { pageIndex: 0, pageSize: 10 }, // Convert 1-based to 0-based
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  return (
    <div className={"mt-0"}>
      <DataTable
        table={table}
        totalRowCount={data?.length ?? 0}
      >
        <div className="flex flex-col gap-2">
          {toolbar}
          <DataTableSelection
            table={table}
            selectionText={{
              single: "Assets selected",
              multiple: "Assets selected",
              none: "No Assets selected"
            }}
          >
            <Button
              size="sm"
              variant="destructive"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => onDeleteAssetClicked(event)}
            >
              Delete Selected
            </Button>
          </DataTableSelection>
        </div>
      </DataTable>
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
export default TableAssetFiles
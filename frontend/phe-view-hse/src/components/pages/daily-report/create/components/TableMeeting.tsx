import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, useDataTable } from "@/components/custom/table";
import { CiEdit, CiTrash } from "react-icons/ci";
import * as React from "react";
import { getMeetingType } from "@/constants/app-enum";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { LuEye } from "react-icons/lu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AssetListView from "./AssetListView";

type Props = {
  data: any[],
  onSectionDelete?: (type: string, id: string) => void
  onDeleteAssets?: (item: any) => void,
  onDataUpdated?: (item: any) => void,
  disableAction?: boolean,
  supportingFiles: any[],
  deleteKey?: string,
  rowId?: string
}

const TableMeeting = ({
  data, onSectionDelete, onDeleteAssets, onDataUpdated,
  disableAction = false, supportingFiles,
  deleteKey = "meeting", rowId = "meetingId"
}: Props) => {
  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "status",
      header: "Jenis Meeting",
      enableSorting: true,
      cell: ({ row }: any) => {
        return (
          <div className={""}>
            {getMeetingType(row.original)}
          </div>
        )
      }
    },
    {
      accessorKey: "description",
      header: "Meeting Agenda",
      enableSorting: true,
    },
    {
      accessorKey: "absencePercentage",
      header: "Total Participant",
      enableSorting: true,
    },
    {
      accessorKey: "action",
      header: "Action",
      enableSorting: false,
      size: 80,
      cell: ({ row }: { row: any }) => {
        const files = supportingFiles?.filter((item: any) => item?.[rowId] === row.original?.id) ?? [];
        const fileCount = files?.length ?? 0;

        return <div className={"flex flex-row gap-1"}>
          {fileCount > 0 && <Button variant="ghost" className={"h-7"} onClick={() => handleViewAssets(files)} title="View Assets">
            <span className="text-sm">{fileCount}</span> <LuEye />
          </Button>}
          <Button size={"icon"} variant={"outline"} className={"w-7 h-7 text-primary"} onClick={() => {
            if (onDataUpdated) {
              onDataUpdated(row.original)
            }
          }}><CiEdit /></Button>
          <Button size={"icon"} variant={"outline"} className={"w-7 h-7 text-destructive"}
            onClick={() => {
              if (onSectionDelete) {
                onSectionDelete(deleteKey, row.original?.id)
              }
            }}><CiTrash /></Button>
        </div>
      }
    }
  ], [data, supportingFiles])

  const [viewAssetModal, setViewAssetModal] = React.useState<{ open: boolean; data: any[] }>({ open: false, data: [] });
  const handleViewAssets = (row: any) => {
    setViewAssetModal({
      open: true,
      data: row ?? []
    });
  };
  const handleDeleteAssetsFromModal = (item: any) => {
    setViewAssetModal({ open: false, data: [] });
    if (onDeleteAssets) {
      onDeleteAssets(item);
    }
  };

  const columnsWithoutAction = useMemo(() => {
    return columns.filter((col: any) => col.accessorKey !== "action");
  }, [columns]);

  const { table } = useDataTable({
    data: data || [],
    columns: disableAction ? columnsWithoutAction : columns,
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
    <>
      <DataTable
        table={table}
        totalRowCount={data?.length ?? 0}
        styles={{ container: { default: "border" } }}
      >
      </DataTable>
      {/* Asset View Modal */}
      <Dialog open={viewAssetModal.open} onOpenChange={(open) => setViewAssetModal({ ...viewAssetModal, open })}>
        <DialogContent className="max-w-4xl max-h-[80vh]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Assets ({viewAssetModal.data.length})</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <AssetListView
              data={viewAssetModal.data}
              onDeleteAssets={handleDeleteAssetsFromModal}
              disableAction={false}
              showSelection={true}
              className="max-w-[460px]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default TableMeeting
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import { CiEdit, CiTrash } from "react-icons/ci";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import FormRiskAssessment from "./FormRiskAssessment";
import { string_date_formatted } from "@/lib/my-utils";
import { getRiskAssessmentStatus } from "@/constants/app-enum";
import AssetListView from "@/components/pages/daily-report/create/components/AssetListView";
import { useAppTranslation } from "@/lib/i18n-typed";
import { LuEye } from "react-icons/lu";
import { onRiskDataUpdated } from "./template/risk";
import { createRowNumberColumn, DataTable } from "@/components/custom/table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  data: any[],
  onCreateClicked?: (body: any) => void
  onDataUpdated: (id: string, item: any) => void,
  onSectionDelete?: (id: string) => void
  onDeleteAssets?: (item: any) => void,
  disableAction?: boolean,
  deleteKey?: string,
  rowId?: string,
  loading?: boolean,
  canCreate?: boolean
}

const TableRiskAssessment = ({
  data, onSectionDelete, onDeleteAssets, onDataUpdated,
  disableAction = false,
  loading, onCreateClicked, canCreate = true
}: Props) => {
  const { t } = useAppTranslation();
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  const [viewAssetModal, setViewAssetModal] = useState<{ open: boolean; data: any[] }>({ open: false, data: [] });

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "title",
      header: "Nama",
      enableSorting: true,
      meta: {
        label: "Name"
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      meta: {
        label: "Description"
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      meta: {
        label: "Status"
      },
      cell: ({ cell }: { cell: any }) => {
        return (
          <div className={`${getRiskAssessmentStatus(cell.getValue())?.color ?? "text-foreground"}`}>
            {cell.getValue()}
          </div>
        );
      }
    },
    {
      accessorKey: "note",
      header: "Notes (From User)",
      enableSorting: true,
      meta: {
        label: "Notes"
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date Created",
      enableSorting: true,
      meta: {
        label: "Date Created"
      },
      cell: ({ cell }: { cell: any }) => {
        return (
          <div>
            {string_date_formatted({ localeId: 'id', dateString: cell.getValue(), format: 'dd-MM-yyyy HH:mm' })}
          </div>
        );
      }
    },
    {
      accessorKey: "editedAt",
      header: "Date Edited",
      enableSorting: true,
      meta: {
        label: "Date Edited"
      },
      cell: ({ cell }: { cell: any }) => {
        return (
          <div>
            {string_date_formatted({ localeId: 'id', dateString: cell.getValue(), format: 'dd-MM-yyyy HH:mm' })}
          </div>
        );
      }
    },
    {
      accessorKey: "action",
      header: ({ column }: any) => {
        return (<div className="flex items-center justify-center"><DataTableColumnHeader column={column} title={"Action"} /></div>)
      },
      enableSorting: false,
      size: 80,
      meta: {
        label: "Action"
      },
      cell: ({ row }: any) => {
        const files = row.original?.files;
        const fileCount = files?.length ?? 0;

        return <div className={"flex flex-row gap-1 w-full justify-center"}>
          {fileCount > 0 && <Button variant="ghost" onClick={() => handleViewAssets(row.original)} title="View Assets">
            <span className="text-sm">{fileCount}</span> <LuEye />
          </Button>}
          <Button variant="ghost" size={"icon"} onClick={() => onRiskDataUpdated(row.original, setConfirmationPut, onDataUpdated, <FormRiskAssessment isContractor={canCreate} />, canCreate)}><CiEdit /></Button>
          <Button variant="ghost" size={"icon"} onClick={() => onSectionDelete_(row.original)} className={"text-destructive"}><CiTrash /></Button>
        </div>
      }
    },
  ], [])

  const onSectionDelete_ = (row: any) => {
    setConfirmationDelete({
      title: "Delete Risk Assessment",
      content: <div>Are you sure you want to delete the risk assessment <span className={"text-primary"}>{row?.title}</span> ?
      </div>,
      textConfirm: "Delete",
      textCancel: "Cancel",
      onConfirmClick: async () => {
        if (onSectionDelete) {
          onSectionDelete(row?.id);
        }
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

  const handleViewAssets = (row: any) => {
    setViewAssetModal({
      open: true,
      data: row?.files ?? []
    });
  };

  const handleDeleteAssetsFromModal = (item: any) => {
    // Close the modal first
    setViewAssetModal({ open: false, data: [] });
    // Then call the parent's onDeleteAssets function
    if (onDeleteAssets) {
      onDeleteAssets(item);
    }
  };

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
    <div>
      {data && <DataTable
        table={table}
        styles={{ container: { default: "border" } }}
      >
        <div className={"flex flex-row gap-2 justify-between"}>
          <div className={"flex flex-row gap-2"}>
            <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder="Search ..." />
            <DataTableViewOptions table={table} />
          </div>
        </div>
      </DataTable>
      }

      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}

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
    </div>
  )
}
export default TableRiskAssessment
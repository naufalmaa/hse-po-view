import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import { CiEdit, CiTrash } from "react-icons/ci";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import FormQualification from "./FormQualification";
import AssetListView from "@/components/pages/daily-report/create/components/AssetListView";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LuEye } from "react-icons/lu";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { onQualificationDataUpdated, onQualificationDataUpdatedAdmin } from "./template/qualification";
import { isAdminString, isContractorString } from "@/types/auth";

type Props = {
  data: any[],
  onCreateClicked?: (body: any) => void
  onDataUpdated: (item: any) => void,
  onSectionDelete?: (id: string) => void
  onDeleteAssets?: (item: any) => void,
  disableAction?: boolean,
  deleteKey?: string,
  rowId?: string,
  loading?: boolean,
  contractors: any[],
  userRole: string
}

const TableQualification = ({
  data, onSectionDelete, onDeleteAssets, onDataUpdated,
  disableAction = false,
  loading, onCreateClicked, contractors, userRole
}: Props) => {
  const { t } = useAppTranslation();
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [viewAssetModal, setViewAssetModal] = useState<{ open: boolean; data: any[] }>({ open: false, data: [] });

  const defaultColumnSize = 120;
  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "title",
      header: t($ => $.qualification.qualificationName),
      enableSorting: true,
      meta: {
        label: t($ => $.qualification.qualificationName)
      },
      size: defaultColumnSize*2,
      minSize: defaultColumnSize*2
    },
    {
      accessorKey: "contractorName",
      header: t($ => $.qualification.contractorName),
      enableSorting: true,
      meta: {
        label: t($ => $.qualification.contractorName)
      },
      size: defaultColumnSize*2,
      minSize: defaultColumnSize*2
    },
    {
      accessorKey: "numberCertificate",
      header: t($ => $.qualification.numberCertificate),
      enableSorting: true,
      meta: {
        label: t($ => $.qualification.numberCertificate)
      },
      size: defaultColumnSize*1.5,
      minSize: defaultColumnSize*1.5
    },
    {
      accessorKey: "assessmentDate",
      header: t($ => $.qualification.assessmentDate),
      meta: {
        label: t($ => $.qualification.assessmentDate)
      },
      enableSorting: false,
      size: defaultColumnSize,
      minSize: defaultColumnSize
    },
    {
      accessorKey: "expiredDate",
      header: t($ => $.qualification.expiredDate),
      meta: {
        label: t($ => $.qualification.expiredDate)
      },
      size: defaultColumnSize,
      minSize: defaultColumnSize
    },
    {
      accessorKey: "qualifiedValue",
      header: t($ => $.qualification.qualifiedValue),
      enableSorting: true,
      meta: {
        label: t($ => $.qualification.qualifiedValue)
      },
      size: defaultColumnSize,
      minSize: defaultColumnSize
    },
    {
      accessorKey: "assessmentResult",
      header: t($ => $.qualification.assessmentResult),
      meta: {
        label: t($ => $.qualification.assessmentResult)
      },
      size: defaultColumnSize*2,
      minSize: defaultColumnSize*2
    },
    {
      accessorKey: "action",
      header: ({ column }: any) => {
        return (<div className="flex items-center justify-center"><DataTableColumnHeader column={column} title={t($ => $.qualification.action)} /></div>)
      },
      enableSorting: false,
      size: defaultColumnSize,
      minSize: defaultColumnSize,
      meta: {
        label: t($ => $.qualification.action)
      },
      cell: ({ row }: any) => {
        const files = row.original?.files;
        const fileCount = files?.length ?? 0;

        return <div className={"flex flex-row gap-1 w-full justify-center"}>
          {fileCount > 0 && <Button variant="ghost" onClick={() => handleViewAssets(row.original)} title={t($ => $.qualification.viewAssets)}>
            <span className="text-sm">{fileCount}</span> <LuEye />
          </Button>}
          <Button variant="ghost" size={"icon"} onClick={() => 
          {
            if(isAdminString(userRole)) {
              onQualificationDataUpdatedAdmin(
                t,
                row.original,
                setConfirmationPut,
                onDataUpdated,
                <FormQualification isContractor={false} disableContractor={true}/>,
                contractors,
                true
              )
            }
            else if (isContractorString(userRole)) {
              onQualificationDataUpdated(
                t,
                row.original,
                setConfirmationPut,
                onDataUpdated,
                <FormQualification isContractor={true} />,
                true
              )
            }
          }}><CiEdit /></Button>
          <Button variant="ghost" size={"icon"} onClick={() => onSectionDelete_(row.original)} className={"text-destructive"}><CiTrash /></Button>
        </div>
      }
    },
  ], [t])

  const handleViewAssets = (row: any) => {
    setViewAssetModal({
      open: true,
      data: row?.files ?? []
    });
  };

  const onSectionDelete_ = (row: any) => {
    setConfirmationDelete({
      title: t($ => $.qualification.deleteQualification),
      content: <div>{t($ => $.qualification.form.delete.description, { TITLE: row?.title })}</div>,
      textConfirm: t($ => $.qualification.form.delete.confirmText),
      textCancel: t($ => $.qualification.form.delete.cancelText),
      onConfirmClick: async () => {
        if (onSectionDelete) {
          onSectionDelete(row?.id);
        }
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

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
            <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder={t($ => $.shared.searchPlaceholder)} />
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
            <DialogTitle>{t($ => $.qualification.assets)} ({viewAssetModal.data.length})</DialogTitle>
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
export default TableQualification
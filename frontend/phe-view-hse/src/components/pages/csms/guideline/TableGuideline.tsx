import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import { CiEdit, CiTrash } from "react-icons/ci";
import { LuEye } from "react-icons/lu";
import AssetListView from "@/components/pages/daily-report/create/components/AssetListView";
import { DialogModal, DialogModalForm, LongText, ModalFormProps, ModalProps } from "@/components/custom/components";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormGuideline from "./FormGuideline";
import { string_date_formatted } from "@/lib/my-utils";
import { useAppTranslation } from "@/lib/i18n-typed";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { onGuidelineDataUpdated } from "./template/guideline";

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
  canCreate?: boolean,
  toolbarNew?: React.ReactNode,
}

const TableGuideline = ({
  data, onSectionDelete, onDeleteAssets, onDataUpdated,
  disableAction = false,
  loading, onCreateClicked,
  canCreate = true,
  toolbarNew
}: Props) => {
  const { t } = useAppTranslation();
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [viewAssetModal, setViewAssetModal] = useState<{ open: boolean; data: any[] }>({ open: false, data: [] });



  const handleEditGuideline = (row: any) => {
    onGuidelineDataUpdated(t, row.original, setConfirmationPut, onDataUpdated, <FormGuideline />);
  };

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "title",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.guidelines.guidelineName)} />
      ),
      enableSorting: true,
      meta: {
        label: t($ => $.guidelines.guidelineName),
      },
    },
    {
      accessorKey: "description",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.guidelines.description)} />
      ),
      enableSorting: false,
      meta: {
        label: t($ => $.guidelines.description),
      },
      cell: ({ cell }: { cell: any }) => {
        return (
          <LongText
            text={cell.getValue()}
            maxChars={100}
          />
        );
      }
    },
    {
      accessorKey: "createdAt",
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.guidelines.dateCreated)} />
      ),
      enableSorting: true,
      meta: {
        label: t($ => $.guidelines.dateCreated),
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
      header: ({ column }: any) => (
        <DataTableColumnHeader column={column} title={t($ => $.guidelines.dateEdited)} />
      ),
      enableSorting: true,
      meta: {
        label: t($ => $.guidelines.dateEdited),
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
        return (<div className="flex items-center justify-center"><DataTableColumnHeader column={column} title={t($ => $.guidelines.action)} /></div>)
      },
      enableSorting: false,
      size: 80,
      meta: {
        label: t($ => $.guidelines.action),
      },
      cell: ({ row }: any) => {
        const files = row.original?.files;
        const fileCount = files?.length ?? 0;

        return <div className={"flex flex-row gap-1 w-full justify-center"}>
          {fileCount > 0 && <Button variant="ghost" onClick={() => handleViewAssets(row.original)} title={t($ => $.guidelines.viewAssets)}>
            <span className="text-sm">{fileCount}</span> <LuEye />
          </Button>}
          {canCreate && <Button variant="ghost" size={"icon"} onClick={() => handleEditGuideline(row)}><CiEdit /></Button>}
          {canCreate && <Button variant="ghost" size={"icon"} onClick={() => onSectionDelete_(row.original)} className={"text-destructive"}><CiTrash /></Button>}
        </div>
      }
    },
  ], [])

  const onSectionDelete_ = (row: any) => {
    setConfirmationDelete({
      title: t($ => $.guidelines.form.delete.title),
      content: <div>{t($ => $.guidelines.form.delete.description)}
        <span className={"text-primary font-semibold"}>
          {row?.title}
        </span> ?
      </div>,
      textConfirm: t($ => $.guidelines.form.delete.confirmText),
      textCancel: t($ => $.guidelines.form.delete.cancelText),
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
        totalRowCount={data?.length ?? 0}
        styles={{ container: { default: "border" } }}
      >
        <div className={"flex flex-row gap-2 justify-between"}>
          <div className={"flex flex-row gap-2"}>
            <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder="Search ..." />
            <DataTableViewOptions table={table} />
          </div>
          {toolbarNew}
        </div>
      </DataTable>
      }

      {confirmationPut && (
        <DialogModalForm
          modal={{
            ...confirmationPut,
            title: typeof confirmationPut.title === 'string' ? t(confirmationPut.title) : confirmationPut.title,
            desc: typeof confirmationPut.desc === 'string' ? t(confirmationPut.desc) : confirmationPut.desc
          }}
        />
      )}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}

      {/* Asset View Modal */}
      <Dialog open={viewAssetModal.open} onOpenChange={(open) => setViewAssetModal({ ...viewAssetModal, open })}>
        <DialogContent className="max-w-4xl max-h-[80vh]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t($ => $.guidelines.assets)} ({viewAssetModal.data.length})</DialogTitle>
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
export default TableGuideline
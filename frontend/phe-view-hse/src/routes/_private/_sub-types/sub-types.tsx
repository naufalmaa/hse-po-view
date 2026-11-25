import { createFileRoute } from '@tanstack/react-router'
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { SkeTable } from "@/components/custom/skeleton";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import { useQueryClient } from '@tanstack/react-query';
import { useState } from "react";
import { useSubTypesCrud, useSubTypesDelete, useSubTypesList, useSubTypesDisableAllAuto } from "@/service/sub-type-api";
import { useSubTypesCreate, SubTypesCreatePayload } from "@/service/sub-types/sub-types-create";
import { TableSubTypes, FormEdit, onSubTypesCreated, onSubTypesUpdated, onSubTypesDeleted } from "@/components/pages/sub-types";
import { LuPlus, LuFolderOpen, LuLayers } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { PowerOff, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute('/_private/_sub-types/sub-types')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();

  const pageListQuery = useSubTypesList();
  const pageCreateMutation = useSubTypesCreate();
  const pagePutMutation = useSubTypesCrud();
  const pageDeleteMutation = useSubTypesDelete();
  const pageDisableAllMutation = useSubTypesDisableAllAuto();

  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [confirmDisableAll, setConfirmDisableAll] = useState(false);

  const isLoading = () => {
    return (pageListQuery.isPending || pageCreateMutation.isPending || pagePutMutation.isPending || pageDisableAllMutation.isPending);
  }

  const onDisableAllClicked = () => {
    pageDisableAllMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['sub-types-list'] });
        showNotifSuccess({ message: data?.message || "Seluruh trigger otomatis manhours berhasil dimatikan (OFF)" });
        setConfirmDisableAll(false);
      },
      onError: (error: any) => {
        showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message });
      },
    });
  };

  const ViewAddProjectName = () => {
    return (
      <Button
        variant={"default"}
        onClick={onDataCreated}
        disabled={isLoading()}
        className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
      >
        {isLoading() ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
        ) : (
          <LuPlus className="mr-2 h-4 w-4" />
        )}
        {t($ => $.subTypes.addProjectName)}
      </Button>
    );
  }

  const onDeleteData = (item: any) => {
    onSubTypesDeleted(
      t,
      item,
      setConfirmationDelete,
      (body: Record<string, string>) => {
        pageDeleteMutation.mutate(
          { body },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['sub-types-list'] });
              showNotifSuccess({ message: data?.message || t($ => $.subTypes.deleteSuccess) });
            },
            onError: (error: any) => showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message }),
          }
        );
      }
    );
  }

  const onDataCreated = () => {
    onSubTypesCreated(
      t,
      setConfirmationCreate,
      (body: Record<string, string>) => {
        pageCreateMutation.mutate(body as unknown as SubTypesCreatePayload, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sub-types-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.subTypes.createSuccess) });
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormEdit
    );
  };

  const onDataPut = (item: any) => {
    onSubTypesUpdated(
      t,
      item,
      setConfirmationPut,
      (id: string, body: Record<string, string>) => {
        pagePutMutation.mutate({ body: body, id: id }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sub-types-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.subTypes.updateSuccess) });
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormEdit
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuFolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.subTypes.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.subTypes.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pageListQuery.isSuccess && (
              <Badge variant="secondary" className="px-3 py-1">
                <LuLayers className="h-3 w-3 mr-1" />
                {pageListQuery.data?.length || 0} {t($ => $.subTypes.projects)}
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmDisableAll(true)}
              disabled={isLoading() || pageDisableAllMutation.isPending}
              className="border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-xs flex items-center gap-1.5"
            >
              <PowerOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Matikan Semua Trigger Otomatis</span>
            </Button>
            <ViewAddProjectName />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="p-0">
          {pageListQuery.isPending && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {pageListQuery.isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <LuFolderOpen className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.shared.failed)} {t($ => $.subTypes.pageTitle)}</h3>
              <p className="text-destructive">{pageListQuery?.error?.message}</p>
            </div>
          )}

          {pageListQuery.isSuccess && (
            <div className="rounded-lg overflow-hidden p-2">
              <TableSubTypes
                data={pageListQuery?.data}
                onCreateClicked={onDataCreated}
                onEditClicked={onDataPut}
                onDeleteClicked={(item: any) => onDeleteData(item)}
                loading={isLoading()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog: Matikan Semua Trigger Otomatis */}
      <Dialog open={confirmDisableAll} onOpenChange={setConfirmDisableAll}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-foreground">
                Matikan Semua Trigger Otomatis?
              </DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs leading-relaxed text-foreground">
              Tindakan ini akan menonaktifkan (<span className="font-semibold text-muted-foreground">OFF / Selesai</span>) seluruh trigger otomatis perhitungan manhours untuk <strong>semua project name ({pageListQuery.data?.length || 0} proyek)</strong>.
            </DialogDescription>
            <p className="text-[11px] text-muted-foreground mt-2">
              Catatan: Proyek yang di-set OFF tidak akan dihitung manhours-nya secara otomatis pada kalkulasi harian. Anda tetap dapat mengaktifkan kembali masing-masing proyek kapan saja melalui tombol edit.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDisableAll(false)}
              disabled={pageDisableAllMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDisableAllClicked}
              disabled={pageDisableAllMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {pageDisableAllMutation.isPending ? "Memproses..." : "Ya, Matikan Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
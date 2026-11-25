import { createFileRoute } from '@tanstack/react-router'
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { SkeTable } from "@/components/custom/skeleton";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import { useQueryClient } from '@tanstack/react-query';
import { useState } from "react";
import { z } from "zod"
import { TableVessel, FormEdit } from "@/components/pages/vessels";
import { useVesselCreate, useVesselCrud, useVesselDelete, useVesselGet } from "@/service/vessels-api";
import { LuPlus, LuShip, LuAnchor, LuUsers } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
// Import the new template functions
import { onVesselsCreated, onVesselsUpdated, onVesselsDeleted } from "@/components/pages/vessels/templates/vessels-template";

export const Route = createFileRoute('/_private/_vessels/vessels')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();

  const pageListQuery = useVesselGet();
  const pageCreateMutation = useVesselCreate();
  const pagePutMutation = useVesselCrud();
  const pageDeleteMutation = useVesselDelete();

  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  const isLoading = () => {
    return (pageListQuery.isPending || pageCreateMutation.isPending || pagePutMutation.isPending);
  }

  const ViewAddVessel = () => {
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
        {t($ => $.vessels.addVessel)}
      </Button>
    );
  }

  const onDeleteData = (item: any) => {
    onVesselsDeleted(
      t,
      item,
      setConfirmationDelete,
      (body: Record<string, string>) => {
        pageDeleteMutation.mutate(
          { body },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
              showNotifSuccess({ message: data?.message || t($ => $.vessels.deleteSuccess) || "Vessel deleted successfully" });
            },
            onError: (error: any) => showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message }),
          }
        );
      }
    );
  }

  const onDataCreated = () => {
    onVesselsCreated(
      t,
      setConfirmationCreate,
      (body: Record<string, string>) => {
        pageCreateMutation.mutate({ body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.vessels.createSuccess) || "Vessel created successfully" });
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
    onVesselsUpdated(
      t,
      item,
      setConfirmationPut,
      (id: string, body: Record<string, string>) => {
        pagePutMutation.mutate({ body: body, id: id }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.vessels.updateSuccess) || "Vessel updated successfully" });
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
              <LuShip className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.vessels.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.vessels.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {pageListQuery.isSuccess && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <LuAnchor className="h-3 w-3 mr-1" />
                  {pageListQuery.data?.length || 0} {t($ => $.vessels.vessels)}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <LuUsers className="h-3 w-3 mr-1" />
                  {pageListQuery.data?.reduce((total: number, vessel: any) => total + (vessel.personnelCount || 0), 0) || 0} {t($ => $.vessels.personnel)}
                </Badge>
              </div>
            )}
            <ViewAddVessel />
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
                <LuShip className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.shared.failed)} {t($ => $.vessels.pageTitle)}</h3>
              <p className="text-destructive">{pageListQuery?.error?.message}</p>
            </div>
          )}

          {pageListQuery.isSuccess && (
            <div className="rounded-lg overflow-hidden p-2">
              <TableVessel
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

      {/* Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
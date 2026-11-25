import { createFileRoute } from '@tanstack/react-router'
import { CardCustom } from "@/components/app";
import * as React from "react";
import { FormQualification, onQualificationDataCreated, TableQualification } from "@/components/pages/csms/qualification";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  useQualificationAssessmentCrud, useQualificationAssessmentDelete, useQualificationAssessmentDeleteAssets,
  useQualificationAssessmentGet,
  useQualificationAssessmentPost
} from "@/service/qualification-assessment";
import { USER_ROLE } from "@/constants/app-enum";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LuClipboardCheck, LuLoader, LuPlus } from "react-icons/lu";
import { useAppTranslation } from '@/lib/i18n-typed';
import { DialogModalForm, ModalFormProps } from '@/components/custom/components';
import { Button } from '@/components/ui/button';
import { isAdminString, isContractorString } from '@/types/auth';
import { onQualificationDataCreatedAdmin } from '@/components/pages/csms/qualification/template/qualification';
import { useContractorGet } from '@/service/contractor-api';

export const Route = createFileRoute(
  '/_private/csms/qualification',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? USER_ROLE.contractor.value;
  const canCreate = isContractorString(userRole) || isAdminString(userRole);

  const queryClient = useQueryClient();
  const dataGetQuery = useQualificationAssessmentGet();
  const dataPostMutation = useQualificationAssessmentPost();
  const dataCrudMutation = useQualificationAssessmentCrud();
  const dataDeleteMutation = useQualificationAssessmentDelete();
  const dataDeleteAssetsMutation = useQualificationAssessmentDeleteAssets();
  const contractorGetQuery = useContractorGet();

  const [confirmationCreate, setConfirmationCreate] = React.useState<ModalFormProps | null>(null);

  const [data, setData] = React.useState<any[] | never>([]);
  const contractors = contractorGetQuery.data?.map((contractor: any) => ({
    value: contractor.id,
    label: contractor.name
  })) || [];

  useEffect(() => {
    if (dataGetQuery.isSuccess && dataGetQuery.data) {
      // Sort data by title in ascending order
      const sortedData = [...dataGetQuery.data].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );
      setData(sortedData);
    }
  }, [dataGetQuery.isSuccess, dataGetQuery.data]);

  const isLoading = () => {
    return (dataGetQuery.isPending || dataPostMutation.isPending || dataDeleteMutation.isPending || dataCrudMutation.isPending ||
      dataDeleteAssetsMutation.isPending);
  }

  const onCreateClicked = (body: any) => {
    if (isContractorString(userRole)) {
      body.data.contractorId = auth?.user?.user?.id;
    }

    const formData = new FormData();
    for (const key in body.data) {
      formData.append(key, body.data[key]);
    }

    for (let i = 0; i < body?.files?.length; i++) {
      const obj = body?.files[i];
      formData.append(obj.keyFile, obj.file);
      formData.append(obj.keyNote, obj.note);
    }

    dataPostMutation.mutate(
      { body: formData },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['qualification-assessment-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.qualification.success.created) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.qualification.error.createFailed) })
      }
    )
  }

  const onDataUpdated = (body: any) => {
    const formData = new FormData();
    for (const key in body.data) {
      formData.append(key, body.data[key]);
    }
    for (let i = 0; i < body?.files?.length; i++) {
      const obj = body?.files[i];
      formData.append(obj.keyFile, obj.file);
      formData.append(obj.keyNote, obj.note);
    }

    dataCrudMutation.mutate(
      { body: formData },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['qualification-assessment-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.qualification.success.updated) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.qualification.error.updateFailed) })
      }
    )
  }

  const onSectionDelete = (id: string) => {
    dataDeleteMutation.mutate(
      { id: id },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['qualification-assessment-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.qualification.success.deleted) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.qualification.error.deleteFailed) })
      }
    )
  }

  const onDeleteAssets = (body: any) => {
    dataDeleteAssetsMutation.mutate({ body },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['qualification-assessment-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.qualification.success.assetsDeleted) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.qualification.error.assetsDeleteFailed) })
      })
  }

  const ViewAddItem = () => {
    return (
      <Button
        variant={"default"}
        onClick={() => {
          if (isAdminString(userRole)) {
            onQualificationDataCreatedAdmin(t, setConfirmationCreate, onCreateClicked,
              <FormQualification isContractor={false} />, contractors, canCreate)
          }
          else if (isContractorString(userRole)) {
            onQualificationDataCreated(t, setConfirmationCreate, onCreateClicked,
              <FormQualification isContractor={true} />, canCreate)
          }
        }
        }
        disabled={isLoading()}
        className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
      >
        {isLoading() ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
        ) : (
          <LuPlus className="mr-2 h-4 w-4" />
        )}
        {t($ => $.qualification.addQualification)}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.qualification.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.qualification.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {dataGetQuery.isSuccess && (
              <Badge variant="secondary" className="px-3 py-1">
                <LuClipboardCheck className="h-3 w-3 mr-1" />
                {data?.length || 0} {t($ => $.qualification.totalAssessments)}
              </Badge>
            )}

            {canCreate && <ViewAddItem />}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {dataGetQuery.isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <LuClipboardCheck className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">{t($ => $.qualification.errorLoading)}</h3>
                <p className="text-sm text-destructive/80 mt-1">
                  {dataGetQuery?.error?.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(dataGetQuery.isPending || isLoading()) && (
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <LuLoader className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t($ => $.qualification.loading)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Qualification Assessment Table */}
      {dataGetQuery.isSuccess && (
        <CardCustom contentClassName='p-4'>
          <TableQualification
            data={data}
            loading={isLoading()}
            onCreateClicked={onCreateClicked}
            onSectionDelete={onSectionDelete}
            onDataUpdated={onDataUpdated}
            onDeleteAssets={onDeleteAssets}
            disableAction={false}
            contractors={contractors}
            userRole={userRole}
          />
        </CardCustom>
      )}

      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
    </div>
  )
}
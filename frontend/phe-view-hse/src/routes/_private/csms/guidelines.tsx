import { createFileRoute } from '@tanstack/react-router'
import { CardCustom } from "@/components/app";
import * as React from "react";
import { FormGuideline, onGuidelineDataCreated, TableGuideline, ListGuideline } from "@/components/pages/csms/guideline";
import { useGuidelinesCrud, useGuidelinesDelete, useGuidelinesDeleteAssets, useGuidelinesGet, useGuidelinesPost } from "@/service/guidelines";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { USER_ROLE } from "@/constants/app-enum";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LuFileText, LuLoader, LuPlus } from "react-icons/lu";
import { useAppTranslation } from '@/lib/i18n-typed';
import { Button } from '@/components/ui/button';
import { DialogModalForm, ModalFormProps } from '@/components/custom/components';

export const Route = createFileRoute(
  '/_private/csms/guidelines',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? USER_ROLE.contractor.value;
  const [confirmationCreate, setConfirmationCreate] = React.useState<ModalFormProps | null>(null);

  const queryClient = useQueryClient();
  const dataGetQuery = useGuidelinesGet();
  const dataPostMutation = useGuidelinesPost();
  const dataCrudMutation = useGuidelinesCrud();
  const dataDeleteMutation = useGuidelinesDelete();
  const dataDeleteAssetsMutation = useGuidelinesDeleteAssets();

  const [data, setData] = React.useState<any[] | never>([]);

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
    return (dataGetQuery.isPending || dataPostMutation.isPending || dataDeleteMutation.isPending ||
      dataCrudMutation.isPending || dataDeleteAssetsMutation.isPending);
  }

  const onCreateClicked = (body: any) => {
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
          await queryClient.invalidateQueries({ queryKey: ['guidelines-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.guidelines.success.created) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.guidelines.error.createFailed) })
      }
    )
  }

  const onDataUpdated = (id: string, body: any) => {
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
      { id: id, body: formData },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['guidelines-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.guidelines.success.updated) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.guidelines.error.updateFailed) })
      }
    )
  }

  const onSectionDelete = (id: string) => {
    dataDeleteMutation.mutate(
      { id: id },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['guidelines-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.guidelines.success.deleted) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.guidelines.error.deleteFailed) })
      }
    )
  }

  const onDeleteAssets = (body: any) => {
    dataDeleteAssetsMutation.mutate({ body },
      {
        onSuccess: async (response: any) => {
          await queryClient.invalidateQueries({ queryKey: ['guidelines-list'] });
          showNotifSuccess({ message: response?.message || t($ => $.guidelines.success.assetsDeleted) });
        },
        onError: (error: any) => showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.guidelines.error.assetsDeleteFailed) })
      })
  }

  const ViewAddItem = () => {
    return (
      <Button
        variant={"default"}
        onClick={() => onGuidelineDataCreated(t, setConfirmationCreate, onCreateClicked, <FormGuideline />)}
        disabled={isLoading()}
        className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
      >
        {isLoading() ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
        ) : (
          <LuPlus className="mr-2 h-4 w-4" />
        )}
        {t($ => $.guidelines.addGuideline)}
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
              <LuFileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.guidelines.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.guidelines.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {dataGetQuery.isSuccess && (
              <Badge variant="secondary" className="px-3 py-1">
                <LuFileText className="h-3 w-3 mr-1" />
                {data?.length || 0} {t($ => $.guidelines.totalGuidelines)}
              </Badge>
            )}
            {userRole !== USER_ROLE.contractor.value && <ViewAddItem />}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {dataGetQuery.isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <LuFileText className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">{t($ => $.guidelines.errorLoading)}</h3>
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
              <span className="text-muted-foreground">{t($ => $.guidelines.loading)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines Table or List */}
      {dataGetQuery.isSuccess && (
        userRole === USER_ROLE.admin.value ? (
          <CardCustom contentClassName='p-4'>
            <TableGuideline
              data={data}
              loading={isLoading()}
              onCreateClicked={onCreateClicked}
              onSectionDelete={onSectionDelete}
              onDataUpdated={onDataUpdated}
              onDeleteAssets={onDeleteAssets}
              disableAction={userRole === USER_ROLE.contractor.value}
              canCreate={userRole !== USER_ROLE.contractor.value}
            />
          </CardCustom>
        ) : (
          <ListGuideline
            data={data}
            loading={isLoading()}
          />
        )
      )}

      {confirmationCreate && (
        <DialogModalForm
          modal={{
            ...confirmationCreate,
            title: typeof confirmationCreate.title === 'string' ? t(confirmationCreate.title) : confirmationCreate.title,
            desc: typeof confirmationCreate.desc === 'string' ? t(confirmationCreate.desc) : confirmationCreate.desc
          }}
        />
      )}
    </div>
  )
}

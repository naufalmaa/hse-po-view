import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  useReportCrud,
  useReportCrudFiles, useReportCrudWithUpload,
  useReportDeleteFiles,
  useReportGet,
  useReportPatchFiles, useReportSectionDelete
} from "@/service/report";
import { useNavigate } from '@tanstack/react-router'
import { SkeTable } from "@/components/custom/skeleton";
import {
  Step02ProjectTab,
  Step02MarineTab,
  Step01Forms, Step02ProjectForms, Step02MarineForms
} from "@/components/pages/daily-report/create";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useQueryClient } from "@tanstack/react-query";
import { AppRoute } from "@/constants/app-route";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { REPORT_TYPE, USER_ROLE } from "@/constants/app-enum";
import { useSubTypesList } from "@/service/sub-type-api";
import { useVesselGet } from "@/service/vessels-api";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { addDays } from "date-fns";
import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { Edit, Calendar, User, Building, FileType, Activity, ArrowLeft, ArrowRight, CheckCircle, Users } from "lucide-react";
import { tabListProjectReport } from '@/components/pages/daily-report/create/lib/project-template';
import { useAppTranslation } from '@/lib/i18n-typed';
import { isCrewString } from '@/types/auth';

export const Route = createFileRoute(
  '/_private/daily-report/edit',
)({
  validateSearch: (search) => {
    return {
      project_id: search.project_id as string,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? USER_ROLE.contractor.value;

  const { identity, manHours, ...projectTabList } = tabListProjectReport;

  const queryClient = useQueryClient();
  const navigate = useNavigate()
  const { project_id, step } = Route.useSearch()
  const [data, setData] = useState<any>(null);
  const [subTypes, setSubTypes] = useState<any>(null);
  const [vesselList, setVesselList] = useState<any>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  const { data: dataQuery, isError, error, isFetching, isSuccess } = useReportGet(project_id);
  const reportCrudMutation = useReportCrud();
  const reportCrudWithUploadMutation = useReportCrudWithUpload();
  const reportSectionDeleteMutation = useReportSectionDelete();
  const reportCrudFilesMutation = useReportCrudFiles();
  const reportPatchFilesMutation = useReportPatchFiles();
  const reportDeleteFilesMutation = useReportDeleteFiles();
  const pageListSubType = useSubTypesList();
  const pageListVesselQuery = useVesselGet();

  const isLoading = () => {
    return (isFetching || reportCrudMutation.isPending || reportCrudFilesMutation.isPending ||
      reportPatchFilesMutation.isPending || reportDeleteFilesMutation.isPending || pageListSubType.isPending
      // || pageListVesselQuery.isPending || reportCrudWithUploadMutation.isPending || reportSectionDeleteMutation.isPending
    );
  }

  const [stepPosition, setStepPosition] = useState<string>(step === 1 ? "identity" : "laggingIndicator");
  const [stepWizard, setStepWizard] = useState<number>(
    Math.min(3, Math.max(1, Number(step) || 1))
  );

  useEffect(() => {
    if (isSuccess && dataQuery) {
      setData(dataQuery);
    }
  }, [isSuccess, dataQuery]);

  useEffect(() => {
    if (pageListSubType.data) {
      setSubTypes(pageListSubType.data.map((item: any) => ({
        value: item.id,
        label: item.name
      })));
    }
  }, [pageListSubType.isSuccess]);

  useEffect(() => {
    if (pageListVesselQuery.data) {
      setVesselList(pageListVesselQuery.data.map((item: any) => ({
        value: item.id,
        label: item.vesselName,
        personnelCount: item.personnelCount
      })));
    }
  }, [pageListVesselQuery.isSuccess]);

  // Sync with URL changes (e.g. back/forward)
  useEffect(() => {
    const stepNumber = Math.min(2, Math.max(1, Number(step) || 1));
    setStepWizard(stepNumber);

    let stepPos_ = "identity";
    if (stepNumber === 1) {
      stepPos_ = "identity";
    }
    else if (stepNumber === 2) {
      stepPos_ = "laggingIndicator";
      if (getFormType() === REPORT_TYPE.marine.value) {
        if (userRole === USER_ROLE.contractor.value) {
          stepPos_ = "meeting";
        }
      }
    }
    setStepPosition(stepPos_);
  }, [step]);

  const formClassName = "flex flex-col gap-4 justify-center";

  const getStepLabel = () => {
    switch (stepWizard) {
      case 1:
        return t($ => $.dailyReport.edit.stepLabels.identity);
      case 2:
        return t($ => $.dailyReport.edit.stepLabels.parameter);
      default:
        return ""
    }
  }

  const getFormType = () => {
    return (data?.formType ?? "");
  }

  const onSectionDelete = (sectionType: string, sectionId: string) => {
    setConfirmationDelete({
      title: t($ => $.dailyReport.edit.deleteData.title),
      content: <div>{t($ => $.dailyReport.edit.deleteData.content)}</div>,
      textConfirm: t($ => $.dailyReport.edit.deleteData.confirm),
      textCancel: t($ => $.dailyReport.edit.deleteData.cancel),
      onConfirmClick: async () => {
        reportSectionDeleteMutation.mutate(
          { project_id, section_id: sectionId, section_type: sectionType },
          {
            onSuccess: (response: any) => {
              queryClient.invalidateQueries({
                queryKey: ['report-detail', project_id],
                refetchType: 'active',
              });
              const previousData = queryClient.getQueryData(['report-detail', project_id]);
              setData(previousData);
              showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successDeletedSection) });
            },
            onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
          }
        )
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

  const onDataUpdated = (keyBody: string, body: Record<any, any>) => {
    if (keyBody === "completed") {
      const formData = new FormData();
      Object.entries(body).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value))
      });

      reportCrudWithUploadMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            setData(response?.data);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else if (keyBody === "all") {
      const formData = new FormData();
      formData.append(body["key"], JSON.stringify(body["data"]));
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formData.append(file["key"], file["file"]?.file)
      }

      reportCrudWithUploadMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            setData(response?.data);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else if (keyBody === "multipart") {
      let newBody = body?.data;

      const formData = new FormData();

      // update body files and list of files
      formData.append(body["key"], JSON.stringify(newBody));
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formData.append(body?.fileKey[i], file)
      }

      reportCrudWithUploadMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            setData(response?.data);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else if (keyBody === "supportingFilesV1") {
      if (body?.files?.length <= 0) {
        showNotifError({ message: t($ => $.dailyReport.edit.notifications.errorMinOneFile) });
        return
      }

      const formData = new FormData();
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formData.append('files', file?.file?.file);
        formData.append('notes', body?.data?.files[i]?.note ?? "");
        formData.append('section', body?.key ?? "");
      }

      reportCrudFilesMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            // queryClient.invalidateQueries({ queryKey: ['report-detail', project_id] });
            queryClient.invalidateQueries({
              queryKey: ['report-detail', project_id],
              refetchType: 'active',
            });
            const previousData = queryClient.getQueryData(['report-detail', project_id]);
            setData(previousData);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else if (keyBody === "supportingFiles") {
      if (body?.files?.length <= 0) {
        showNotifError({ message: t($ => $.dailyReport.edit.notifications.errorMinOneFile) });
        return
      }

      const formData = new FormData();
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formData.append('files', file?.file?.file);
        formData.append('notes', file?.notes ?? "");
      }
      reportCrudFilesMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            // queryClient.invalidateQueries({ queryKey: ['report-detail', project_id] });
            queryClient.invalidateQueries({
              queryKey: ['report-detail', project_id],
              refetchType: 'active',
            });
            const previousData = queryClient.getQueryData(['report-detail', project_id]);
            setData(previousData);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else if (keyBody === "other") {
      const formData = new FormData();
      Object.entries(body).forEach(([key, value]) => {
        formData.append(key, value);
      });

      reportCrudWithUploadMutation.mutate(
        { project_id, body: formData },
        {
          onSuccess: (response: any) => {
            setData(response?.data);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) });
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
    else {
      const newBody = { [keyBody]: body }
      reportCrudMutation.mutate(
        { project_id, body: newBody },
        {
          onSuccess: (response: any) => {
            setData(response?.data);
            showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedReport) })
          },
          onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
        }
      )
    }
  }

  const onEditAssets = (body: any) => {
    const newBody = { note: body?.notes };
    reportPatchFilesMutation.mutate({ file_id: body?.id, body: newBody },
      {
        onSuccess: (response: any) => {
          queryClient.invalidateQueries({
            queryKey: ['report-detail', project_id],
            refetchType: 'active',
          });
          const previousData = queryClient.getQueryData(['report-detail', project_id]);
          setData(previousData);
          showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successUpdatedAsset) });
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  }

  const onDeleteAssets = (body: any) => {
    reportDeleteFilesMutation.mutate({ body },
      {
        onSuccess: (response: any) => {
          queryClient.invalidateQueries({
            queryKey: ['report-detail', project_id],
            refetchType: 'active',
          });
          const previousData = queryClient.getQueryData(['report-detail', project_id]);
          setData(previousData);

          showNotifSuccess({ message: response?.message || t($ => $.dailyReport.edit.notifications.successDeletedAsset) });
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      })
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.dailyReport.edit.headerTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.dailyReport.edit.headerDescription)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              {t($ => $.dailyReport.edit.reportEditing)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Report Information */}
      {data && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t($ => $.dailyReport.edit.reportInformation)}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t($ => $.dailyReport.edit.currentReportDetails)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300">
              <Calendar className="h-3 w-3 mr-1" />
              {data?.reportDate?.split("T")?.[0]}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300">
              <User className="h-3 w-3 mr-1" />
              {data?.reportedBy}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300">
              <Building className="h-3 w-3 mr-1" />
              {data?.instansi}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300">
              <FileType className="h-3 w-3 mr-1" />
              {data?.formType}
            </Badge>
            {data?.formType === REPORT_TYPE.project.value && (
              <Badge variant="outline" className="px-3 py-1 bg-teal-100 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300">
                <Users className="h-3 w-3 mr-1" />
                {data?.subtypeName}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Error States */}
      {!project_id && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="text-destructive font-medium text-center">{t($ => $.dailyReport.edit.reportNotFound)}</div>
        </div>
      )}

      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="text-destructive font-medium text-center">{error?.message}</div>
        </div>
      )}

      {/* Loading State */}
      {(!data && isFetching) && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <SkeTable />
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className="bg-card rounded-xl shadow-sm border border-border">
          {![REPORT_TYPE.project.value, REPORT_TYPE.marine.value].includes(getFormType()) ? (
            <div className="p-6">
              <div className="text-destructive font-medium text-center">{t($ => $.dailyReport.edit.reportNotFound)}</div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[300px_1fr] grid-cols-1 gap-0">
              {/* Left Sidebar - Navigation */}
              <div className="border-r border-border bg-muted/30 p-4">
                <div className="space-y-6">
                  {/* Navigation Controls */}
                  <div className="flex flex-row justify-between items-center">
                    {stepWizard > 1 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                        disabled={isLoading()}
                        onClick={() => {
                          setStepPosition("identity");
                          setStepWizard(stepWizard - 1);
                          navigate({
                            to: AppRoute.report.dailyReport.edit.url,
                            search: { project_id: project_id, step: stepWizard - 1 }
                          }).then(() => { })
                        }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {t($ => $.dailyReport.edit.navigation.back)}
                      </Button>
                    ) : (
                      <div />
                    )}

                    {stepWizard < 2 ? (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isLoading()}
                        className="bg-primary hover:bg-primary/90 transition-all duration-200"
                        onClick={() => {
                          let new_pos = stepWizard + 1 > 2 ? 2 : stepWizard + 1;
                          if (new_pos === 2) {
                            setStepPosition("laggingIndicator");
                          }
                          setStepWizard(new_pos);
                          navigate({
                            to: AppRoute.report.dailyReport.edit.url,
                            search: { project_id: project_id, step: new_pos }
                          }).then(() => { })
                        }}
                      >
                        {t($ => $.dailyReport.edit.navigation.next)}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 transition-all duration-200"
                        onClick={async () => {
                          if (isCrewString(userRole)) {
                            await navigate({ to: AppRoute.report.dailyReport.list.url })
                          } else {
                            const form_types = data?.formType ?? "";
                            const date_start = data?.reportDate;
                            const date_end = date_to_string(addDays(new Date(date_start), 4), APP_CONFIG.dayFormat);
                            await navigate({ to: AppRoute.report.dailyActivity.summary.url, search: { form_types, date_start, date_end, reset: false } })
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t($ => $.dailyReport.edit.navigation.finish)}
                      </Button>
                    )}
                  </div>

                  {/* Step Indicator */}
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">{t($ => $.dailyReport.edit.stepIndicator, { current: stepWizard, total: 2 })}</div>
                      <div className="font-semibold text-foreground">{getStepLabel()}</div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(stepWizard / 2) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Navigation Tabs */}
                  {stepWizard === 2 && (
                    <div className="space-y-2">
                      {/* <div className="text-sm font-medium text-foreground mb-3">Parameters</div> */}
                      {getFormType() === REPORT_TYPE.project.value && (
                        <Step02ProjectTab tabList={projectTabList} stepPosition={stepPosition} setStepPosition={setStepPosition} />
                      )}
                      {getFormType() === REPORT_TYPE.marine.value && (
                        <Step02MarineTab stepPosition={stepPosition} setStepPosition={setStepPosition} userRole={userRole} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="p-4">
                <div className="space-y-6">
                  {stepWizard === 1 && (
                    <Step01Forms
                      onSubmitClicked={onDataUpdated}
                      className={formClassName}
                      defaultValues={data}
                      stepPosition={stepPosition}
                      loading={isLoading()}
                      disableEditing={true}
                      subTypes={subTypes}
                      userRole={userRole}
                    />
                  )}

                  {stepWizard === 2 && (
                    data?.formType === REPORT_TYPE.project.value ? (
                      <Step02ProjectForms
                        onSubmitClicked={onDataUpdated}
                        className={formClassName}
                        data={data}
                        stepPosition={stepPosition}
                        loading={isLoading()}
                        onEditAssets={onEditAssets}
                        onDeleteAssets={onDeleteAssets}
                        onSectionDelete={onSectionDelete}
                      />
                    ) : (
                      <Step02MarineForms
                        onSubmitClicked={onDataUpdated}
                        className={formClassName}
                        data={data}
                        stepPosition={stepPosition}
                        loading={isLoading()}
                        vesselList={vesselList}
                        onEditAssets={onEditAssets}
                        onDeleteAssets={onDeleteAssets}
                        onSectionDelete={onSectionDelete}
                        userRole={userRole}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
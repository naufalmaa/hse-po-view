import { createFileRoute } from '@tanstack/react-router'
import * as React from "react";
import { useNavigate } from '@tanstack/react-router'
import { useAppTranslation } from '@/lib/i18n-typed';
import { useEmployeeDeleteFiles, useEmployeeDeleteSection, useEmployeePut } from "@/service/employee";
import { useEmployeeDetail, EmployeeDetailData, EmployeeDetailResponse, Certificate } from "@/service/employee/employee-details";
import { Button } from "@/components/ui/button";
import { AppRoute } from "@/constants/app-route";
import {
  GeneralInfo,
  TableBpjs,
  TableCertificate,
  TableContract, TableMcu,
  TableSika,
  TableVaccine,
  SectionPPE,
  SectionOtherHealthAssurance
} from "@/components/pages/employee/detail";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useEffect, useState } from "react";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { useVesselGet } from "@/service/vessels-api";
import { createEmployeeFormData } from "@/components/pages/employee/detail/template/employee";
import { useContractorGet } from "@/service/contractor-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LuUser, LuChevronLeft, LuChevronRight, LuFileText, LuActivity } from "react-icons/lu";
import { useAuth } from '@/hooks/use-auth';
import { isCrew } from '@/types/auth';
import { useSubTypesList } from '@/service/sub-type-api';

export const Route = createFileRoute('/_private/employee/detail')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const disableEditing = isCrew(auth?.user);

  const navigate = useNavigate()
  const [data, setData] = React.useState<EmployeeDetailData | null>(null);

  const [confirmationDelete, setConfirmationDelete] = React.useState<ModalProps | null>(null);
  const [vesselList, setVesselList] = useState<any>(null);

  const { id, category, statusOnDuty } = Route.useSearch()

  const createFilterBodyParams = () => {
    let params: Record<string, any> = {};
    if (category) params['category'] = category.split(',');

    if (statusOnDuty) {
      let statusOnDuty_ = statusOnDuty.split(',');
      params['statusOnDuty'] = statusOnDuty_.map((item: any) => item === 'true');
    }

    return params
  }

  const createDetailsSearchParams = () => {
    return {
      category,
      statusOnDuty
    }
  }
  const employeeDetailMutation = useEmployeeDetail();
  const employeePutMutation = useEmployeePut();
  const employeeDeleteSectionMutation = useEmployeeDeleteSection();
  const employeeDeleteAssetsMutation = useEmployeeDeleteFiles();
  const pageListVesselQuery = useVesselGet();
  const contractorListQuery = useContractorGet();
  const subTypesListQuery = useSubTypesList();
  const [formData, setFormData] = React.useState<any>(createEmployeeFormData(t));

  useEffect(() => {
    employeeDetailMutation.mutate(
      { id, body: { filters: createFilterBodyParams() } },
      {
        onSuccess: (response: EmployeeDetailResponse) => {
          setData(response?.data);
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    )
  }, [id]);

  useEffect(() => {
    if (pageListVesselQuery.data && contractorListQuery.data) {
      const newVesselOptions = pageListVesselQuery.data.map((item: any) => ({
        value: item.id,
        label: item.vesselName,
        personnelCount: item.personnelCount
      }));

      const newSubTypeOptions = contractorListQuery.data.map((item: any) => ({
        value: item.id,
        label: item.name
      }));

      // Use the createEmployeeFormData function with translation
      const employeeFormData = createEmployeeFormData(t);

      setFormData({
        ...employeeFormData,
        form: {
          ...employeeFormData.form,
          vesselId: {
            ...employeeFormData.form.vesselId,
            options: newVesselOptions
          },
          subContractorId: {
            ...employeeFormData.form.subContractorId,
            options: newSubTypeOptions
          },
          projectId: {
            ...employeeFormData.form.projectId,
            options: subTypesListQuery.data
              ? [
                { value: "", label: (t($ => $.employee.detail.noProject)).toUpperCase() },
                ...subTypesListQuery.data.map((item: any) => ({
                  value: item.id,
                  label: item.name
                }))]
              : []
          }
        }
      });
    }
  }, [pageListVesselQuery.data, contractorListQuery.data, subTypesListQuery.data, t]);

  const isLoading = () => {
    return (employeeDetailMutation.isPending || employeePutMutation.isPending || employeeDeleteSectionMutation.isPending || pageListVesselQuery.isPending || contractorListQuery.isPending || subTypesListQuery.isPending);
  }

  const onSectionUpdated = (employeeId: string, body: any) => {
    const formDataQuery = new FormData();

    if (body["key"] === "general") {
      for (const key in body["data"]) {
        formDataQuery.append(key, body["data"][key]);
      }
    } else {
      formDataQuery.append(body["key"], JSON.stringify(body["data"]));
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formDataQuery.append(body?.fileKey[i], file)
      }
    }

    employeePutMutation.mutate(
      { id: employeeId, body: formDataQuery },
      {
        onSuccess: (response: any) => {
          setData(response?.data);
          showNotifSuccess({ message: response?.message || t($ => $.employee.detail.successUpdatedData) });
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    )
  }

  const onSectionDelete = (body: Record<string, any>) => {
    setConfirmationDelete({
      title: t($ => $.employee.detail.deleteSection),
      content: <div>{t($ => $.employee.detail.areYouSureDeleteData)}</div>,
      textConfirm: t($ => $.employee.detail.delete),
      textCancel: t($ => $.employee.detail.cancel),
      onConfirmClick: async () => {
        employeeDeleteSectionMutation.mutate(
          { body },
          {
            onSuccess: (response: any) => {
              showNotifSuccess({ message: response?.message || t($ => $.employee.detail.successDeletedSection) });
              // Refetch employee data since we're using mutation instead of query
              employeeDetailMutation.mutate(
                { id, body: { filters: createFilterBodyParams() } },
                {
                  onSuccess: (response: any) => {
                    setData(response?.data);
                  },
                  onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
                }
              );
            },
            onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
          }
        )
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

  const onDeleteAssets = (body: any) => {
    const newBody = { fileId: body?.ids };
    employeeDeleteAssetsMutation.mutate({ body: newBody },
      {
        onSuccess: () => {
          // Refetch employee data since we're using mutation instead of query
          employeeDetailMutation.mutate(
            { id, body: { filters: createFilterBodyParams() } },
            {
              onSuccess: (response: any) => {
                setData(response?.data);
              },
              onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
            }
          );
          showNotifSuccess({ message: t($ => $.employee.detail.successDeletedAssetFiles) });
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
              <LuUser className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.employee.detail.employeeDetails)}</h1>
              <p className="text-muted-foreground mt-1">
                {data?.employee?.employeeName ? `${t($ => $.employee.detail.viewingProfileFor)} ${data.employee.employeeName}` : t($ => $.employee.detail.employeeInfoAndDocs)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {data && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <LuFileText className="h-3 w-3 mr-1" />
                  {t($ => $.employee.detail.profileDetails)}
                </Badge>
                {data?.employee?.statusOnDuty && (
                  <Badge variant="default" className="px-3 py-1 bg-green-600 hover:bg-green-700">
                    <LuActivity className="h-3 w-3 mr-1" />
                    {t($ => $.employee.detail.onDuty)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {employeeDetailMutation.isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <LuUser className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">{t($ => $.employee.detail.errorLoadingEmployeeDetails)}</h3>
                <p className="text-sm text-destructive/80 mt-1">
                  {employeeDetailMutation.error?.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Controls */}
      {data && (
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex justify-start">
                {data?.navigation?.previous && (
                  <Button
                    variant="outline"
                    onClick={() => navigate({
                      to: AppRoute.employee.detail.url,
                      search: { id: data?.navigation?.previous?.id, ...createDetailsSearchParams() }
                    })}
                    className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                  >
                    <LuChevronLeft className="h-4 w-4 mr-2" />
                    {data?.navigation?.previous?.employeeName}
                  </Button>
                )}
              </div>
              <div className="flex justify-center">
                <Badge variant="outline" className="px-4 py-2">
                  {t($ => $.employee.detail.employeeProfile)}
                </Badge>
              </div>
              <div className="flex justify-end">
                {data?.navigation?.next && (
                  <Button
                    variant="outline"
                    onClick={() => navigate({
                      to: AppRoute.employee.detail.url,
                      search: { id: data?.navigation?.next?.id, ...createDetailsSearchParams() }
                    })}
                    className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                  >
                    {data?.navigation?.next?.employeeName}
                    <LuChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Main Content */}
      {data && (
        <div className="grid lg:grid-cols-[370px_1fr] grid-cols-1 gap-6">
          {/* General Information Sidebar */}
          <div className="space-y-4">
            <Card className="py-0">
              <CardContent className="p-0">
                <GeneralInfo info={data} onUpdateClicked={onSectionUpdated} formData={formData} t={t} disableEditing={disableEditing} />
              </CardContent>
            </Card>
            <SectionPPE info={data} onUpdateClicked={onSectionUpdated} t={t} disableEditing={disableEditing} />
            <SectionOtherHealthAssurance info={data} onUpdateClicked={onSectionUpdated} t={t} disableEditing={disableEditing} />
          </div>

          <div className='flex flex-col gap-4'>
            {/* Document Tables Grid */}
            <div className="grid grid-cols-1 gap-6 pb-5">
              {/* Left Column */}
              <TableBpjs
                employeeId={data?.employee?.id}
                formKey={"bpjs"}
                data={data?.bpjs}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableContract
                employeeId={id}
                formKey={"contracts"}
                data={data?.contracts}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableVaccine
                employeeId={id}
                formKey={"vaccinations"}
                data={data?.vaccinations}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableSika
                employeeId={id}
                formKey={"sika"}
                data={data?.sika}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              {/* Right Column */}
              <TableMcu
                employeeId={id}
                formKey={"mcus"}
                data={data?.mcus}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableCertificate
                employeeId={id}
                title={t($ => $.employee.detail.bssCertificate)}
                formKey={"certificates"}
                data={data?.certificates.filter((cert: Certificate) =>
                  cert.aliases?.toLowerCase().includes("bss") ?? false
                )}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableCertificate
                employeeId={id}
                title={t($ => $.employee.detail.bstCertificate)}
                formKey={"certificates"}
                data={data?.certificates.filter((cert: Certificate) =>
                  cert.aliases?.toLowerCase().includes("bst") ?? false
                )}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />

              <TableCertificate
                employeeId={id}
                title={t($ => $.employee.detail.competencyCertificate)}
                formKey={"certificates"}
                data={data?.certificates.filter((cert: Certificate) => {
                  const nameCheck = !cert.name.toLowerCase().includes("bss") && !cert.name.toLowerCase().includes("bst");
                  const aliasCheck = !(cert.aliases?.toLowerCase().includes("bss") ?? false) && !(cert.aliases?.toLowerCase().includes("bst") ?? false);
                  return nameCheck && aliasCheck;
                })}
                supportingFiles={data?.files}
                onCreateClicked={onSectionUpdated}
                onUpdateClicked={onSectionUpdated}
                onDeleteClicked={onSectionDelete}
                onDeleteAssets={onDeleteAssets}
                disableAction={disableEditing}
              />
            </div>
          </div>
        </div>
      )}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}

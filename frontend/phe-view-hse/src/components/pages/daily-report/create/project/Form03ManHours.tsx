import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "../lib/project-template";
import { Form } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
import { Separator } from "@/components/ui/separator";
import FormSupportedFiles from "./FormSupportedFiles";
import { RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/lib/i18n-typed";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useReportDutyList } from "@/service/report";
import { APP_CONFIG } from "@/constants/config";

type Props = {
  reportId: string;
  formKey: string;
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: Record<string, any>,
  loading: boolean,
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  showAssetFiles?: boolean,
  parentForm?: any,
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode
}

const Form03ManHours = ({
  reportId,
  formKey,
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading,
  defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentForm, showUploadSupportingFiles = true, showSaveButton = true, componentSaveButton
}: Props) => {
  const { t } = useAppTranslation();
  const formData = formList?.manHours;
  const formItems = formData?.form;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({ ...formData?.defaultValue, ...defaultValues });
    }
  }, [defaultValues, parentForm]);

  const onSubmitClicked_ = () => {
    const body = createFormData({ formKey, data: form.getValues(), supportingFiles: [] });
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({ formKey, data: { id: form.getValues().id, reportId: form.getValues().reportId }, supportingFiles: items });
    onSubmitClicked(body);
  }

  const {
    data: reportDutyData,
    isLoading: isReportDutyLoading,
    error: reportDutyError,
    refetch: refetchReportDuty
  } = useReportDutyList({
    reportId: reportId,
    category: 'project',
    page: 0,
    limit: 100,
    options: {
      enabled: false
    }
  });

  const syncDutyStatusList = async () => {
    try {
      const result: Record<string, any> = await refetchReportDuty();
      const personnel = result?.data?.data ?? [];
      const pobPheOses = personnel.filter((item: any) => item?.subContractorId === APP_CONFIG.id.pheOsesId);
      const pobContractor = personnel.length - pobPheOses.length;
      form.setValue("pobPheOses", pobPheOses.length)
      form.setValue("pobContractor", pobContractor)
      showNotifSuccess({ message: result?.data?.message || "Sync successful" });
    } catch (error: any) {
      console.error("Error syncing overstay list", error);
      showNotifError({ message: error?.message || "Error syncing overstay list" });
    }
  }

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
        disabled={loading} showSaveButton={showSaveButton}>
        {componentSaveButton}
      </FormTitle>
      <div className={"flex flex-col gap-4 py-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <div>{
              reportId === "" ? null : <Button variant={"outline"} onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                syncDutyStatusList();
              }}><RefreshCcwIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.syncPersonnel)}</Button>
            }
            </div>
            <div className={"flex flex-col gap-4 p-1"}>
              <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
                <ControlForm form={form} item={formItems?.pobPheOses} disabled={true} />
                <ControlForm form={form} item={formItems?.pobContractor} disabled={true} />
              </div>
              <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
                <ControlForm form={form} item={formItems?.hoursPobPheOses} disabled={loading} />
                <ControlForm form={form} item={formItems?.hoursPobContractor} disabled={loading} />
              </div>
            </div>
          </form>
        </Form>

        {showUploadSupportingFiles && <div className={"flex flex-col gap-2"}>
          <Separator />

          <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
            onSubmitAssets={onSubmitAssetsClicked_}
          />
        </div>}
      </div>
    </div>
  )
}
export default Form03ManHours
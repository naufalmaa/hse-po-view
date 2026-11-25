import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {marineFormList} from "../lib/marine-template";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import {cn} from "@/lib/utils";
import {useEffect} from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import {createFormData} from "@/components/pages/daily-report/create/lib/utils";
import {Separator} from "@/components/ui/separator";
import FormSupportedFiles from "@/components/pages/daily-report/create/project/FormSupportedFiles";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: Record<string, any>,
  loading: boolean,
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  showAssetFiles?: boolean,
  showUploadSupportingFiles?: boolean,
  parentForm?: any,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
}

const Form02Lagging = ({
                         formTitle, formDescription,
                         onBackClick, onSubmitClicked, className, defaultValues, loading,
                         formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                         parentForm, showUploadSupportingFiles = true, showSaveButton = true,
                         componentSaveButton,
                       }: Props) => {
  const formData = marineFormList?.laggingIndicator;
  const formItems = formData?.form;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({...formData?.defaultValue, ...defaultValues});
    }
  }, [defaultValues, parentForm]);

  const onSubmitClicked_ = () => {
    const body = createFormData({formKey, data: form.getValues(), supportingFiles: []});
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({formKey, data: {id: form.getValues().id, reportId: form.getValues().reportId}, supportingFiles: items});
    onSubmitClicked(body);
  }

  const isLaggingFieldsDisabled = loading || form.watch("statusFreeLtaRi");

  // Reset lagging indicator fields to 0 when they are disabled
  useEffect(() => {
    if (isLaggingFieldsDisabled) {
      form.setValue("fatality", 0);
      form.setValue("lti", 0);
      form.setValue("restrictedWorkDayCase", 0);
      form.setValue("medicalTreatmentCase", 0);
      form.setValue("firstAid", 0);
      form.setValue("nearMiss", 0);
      form.setValue("unsafeAction", 0);
      form.setValue("unsafeCondition", 0);
      form.setValue("environmentalDamage", 0);
      form.setValue("propertyDamage", 0);
      form.setValue("recordableIncident", 0);
      form.setValue("nonRecordableIncident", 0);
    }
  }, [isLaggingFieldsDisabled, form]);

  return (
    <div className="flex flex-col gap-4">
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
                 disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <ControlForm form={form} item={formItems?.description} disabled={loading}/>
            <ControlForm form={form} item={formItems?.statusFreeLtaRi} disabled={loading}/>
            {/* <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.freeLtaDays} disabled={loading}/>
              <ControlForm form={form} item={formItems?.freeRiDays} disabled={loading}/>
            </div> */}
            <div className={"grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.fatality} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.lti} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.restrictedWorkDayCase} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.medicalTreatmentCase} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.firstAid} disabled={isLaggingFieldsDisabled}/>
            </div>
            <div className={"grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.nearMiss} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.unsafeAction} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.unsafeCondition} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.environmentalDamage} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.propertyDamage} disabled={isLaggingFieldsDisabled}/>
            </div>
            <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.recordableIncident} disabled={isLaggingFieldsDisabled}/>
              <ControlForm form={form} item={formItems?.nonRecordableIncident} disabled={isLaggingFieldsDisabled}/>
            </div>
            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onSubmitClicked}/>*/}
          </form>
        </Form>
      </div>

      {showUploadSupportingFiles && <div className={"flex flex-col gap-2"}>
        <Separator/>

        <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
                            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
                            onSubmitAssets={onSubmitAssetsClicked_}
        />
      </div>}
    </div>
  )
}
export default Form02Lagging
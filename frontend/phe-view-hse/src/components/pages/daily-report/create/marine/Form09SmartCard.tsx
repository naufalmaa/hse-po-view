import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {marineFormList} from "../lib/marine-template";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import {useEffect} from "react";
import {cn} from "@/lib/utils";
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
  parentForm?: any,
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
  reportDate?: string,
  
};

const Form09SmartCard = ({
                           formTitle, formDescription,
                           onBackClick, onSubmitClicked, className, defaultValues, loading,
                           formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                           showUploadSupportingFiles = true,
                           parentForm, showSaveButton = true, componentSaveButton,
                           reportDate=''
                         }: Props) => {
  const formData = marineFormList?.smartCard;
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
    const body = createFormData({formKey, data: form.getValues(), supportingFiles: {}});
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({formKey, data: {id: form.getValues().id, reportId: form.getValues().reportId}, supportingFiles: items});
    onSubmitClicked(body);
  }

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
            <div>
              <ControlForm form={form} item={formItems?.description} disabled={loading}/>
            </div>
            <div className={"grid md:grid-cols-2 xl:grid-cols-4 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.unsafeAction} disabled={loading}/>
              <ControlForm form={form} item={formItems?.unsafeCondition} disabled={loading}/>
              <ControlForm form={form} item={formItems?.nearMiss} disabled={loading}/>
              <ControlForm form={form} item={formItems?.processSafety} disabled={loading}/>
            </div>
            {/*<div className={"grid md:grid-cols-2 grid-cols-1 gap-4"}>*/}
            {/*  <ControlForm form={form} item={formItems?.todayParticipate} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.todayParticipateRate} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.monthlyParticipate} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.ytdParticipate} disabled={loading}/>*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*  <FormLabel className={""}>{formItems?.nonParticipants?.label}</FormLabel>*/}
            {/*  <TableSmartCardWorker data={form.getValues()?.nonParticipants ?? []}*/}
            {/*                        onDataUpdated={(data: Record<any, any>[]) => {*/}
            {/*                     form.setValue("nonParticipants", data);*/}
            {/*                   }}/>*/}
            {/*</div>*/}

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
          </form>
        </Form>

        <Separator/>

        <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
                            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
                            onSubmitAssets={onSubmitAssetsClicked_}
        />
      </div>
    </div>
  )
}
export default Form09SmartCard
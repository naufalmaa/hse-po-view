import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {formList} from "../lib/project-template";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import {useEffect} from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import {cn} from "@/lib/utils";
import {createFormData} from "@/components/pages/daily-report/create/lib/utils";
import {Separator} from "@/components/ui/separator";
import FormSupportedFiles from "./FormSupportedFiles";

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
  componentSaveButton?: React.ReactNode
}

const Form04Meeting = ({
                         formTitle, formDescription,
                         onBackClick, onSubmitClicked, className, defaultValues, loading,
                         formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                         parentForm, showUploadSupportingFiles = true, showSaveButton = true,
                         componentSaveButton
                       }: Props) => {
  const formData = formList?.meeting;
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

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
                 disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            {/*<ControlForm form={form} item={formItems?.jenisMeeting} disabled={loading}/>*/}
            <ControlForm form={form} item={formItems?.description} disabled={loading}/>
            {/* <div className={"grid grid-cols-1 md:grid-cols-2 gap-4"}>
              <ControlForm form={form} item={formItems?.generalSafety} disabled={loading}/>
              <ControlForm form={form} item={formItems?.safetyCommittee} disabled={loading}/>
            </div>
            <div className={"grid grid-cols-1 md:grid-cols-2 gap-4"}>
              <ControlForm form={form} item={formItems?.preJob} disabled={loading}/>
              <ControlForm form={form} item={formItems?.others} disabled={loading}/>
            </div> */}
            {/* <div className={"grid grid-cols-1 md:grid-cols-2 gap-4"}>
              <ControlForm form={form} item={formItems?.toolbox} disabled={loading}/>
              <ControlForm form={form} item={formItems?.safetyStandDownMeeting} disabled={loading}/> */}
              {/* <ControlForm form={form} item={formItems?.toolboxTalk} disabled={loading}/> */}
              {/* <ControlForm form={form} item={formItems?.managementVisit} disabled={loading}/> */}
              {/* <ControlForm form={form} item={formItems?.learningFromCampaignEvent} disabled={loading}/> */}
            {/* </div> */}
            {/*<div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>*/}
            {/*  <ControlForm form={form} item={formItems?.today} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.monthly} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.ytd} disabled={loading}/>*/}
            {/*</div>*/}

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
          </form>
        </Form>

        {showUploadSupportingFiles && <div className={"flex flex-col gap-2"}>
          <Separator/>

          <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
                              onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
                              onSubmitAssets={onSubmitAssetsClicked_}
          />
        </div>}
      </div>
    </div>
  )
}
export default Form04Meeting
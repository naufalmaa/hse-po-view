import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "../lib/project-template";
import { Form } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import { useEffect } from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { cn } from "@/lib/utils";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
import { Separator } from "@/components/ui/separator";
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

const Form05Drill = ({
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading,
  formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentForm, showUploadSupportingFiles = true, showSaveButton = true,
  componentSaveButton
}: Props) => {
  const formData = formList?.drill;
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
            {/* <div> */}
            <ControlForm form={form} item={formItems?.status} />
            <ControlForm form={form} item={formItems?.description} disabled={loading} />
            {/* </div> */}
            {/* <div className={"grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.fireDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.abandonDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.musteringDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.medievacDrill} disabled={loading}/>
            </div>
            <div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.h2sDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.manOverboardDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.othersDrill} disabled={loading}/>
            </div> */}
            {/*<div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>*/}
            {/*  <ControlForm form={form} item={formItems?.todayDrill} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.monthlyDrill} disabled={loading}/>*/}
            {/*  <ControlForm form={form} item={formItems?.ytdDrill} disabled={loading}/>*/}
            {/*</div>*/}

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
            {/* <div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.collisionDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.dryDrill} disabled={loading}/>
              <ControlForm form={form} item={formItems?.wetDrill} disabled={loading}/>
            </div> */}
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
export default Form05Drill
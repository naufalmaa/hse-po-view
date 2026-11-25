import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {marineFormList} from "../lib/marine-template";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import {cn} from "@/lib/utils";
import {useEffect} from "react";
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
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
}

const Form03ManHours = ({
                          formTitle, formDescription,
                          onBackClick, onSubmitClicked, className, defaultValues, loading,
                          formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                          parentForm, showSaveButton=true, componentSaveButton
                        }: Props) => {
  const formData = marineFormList?.manHours;
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
            <div className={"flex flex-col gap-4 p-1"}>
              <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
                <ControlForm form={form} item={formItems?.pobPheOses} disabled={loading}/>
                <ControlForm form={form} item={formItems?.pobContractor} disabled={loading}/>
              </div>
              {/* <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
                <ControlForm form={form} item={formItems?.hoursPobPheOses} disabled={loading}/>
                <ControlForm form={form} item={formItems?.hoursPobContractor} disabled={loading}/>
              </div> */}
              {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
            </div>
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
export default Form03ManHours
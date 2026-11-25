import {useForm} from "react-hook-form";
import * as React from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import FormSupportedFiles from "@/components/pages/daily-report/create/project/FormSupportedFiles";
import {createFormData} from "@/components/pages/daily-report/create/lib/utils";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string
  defaultValues?: Record<string, any>
  loading: boolean,
  disableEditing?: boolean,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  showSaveButton?: boolean,
  showAssetFiles?: boolean,
  componentSaveButton?: React.ReactNode,
  formKey: string;
}

const Form12UploadFile = ({
                            formKey,
                            formTitle, formDescription,
                            onBackClick, onSubmitClicked, className, defaultValues, loading, disableEditing = false,
                            onEditAssets, onDeleteAssets, showSaveButton = true, showAssetFiles = true,
                            componentSaveButton
                          }: Props) => {

  const form = useForm<any>({
  });

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({formKey: formKey, data: {reportId: form.getValues().reportId}, supportingFiles: items});
    onSubmitClicked(body);
  }

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={()=>{}} disabled={loading} showSaveButton={showSaveButton}>
        {componentSaveButton}
      </FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <FormSupportedFiles defaultValues={defaultValues} onEditAssets={onEditAssets}
                            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
                            onSubmitAssets={onSubmitAssetsClicked_}
        />
      </div>
    </div>
  )
}
export default Form12UploadFile
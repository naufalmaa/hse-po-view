import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
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
  vesselList: any,
  vesselValues?: any,
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void;
  onDeleteAssets: (item: any) => void;
  showAssetFiles?: boolean,
  maxVesselShown?: number,
  parentForm?: any,
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
};

const Form11VesselUnderPnO = ({
                                formTitle, formDescription,
                                onBackClick, onSubmitClicked, className, defaultValues, loading, vesselList,
                                vesselValues,
                                formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                                maxVesselShown = 10, parentForm, showSaveButton = true, componentSaveButton
                              }: Props) => {
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object({
      vesselList: z.array(z.string()).min(0, {message: 'Please select at least one vessel'})
    })),
    defaultValues: {vesselList: []},
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({...defaultValues});
    }
  }, [defaultValues, parentForm]);

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({formKey, data: {id: form.getValues().id, reportId: form.getValues().reportId}, supportingFiles: items});
    onSubmitClicked(body);
  }

  return (
    <div className="flex flex-col gap-4">
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={()=>{}}
                 disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>

      {vesselValues?.length > 0 && (
        <div className="mb-6 bg-card p-2 rounded-lg">
          <div className="flex flex-row flex-wrap gap-2">
            {vesselValues.slice(0, maxVesselShown).map((vessel: any, index: number) => (
              <div key={index} className="border rounded-lg p-2 min-w-0 bg-muted">
                <div className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-[150px] max-w-[150px]">
                  {vessel.vesselName || 'Unnamed Vessel'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Personnel: {vessel.personnelCount || 0}
                </div>
              </div>
            ))}
            {vesselValues.length > maxVesselShown && (
              <div className="border rounded-lg p-2 min-w-0 flex items-center text-sm text-muted-foreground bg-muted">
                +{vesselValues.length - maxVesselShown} more vessel{vesselValues.length - maxVesselShown !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={"flex flex-col gap-4 p-1"}>
        <div className={"flex flex-col gap-4 p-0"}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(()=>{})} className={cn(className, "")} onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}>
              <ControlForm form={form} item={{
                type: "multiselect",
                name: "vesselList",
                label: "Vessel List",
                options: vesselList
              }} disabled={loading}/>
            </form>
          </Form>
        </div>

        <Separator/>
        <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
                            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
                            onSubmitAssets={onSubmitAssetsClicked_}
        />
      </div>
    </div>
  )
}
export default Form11VesselUnderPnO
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {marineFormList} from "../lib/marine-template";
import * as React from "react";
import {useEffect, useState} from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import {Button} from "@/components/ui/button";
import {ClipboardPlusIcon} from "lucide-react/";
import {DialogModal, DialogModalForm, ModalFormProps, ModalProps} from "@/components/custom/components";
import FormMarineInspectionEdit from "./sub/FormMarineInspectionEdit";
import {getSelectedInspectionMarine, INSPECTION_MARINE_TYPE} from "@/constants/app-enum";
import TableMarineInspection from "../components/TableMarineInspection";
import {createFormData} from "@/components/pages/daily-report/create/lib/utils";
import {Separator} from "@/components/ui/separator";
import FormSupportedFiles from "@/components/pages/daily-report/create/project/FormSupportedFiles";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: any[],
  loading: boolean,
  onSectionDelete: (type: string, id: string) => void
  onDeleteAssets: (item: any) => void,
  supportingFiles: any[],
  sortingKey?: string,
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onSubmitAssetsClicked: (obj: Record<any, any>) => void;
  showAssetFiles?: boolean,
  parentForm?: any,
  showSaveButton?: boolean,
  enableEdit?: boolean,
  componentSaveButton?: React.ReactNode
}

const FormMarineInspection = ({
                          formTitle,
                          formDescription,
                          onBackClick,
                          onSubmitClicked,
                          className,
                          defaultValues,
                          loading,
                          showSaveButton = false,
                          onSectionDelete,
                          onDeleteAssets,
                          supportingFiles,
                          sortingKey = "finding",
                          formKey, defaultAssetValues, onEditAssets, onSubmitAssetsClicked, showAssetFiles = true,
                          parentForm, enableEdit = true, componentSaveButton
                        }: Props) => {

  const formData = marineFormList?.inspectionMarine;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    // defaultValues: formData?.defaultValue,
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      try {
        setData(defaultValues.sort((a, b) => a?.[sortingKey].localeCompare(b?.[sortingKey])));
      } catch (e) {
        setData(defaultValues);
      }
    }
  }, [defaultValues]);

  const [data, setData] = useState<any[]>([]);
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  const createBodyParam = (id: string, body: Record<string, any>) => {
    const bodyKey = "inspections";
    const fileKey = "inspection_file_";
    let bodyFiles = [];
    let fileKeys = [];
    let files = [];
    for (let i = 0; i < body?.evidence?.length; i++) {
      bodyFiles.push({file: `${fileKey}${i + 1}`});
      fileKeys.push(`${fileKey}${i + 1}`);
      files.push(body?.evidence[i]?.file?.file);
    }

    let data_: any = {
      type: "field",
      description: body?.description,
      // Set all INSPECTION_MARINE_TYPE keys to 0 first
      ...Object.keys(INSPECTION_MARINE_TYPE).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Record<string, number>),
      files: bodyFiles,
      id: id ?? "",
    }

    // Set the correct inspection type to 1 based on the selected status
    const selectedInspectionKey = Object.keys(INSPECTION_MARINE_TYPE).find(
      key => INSPECTION_MARINE_TYPE[key as keyof typeof INSPECTION_MARINE_TYPE].value === body?.status
    );
    
    if (selectedInspectionKey) {
      data_[selectedInspectionKey] = 1;
    }

    if (id === "") {
      delete data_["id"];
    }

    let body_ = {
      key: bodyKey,
      data: [data_],
      fileKey: fileKeys,
      files: files
    }
    return (body_);
  }

  const onDataCreated = () => {
    setConfirmationCreate({
      title: "Add New Inspection",
      desc: "Please fill the form below to create new inspection.",
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormMarineInspectionEdit/>,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, any>) => {
        onSubmitClicked(createBodyParam("", body));
        setConfirmationCreate(null);
      },
    });
  };

  const onDataUpdated = (obj: any) => {
    setConfirmationPut({
      title: "Update Inspection",
      desc: "Please fill the form below to update the inspection.",
      defaultValue: {
        ...obj,
        status: getSelectedInspectionMarine(obj),
        description: obj?.description ?? "",
      },
      child: formData.form,
      schema: formData.schema,
      content: <FormMarineInspectionEdit/>,
      onCancelClick: () => setConfirmationPut(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam(obj?.id, body));
        setConfirmationPut(null);
      },
    });
  };

  const onSubmitClicked_ = (body: any) => {
    const body_ = createFormData({formKey, data: {}, supportingFiles: body});
    onSubmitAssetsClicked(body_);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({formKey, data: {reportId: form.getValues().reportId}, supportingFiles: items});
    onSubmitAssetsClicked(body);
  }

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked}
                 disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <div className={"flex flex-col gap-2"}>
          {enableEdit && <div>
            <Button variant={"outline"} onClick={onDataCreated}><ClipboardPlusIcon/> Add Inspection</Button>
          </div>}

          <TableMarineInspection data={data} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
                           supportingFiles={supportingFiles}
                           onDataUpdated={onDataUpdated} enableEdit={enableEdit}/>
        </div>
      </div>

      {confirmationCreate && <DialogModalForm modal={confirmationCreate}/>}
      {confirmationPut && <DialogModalForm modal={confirmationPut}/>}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"}/>}
    </div>
  )
}
export default FormMarineInspection
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
import FormInspectionEdit from "./sub/FormInspectionEdit";
import {getSelectedInspection, INSPECTION_TYPE} from "@/constants/app-enum";
import TableInspection from "../components/TableInspection";
import {createFormData} from "@/components/pages/daily-report/create/lib/utils";
import {date_to_string} from "@/lib/my-utils";
import {APP_CONFIG} from "@/constants/config";
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
  showSaveButton?: boolean,
  onSectionDelete: (type: string, id: string) => void
  onDeleteAssets: (item: any) => void,
  supportingFiles: any[],
  sortingKey?: string,
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onSubmitAssetsClicked: (obj: Record<any, any>) => void;
  showAssetFiles?: boolean,
  componentSaveButton?: React.ReactNode
}

const FormPreInspection = ({
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
                             componentSaveButton
                           }: Props) => {

  const formData = marineFormList?.inspection;
  const form = useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    // defaultValues: formData?.defaultValue,
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      setData(defaultValues.sort((a, b) => a?.[sortingKey].localeCompare(b?.[sortingKey])));
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
      type: "pre_use",
      finding: body?.finding,
      description: body?.description,
      followUp: body?.followUp,
      deadline: date_to_string(body?.deadline, APP_CONFIG.dayFormat),
      openFinding: body?.status === INSPECTION_TYPE.openFinding.value ? 1 : 0,
      closeFinding: body?.status === INSPECTION_TYPE.closeFinding.value ? 1 : 0,
      // outstandingFinding: body?.status === INSPECTION_TYPE.outstandingFinding.value ? 1 : 0,
      // noIssue: body?.status === INSPECTION_TYPE.noIssue.value ? 1 : 0,
      files: bodyFiles,
      id: id ?? "",
      inspection: body?.inspection ?? 0,
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
      title: "Add New Pre-Inspection",
      desc: "Please fill the form below to create new pre-inspection.",
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormInspectionEdit/>,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, any>) => {
        onSubmitClicked(createBodyParam("", body));
        setConfirmationCreate(null);
      },
    });
  };

  const onDataUpdated = (obj: any) => {
    setConfirmationPut({
      title: "Update Pre-Inspection",
      desc: "Please fill the form below to update the pre-inspection.",
      defaultValue: {
        ...obj,
        deadline: new Date(obj?.deadline) ?? new Date(),
        status: getSelectedInspection(obj),
        description: obj?.description ?? "",
        followUp: obj?.followUp ?? "",
        inspection: obj?.inspection ?? 0,
      },
      child: formData.form,
      schema: formData.schema,
      content: <FormInspectionEdit/>,
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
          <div>
            <Button variant={"outline"} onClick={onDataCreated}><ClipboardPlusIcon/> Add Pre-Inspection</Button>
          </div>

          <TableInspection data={data} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
                           supportingFiles={supportingFiles}
                           onDataUpdated={onDataUpdated}/>
        </div>
      </div>

      {confirmationCreate && <DialogModalForm modal={confirmationCreate}/>}
      {confirmationPut && <DialogModalForm modal={confirmationPut}/>}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"}/>}
    </div>
  )
}
export default FormPreInspection
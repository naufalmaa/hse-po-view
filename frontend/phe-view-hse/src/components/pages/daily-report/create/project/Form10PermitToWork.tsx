import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "../lib/project-template";
import * as React from "react";
import { useEffect, useState } from "react";
import FormTitle from "../components/FormTitle";
import { Button } from "@/components/ui/button";
import { ClipboardPlusIcon } from "lucide-react/";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import TablePermitToWork from "../components/TablePermitToWork";
import { getSelectedPermitToWork, PERMIT_TO_WORK_TYPE } from "@/constants/app-enum";
import FormPermitToWorkEdit from "./sub/FormPermitToWorkEdit";
import { date_to_string, string_to_date } from "@/lib/my-utils";

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

const Form10PermitToWork = ({
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
  sortingKey = "description",
  formKey, defaultAssetValues, onEditAssets, onSubmitAssetsClicked, showAssetFiles = true,
  parentForm, enableEdit = true,
  componentSaveButton
}: Props) => {

  const formData = formList?.permitToWork;

  const form = useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    // defaultValues: formData?.defaultValue,
  });

  const [data, setData] = useState<any[]>([]);
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  useEffect(() => {
    if (defaultValues) {
      try {
        setData(defaultValues.sort((a, b) => a?.[sortingKey].localeCompare(b?.[sortingKey])));
      }
      catch (e) {
        setData(defaultValues);
      }
    }
  }, [defaultValues]);

  const createBodyParam = (id: string, body: Record<string, any>) => {
    const bodyKey = "permit";
    const fileKey = "permit_file_";
    let bodyFiles = [];
    let fileKeys = [];
    let files = [];
    
    // Handle evidence files if they exist
    for (let i = 0; i < body?.evidence?.length; i++) {
      bodyFiles.push({ file: `${fileKey}${i + 1}` });
      fileKeys.push(`${fileKey}${i + 1}`);
      files.push(body?.evidence[i]?.file?.file);
    }
    
    let data_: any = {
      description: body?.description,
      openDate: date_to_string(body?.openDate),
      noPTW: body?.noPTW,
      location: body?.location,
      RA_JSA: body?.RA_JSA,
      performingAuthority: body?.performingAuthority,
      siteController: body?.siteController,
      // Set all PERMIT_TO_WORK_TYPE keys to 0 first
      ...Object.keys(PERMIT_TO_WORK_TYPE).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Record<string, number>),
      files: bodyFiles,
      id: id ?? ""
    }

    // Set the correct permit to work type to 1 based on the selected status
    const selectedPermitToWorkKey = Object.keys(PERMIT_TO_WORK_TYPE).find(
      key => PERMIT_TO_WORK_TYPE[key as keyof typeof PERMIT_TO_WORK_TYPE].value === body?.status
    );
    
    if (selectedPermitToWorkKey) {
      data_[selectedPermitToWorkKey] = 1;
    }
    
    // Remove the status field as it's not needed in the final data
    delete data_["status"];

    if (id === "") {
      delete data_["id"];
    }

    let body_ = {
      key: bodyKey,
      data: data_,
      fileKey: fileKeys,
      files: files
    }
    return (body_);
  }

  const onDataCreated = () => {
    setConfirmationCreate({
      title: "Add New Permit To Work",
      desc: "Please fill the form below to create new permit to work.",
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormPermitToWorkEdit 
        onEditAssets={onEditAssets}
        onDeleteAssets={onDeleteAssets}
        onSubmitAssets={onSubmitAssetsClicked}
      />,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam("", body));
        setConfirmationCreate(null);
      },
    });
  };

  const onDataUpdated = (obj: any) => {
    setConfirmationPut({
      title: "Update Permit To Work",
      desc: "Please fill the form below to update the permit to work.",
      defaultValue: {
        id: obj?.id ?? "",
        status: getSelectedPermitToWork(obj),
        description: obj?.description ?? "",
        openDate: obj?.openDate ? string_to_date(obj?.openDate) : new Date(),
        noPTW: obj.noPTW ?? "",
        location: obj?.location ?? "",
        RA_JSA: obj?.RA_JSA ?? "",
        performingAuthority: obj?.performingAuthority ?? "",
        siteController: obj?.siteController ?? "",
      },
      child: formData.form,
      schema: formData.schema,
      content: <FormPermitToWorkEdit 
        onEditAssets={onEditAssets}
        onDeleteAssets={onDeleteAssets}
        onSubmitAssets={onSubmitAssetsClicked}
      />,
      onCancelClick: () => setConfirmationPut(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam(obj?.id, body));
        setConfirmationPut(null);
      },
    });
  };

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked}
        disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <div className={"flex flex-col gap-1"}>
          <div>
            <Button variant={"outline"} onClick={onDataCreated}><ClipboardPlusIcon /> Add Permit To Work</Button>
          </div>
          <TablePermitToWork data={data} deleteKey={formKey || "permit"} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={supportingFiles}
            onDataUpdated={onDataUpdated}/>
        </div>
      </div>

      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
export default Form10PermitToWork
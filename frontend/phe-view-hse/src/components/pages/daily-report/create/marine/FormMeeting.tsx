import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { marineFormList } from "../lib/marine-template";
import * as React from "react";
import { useEffect, useState } from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { Button } from "@/components/ui/button";
import { ClipboardPlusIcon } from "lucide-react/";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import FormMeetingEdit from "./sub/FormMeetingEdit";
import TableMeeting from "../components/TableMeeting";
import { getSelectedMeeting, MEETING_TYPE } from "@/constants/app-enum";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";

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
  showAssetFiles?: boolean
}

const FormMeeting = ({
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
  formKey, defaultAssetValues, onEditAssets, onSubmitAssetsClicked, showAssetFiles = true
}: Props) => {

  const formData = marineFormList?.meeting;
  const form = useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    // defaultValues: formData?.defaultValue,
  });

  const [data, setData] = useState<any[]>([]);
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

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

  const createBodyParam = (id: string, body: Record<string, any>) => {
    const bodyKey = "meeting";
    const fileKey = "meeting_file_";
    let bodyFiles = [];
    let fileKeys = [];
    let files = [];
    for (let i = 0; i < body?.evidence?.length; i++) {
      bodyFiles.push({ file: `${fileKey}${i + 1}` });
      fileKeys.push(`${fileKey}${i + 1}`);
      files.push(body?.evidence[i]?.file?.file);
    }
    let data_: any = {
      description: body?.description,
      absencePercentage: body?.absencePercentage,
      // Set all MEETING_TYPE keys to 0 first
      ...Object.keys(MEETING_TYPE).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Record<string, number>),
      files: bodyFiles,
      id: id ?? "",
    }

    // Set the correct meeting type to 1 based on the selected status
    const selectedMeetingKey = Object.keys(MEETING_TYPE).find(
      key => MEETING_TYPE[key as keyof typeof MEETING_TYPE].value === body?.status
    );
    
    if (selectedMeetingKey) {
      data_[selectedMeetingKey] = 1;
    }

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
      title: "Add New Meeting",
      desc: "Please fill the form below to create new meeting.",
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormMeetingEdit />,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam("", body));
        setConfirmationCreate(null);
      },
    });
  };

  const onDataUpdated = (obj: any) => {
    setConfirmationPut({
      title: "Update Meeting",
      desc: "Please fill the form below to update the meeting.",
      defaultValue: {
        ...obj,
        status: getSelectedMeeting(obj),
      },
      child: formData.form,
      schema: formData.schema,
      content: <FormMeetingEdit />,
      onCancelClick: () => setConfirmationPut(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam(obj?.id, body));
        setConfirmationPut(null);
      },
    });
  };

  const onSubmitClicked_ = (body: any) => {
    const body_ = createFormData({ formKey, data: {}, supportingFiles: body });
    onSubmitAssetsClicked(body_);
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked}
        disabled={loading} showSaveButton={showSaveButton} />
      <div className={"flex flex-col gap-2"}>
        <div>
          <Button variant={"outline"} onClick={onDataCreated}><ClipboardPlusIcon /> Add Meeting</Button>
        </div>
        <TableMeeting data={data} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
          supportingFiles={supportingFiles}
          onDataUpdated={onDataUpdated} />
      </div>

      {/*{showAssetFiles &&*/}
      {/*  <Form12UploadFile*/}
      {/*    formTitle={"Meeting Supporting Files"}*/}
      {/*    formDescription={"Meeting Supporting Files List"}*/}
      {/*    onSubmitClicked={onSubmitClicked_}*/}
      {/*    className={className}*/}
      {/*    defaultValues={defaultAssetValues}*/}
      {/*    loading={loading}*/}
      {/*    disableEditing={false}*/}
      {/*    onEditAssets={onEditAssets}*/}
      {/*    onDeleteAssets={onDeleteAssets}*/}
      {/*    showSaveButton={true}*/}
      {/*    showAssetFiles={true}*/}
      {/*  />}*/}

      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}
export default FormMeeting
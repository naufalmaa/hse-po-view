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
import FormDrillEdit from "./sub/FormDrillEdit";
import TableDrill from "../components/TableDrill";
import {DRILL_TYPE, getDrillTypeFrom, getSelectedDrill} from "@/constants/app-enum";

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
  category: string,
  componentSaveButton?: React.ReactNode
}

const FormDrill = ({
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
                     category="project",
                     componentSaveButton
                     }: Props) => {
  const formData = {
    ...marineFormList?.drill,
    form: {
      ...marineFormList?.drill.form,
      status: {
        ...marineFormList?.drill.form.status,
        options: Object.values(getDrillTypeFrom(category))
      }
    }
  };
  
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
    const bodyKey = "drill";
    const fileKey = "drill_file_";
    let bodyFiles = [];
    let fileKeys = [];
    let files = [];
    for (let i = 0; i < body?.evidence?.length; i++) {
      bodyFiles.push({file: `${fileKey}${i + 1}`});
      fileKeys.push(`${fileKey}${i + 1}`);
      files.push(body?.evidence[i]?.file?.file);
    }
    let data_: any = {
      description: body?.description,
      totalParticipants: body?.totalParticipants,
      // Set all DRILL_TYPE keys to 0 first
      ...Object.keys(DRILL_TYPE).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Record<string, number>),
      files: bodyFiles,
      id: id ?? ""
    }

    // Set the correct drill type to 1 based on the selected status
    const selectedDrillKey = Object.keys(DRILL_TYPE).find(
      key => DRILL_TYPE[key as keyof typeof DRILL_TYPE].value === body?.status
    );
    
    if (selectedDrillKey) {
      data_[selectedDrillKey] = 1;
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
      title: "Add New Drill",
      desc: "Please fill the form below to create new drill events.",
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormDrillEdit/>,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitClicked(createBodyParam("", body));
        setConfirmationCreate(null);
      },
    });
  };

  const onDataUpdated = (obj: any) => {
    setConfirmationPut({
      title: "Update Drill",
      desc: "Please fill the form below to update the drill.",
      defaultValue: {
        ...obj,
        status: getSelectedDrill(obj),
      },
      child: formData.form,
      schema: formData.schema,
      content: <FormDrillEdit/>,
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
            <Button variant={"outline"} onClick={onDataCreated}><ClipboardPlusIcon/> Add Drill</Button>
          </div>
          <TableDrill data={data} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
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
export default FormDrill
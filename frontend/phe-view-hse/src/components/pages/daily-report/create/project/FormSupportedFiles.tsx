import * as React from "react";
import TableAssetFiles from "../components/TableAssetFiles";
import {Button} from "@/components/ui/button";
import {PlusIcon} from "lucide-react";
import {z} from "zod";
import {DialogModalForm, ModalFormProps} from "@/components/custom/components";
import {useState} from "react";
import {ControlForm} from "@/components/custom/forms";

type UploadFileProps = {
  values?: any,
  form?: any,
  files?: Array<any> | [],
  onDeleteAssets?: (item: any) => void,
}
const FormUploadFile = ({values, form}: UploadFileProps) => {
  return (
    <div>
      <ControlForm form={form} item={values?.evidence}/>
    </div>
  )
}

type Props = {
  defaultValues?: any,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  onSubmitAssets: (item: any) => void,
  showAssetFiles?: boolean,
}

const FormSupportedFiles = ({
                              defaultValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
                              onSubmitAssets
                            }: Props) => {
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const formSchema = {
    form: {
      evidence: {
        type: "upload",
        name: "evidence",
        label: "",
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      }
    },
    schema: {
      evidence: z.array(z.any()).min(0, "Supporting file must be filled")
    },
    defaultValue: {
      evidence: []
    }
  }

  const onUploadFiles = () => {
    setConfirmationPut({
      title: "Add Assets",
      desc: "Please fill the form below to add assets file.",
      defaultValue: formSchema.defaultValue,
      child: formSchema.form,
      schema: formSchema.schema,
      content: <FormUploadFile/>,
      onCancelClick: () => setConfirmationPut(null),
      onConfirmClick: (body: Record<string, string>) => {
        onSubmitAssets({files: body?.evidence ?? []});
        setConfirmationPut(null);
      },
    })
  }
  return (
    <div>
      {showAssetFiles &&
        <div className={"flex flex-col gap-1 mt-2"}>
          <div className={"font-bold"}>Assets Files</div>
          <TableAssetFiles data={defaultValues ?? []}
                           onEditAssets={onEditAssets}
                           onDeleteAssets={onDeleteAssets}
                           toolbar={
                             <div>
                               <Button variant="outline" size="sm" onClick={() => {
                                 onUploadFiles();
                               }}>
                                 <PlusIcon
                                   className="-ms-0.5 size-3.5 opacity-60"
                                   aria-hidden="true"
                                 />
                                 Add files
                               </Button>
                             </div>
                           }
          />
        </div>
      }

      {confirmationPut && <DialogModalForm modal={confirmationPut}/>}
    </div>
  )
}
export default FormSupportedFiles
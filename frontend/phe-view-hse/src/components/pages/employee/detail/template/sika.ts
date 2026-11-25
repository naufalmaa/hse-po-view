import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { SIKE_CERT_TYPE } from "@/constants/app-enum";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create SIKA form data with translations
const createSikaFormData = (t: AppTranslation) => {
  return {
    form: {
      status: {
        type: "text",
        name: "status",
        label: t($ => $.employee.sika.form.status.label),
        placeholder: "",
      },
      expiredDate: {
        type: "date",
        name: "expiredDate",
        label: t($ => $.employee.sika.form.expiredDate.label),
        placeholder: "",
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.sika.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      },
      type: {
        type: "select",
        name: "type",
        label: t($ => $.employee.sika.form.type.label),
        options: Object.values(SIKE_CERT_TYPE)
      }
    },
    schema: {
      status: z.string().min(1, { message: t($ => $.employee.sika.form.status.required) }),
      expiredDate: z.date(),
      evidence: z.array(z.any()),
      type: z.string().min(1, { message: t($ => $.employee.sika.form.type.required) })
    },
    defaultValue: {
      status: "",
      expiredDate: new Date(),
      evidence: [],
      type: ""
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "sika";
  const bodyKey = formKey;
  const fileKey = `${formKey}_file_`;
  let bodyFiles = [];
  let fileKeys = [];
  let files = [];
  for (let i = 0; i < body?.evidence?.length; i++) {
    bodyFiles.push({ file: `${fileKey}${i + 1}` });
    fileKeys.push(`${fileKey}${i + 1}`);
    files.push(body?.evidence[i]?.file?.file);
  }
  let data_: any = {
    status: body?.status,
    expiredDate: date_to_string(body?.expiredDate, APP_CONFIG.dayFormat),
    type: body?.type,
    files: bodyFiles,
    id: id ?? ""
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

const onSikaDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormSika: any
) => {
  const formData = createSikaFormData(t);
  
  setConfirmationCreate({
    title: t($ => $.employee.sika.form.create.title),
    desc: t($ => $.employee.sika.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormSika,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onSikaDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormSika: any
) => {
  const formData = createSikaFormData(t);
  
  setConfirmationPut({
    title: t($ => $.employee.sika.form.update.title),
    desc: t($ => $.employee.sika.form.update.description),
    defaultValue: {
      ...obj,
      expiredDate: new Date(obj?.expiredDate) ?? new Date(),
      evidence: []
    },
    child: formData.form,
    schema: formData.schema,
    content: FormSika,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createSikaFormData, createBodyParam, onSikaDataCreated, onSikaDataUpdated };
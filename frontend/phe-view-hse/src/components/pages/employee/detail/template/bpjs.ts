import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { BPJS_TYPE } from "@/constants/app-enum";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create BPJS form data with translations
const createBpjsFormData = (t: AppTranslation) => {
  return {
    form: {
      type: {
        type: "select",
        name: "type",
        label: t($ => $.employee.bpjs.form.type.label),
        placeholder: t($ => $.employee.bpjs.form.type.placeholder),
        options: Object.values(BPJS_TYPE)
      },
      number: {
        type: "text",
        name: "number",
        label: t($ => $.employee.bpjs.form.number.label),
        placeholder: t($ => $.employee.bpjs.form.number.placeholder),
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.bpjs.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      }
    },
    schema: {
      type: z.string().min(1, t($ => $.employee.bpjs.form.type.required)),
      number: z.string().min(1, t($ => $.employee.bpjs.form.number.required)),
      evidence: z.array(z.any()).min(0, t($ => $.employee.bpjs.form.evidence.required))
    },
    defaultValue: {
      type: "",
      number: "",
      evidence: []
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = 'bpjs';
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
    bpjsEmployment: body?.type === "BPJS Ketenagakerjaan" ? body?.number : "",
    bpjsHealth: body?.type === "BPJS Kesehatan" ? body?.number : "",
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
};

const onBpjsDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormBpjs: any
) => {
  const formData = createBpjsFormData(t);
  
  setConfirmationCreate({
    title: t($ => $.employee.bpjs.form.create.title),
    desc: t($ => $.employee.bpjs.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormBpjs,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onBpjsDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormBpjs: any
) => {
  const formData = createBpjsFormData(t);
  
  setConfirmationPut({
    title: t($ => $.employee.bpjs.form.update.title),
    desc: t($ => $.employee.bpjs.form.update.description),
    defaultValue: {
      ...obj,
      type: obj?.bpjsEmployment === "" ? BPJS_TYPE.kesehatan.value : BPJS_TYPE.ketenagakerjaan.value,
      number: obj?.bpjsEmployment === "" ? obj?.bpjsHealth : obj?.bpjsEmployment,
      evidence: []
    },
    child: formData.form,
    schema: formData.schema,
    content: FormBpjs,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createBpjsFormData, createBodyParam, onBpjsDataCreated, onBpjsDataUpdated };
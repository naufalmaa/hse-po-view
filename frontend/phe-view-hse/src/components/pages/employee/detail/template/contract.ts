import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create contract form data with translations
const createContractFormData = (t: AppTranslation) => {
  return {
    form: {
      // type: {
      //   type: "select",
      //   name: "type",
      //   label: t($ => $.employee.contract.form.type.label),
      //   placeholder: t($ => $.employee.contract.form.type.placeholder),
      //   options: Object.values(BPJS_TYPE)
      // },
      contractCode: {
        type: "text",
        name: "contractCode",
        label: t($ => $.employee.contract.form.contractCode.label),
        placeholder: "",
      },
      expiredDate: {
        type: "date",
        name: "expiredDate",
        label: t($ => $.employee.contract.form.expiredDate.label),
        placeholder: "",
      },
      // expiredDateCompany: {
      //   type: "date",
      //   name: "expiredDateCompany",
      //   label: t($ => $.employee.contract.form.expiredDateCompany.label),
      //   placeholder: "",
      // },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.contract.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      }
    },
    schema: {
      contractCode: z.string().min(1, t($ => $.employee.contract.form.contractCode.required)),
      expiredDate: z.date(),
      // expiredDateCompany: z.date(),
      evidence: z.array(z.any())
    },
    defaultValue: {
      contractCode: "",
      expiredDate: new Date(),
      // expiredDateCompany: new Date(),
      evidence: []
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "contract";
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
    contractCode: body?.contractCode,
    expiredDate: date_to_string(body?.expiredDate, APP_CONFIG.dayFormat),
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

const onContractDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormContract: any
) => {
  const formData = createContractFormData(t);
  
  setConfirmationCreate({
    title: t($ => $.employee.contract.form.create.title),
    desc: t($ => $.employee.contract.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormContract,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onContractDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormContract: any
) => {
  const formData = createContractFormData(t);
  
  setConfirmationPut({
    title: t($ => $.employee.contract.form.update.title),
    desc: t($ => $.employee.contract.form.update.description),
    defaultValue: {
      ...obj,
      expiredDate: new Date(obj?.expiredDate) ?? new Date(),
      evidence: []
    },
    child: formData.form,
    schema: formData.schema,
    content: FormContract,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createContractFormData, createBodyParam, onContractDataCreated, onContractDataUpdated };
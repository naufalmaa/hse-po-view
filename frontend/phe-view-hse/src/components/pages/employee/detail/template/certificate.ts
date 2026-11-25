import { date_to_string, string_to_date } from "@/lib/my-utils";
import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { APP_CONFIG } from "@/constants/config";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create certificate form data with translations
const createCertificateFormData = (t: AppTranslation) => {
  return {
    form: {
      name: {
        type: "text",
        name: "name",
        label: t($ => $.employee.certificate.form.name.label),
        placeholder: "",
      },
      // status: {
      //     type: "text",
      //     name: "status",
      //     label: t($ => $.employee.certificate.form.status.label),
      //     placeholder: "",
      // },
      expiredDate: {
        type: "date",
        name: "expiredDate",
        label: t($ => $.employee.certificate.form.expiredDate.label),
        placeholder: "",
      },
      isPermanent: {
        type: "switch",
        name: "isPermanent",
        label: t($ => $.employee.certificate.form.isPermanent.label),
        placeholder: "",
      },

      // lastValidatedAt: {
      //   type: "date",
      //   name: "lastValidatedAt",
      //   label: t($ => $.employee.certificate.form.lastValidatedAt.label),
      //   placeholder: "",
      // },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.certificate.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      }
    },
    schema: {
      name: z.string().min(1, t($ => $.employee.certificate.form.name.required)),
      // status: z.string().min(1, t($ => $.employee.certificate.form.status.required)),
      expiredDate: z.date().optional(),
      // lastValidatedAt: z.date(),
      evidence: z.array(z.any()).optional(),
      isPermanent: z.boolean().optional(),
    },
    defaultValue: {
      name: "",
      // status: "",
      expiredDate: new Date(),
      // lastValidatedAt: new Date(),
      evidence: [],
      isPermanent: false,
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "certificates";
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
    name: body?.name,
    // status: body?.status,
    expiredDate: date_to_string(body?.expiredDate, APP_CONFIG.dayFormat),
    // lastValidatedAt: date_to_string(body?.lastValidatedAt, APP_CONFIG.dayFormat),
    files: bodyFiles,
    id: id ?? "",
    isPermanent: body?.isPermanent,
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

const onCertificateDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormCertificate: any
) => {
  const formData = createCertificateFormData(t);

  setConfirmationCreate({
    title: t($ => $.employee.certificate.form.create.title),
    desc: t($ => $.employee.certificate.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormCertificate,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onCertificateDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormCertificate: any
) => {
  const formData = createCertificateFormData(t);

  setConfirmationPut({
    title: t($ => $.employee.certificate.form.update.title),
    desc: t($ => $.employee.certificate.form.update.description),
    defaultValue: {
      ...obj,
      expiredDate: string_to_date(obj?.expiredDate) ?? new Date(),
      // lastValidatedAt: new Date(obj?.lastValidatedAt) ?? new Date(),
    },
    child: formData.form,
    schema: formData.schema,
    content: FormCertificate,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createCertificateFormData, createBodyParam, onCertificateDataCreated, onCertificateDataUpdated };
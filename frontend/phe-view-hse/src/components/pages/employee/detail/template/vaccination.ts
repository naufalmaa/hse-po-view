import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create vaccination form data with translations
const createVaccinationFormData = (t: AppTranslation) => {
  return {
    form: {
      vaccineStatus: {
        type: "text",
        name: "vaccineStatus",
        label: t($ => $.employee.vaccination.form.vaccineStatus.label),
        placeholder: "",
      },
      vaccineDate: {
        type: "date",
        name: "vaccineDate",
        label: t($ => $.employee.vaccination.form.vaccineDate.label),
        placeholder: "",
      },
      // expiredDateCompany: {
      //   type: "date",
      //   name: "expiredDateCompany",
      //   label: t($ => $.employee.vaccination.form.expiredDateCompany.label),
      //   placeholder: "",
      // },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.vaccination.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      }
    },
    schema: {
      vaccineStatus: z.string().min(1, { message: t($ => $.employee.vaccination.form.vaccineStatus.required) }),
      vaccineDate: z.date(),
      // expiredDateCompany: z.date(),
      evidence: z.array(z.any())
    },
    defaultValue: {
      vaccineStatus: "",
      vaccineDate: new Date(),
      // expiredDateCompany: new Date(),
      evidence: []
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "vaccination";
  const bodyKey = formKey;
  const fileKey = `${formKey}_file_`;
  let bodyFiles = [];
  let fileKeys = [];
  let files = [];
  for (let i = 0; i < body?.evidence?.length; i++) {
    bodyFiles.push({file: `${fileKey}${i + 1}`});
    fileKeys.push(`${fileKey}${i + 1}`);
    files.push(body?.evidence[i]?.file?.file);
  }
  let data_: any = {
    vaccineStatus: body?.vaccineStatus,
    vaccineDate: date_to_string(body?.vaccineDate, APP_CONFIG.dayFormat),
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

const onVaccinationDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormVaccine: any
) => {
  const formData = createVaccinationFormData(t);
  
  setConfirmationCreate({
    title: t($ => $.employee.vaccination.form.create.title),
    desc: t($ => $.employee.vaccination.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormVaccine,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onVaccinationDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormVaccine: any
) => {
  const formData = createVaccinationFormData(t);
  
  setConfirmationPut({
    title: t($ => $.employee.vaccination.form.update.title),
    desc: t($ => $.employee.vaccination.form.update.description),
    defaultValue: {
      ...obj,
      vaccineDate: new Date(obj?.vaccineDate) ?? new Date(),
      evidence: []
    },
    child: formData.form,
    schema: formData.schema,
    content: FormVaccine,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createVaccinationFormData, createBodyParam, onVaccinationDataCreated, onVaccinationDataUpdated };
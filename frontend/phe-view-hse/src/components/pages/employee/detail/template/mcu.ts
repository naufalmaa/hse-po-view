import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { z } from "zod"
import { ModalFormProps } from "@/components/custom/components";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create MCU form data with translations
const createMcuFormData = (t: AppTranslation) => {
  return {
    form: {
      mcuHospitalName: {
        type: "text",
        name: "mcuHospitalName",
        label: t($ => $.employee.mcu.form.mcuHospitalName.label),
        placeholder: "",
      },
      mcuDeviationNotes: {
        type: "textarea",
        name: "mcuDeviationNotes",
        label: t($ => $.employee.mcu.form.mcuDeviationNotes.label),
        placeholder: "",
      },
      mcuFollowUp: {
        type: "text",
        name: "mcuFollowUp",
        label: t($ => $.employee.mcu.form.mcuFollowUp.label),
        placeholder: "",
      },
      ohihReview: {
        type: "select",
        name: "ohihReview",
        label: t($ => $.employee.mcu.form.ohihReview.label),
        options: [
          { value: "P1", label: "P1" },
          { value: "P2", label: "P2" },
          { value: "P3", label: "P3" },
          { value: "P4", label: "P4" },
          { value: "P5", label: "P5" },
          { value: "P6", label: "P6" },
          { value: "P7", label: "P7" },
        ],
        placeholder: "",
      },
      mcuDate: {
        type: "date",
        name: "mcuDate",
        label: t($ => $.employee.mcu.form.mcuDate.label),
        placeholder: "",
      },
      mcuExpiredDate: {
        type: "date",
        name: "mcuExpiredDate",
        label: t($ => $.employee.mcu.form.mcuExpiredDate.label),
        placeholder: "",
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: t($ => $.employee.mcu.form.evidence.label),
        placeholder: "",
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024,
        multiple: true,
      },
      statusKelaikanBekerja: {
        type: "text",
        name: "statusKelaikanBekerja",
        label: t($ => $.employee.mcu.form.statusKelaikanBekerja.label),
        placeholder: "",
      },
      skjScore: {
        type: "text",
        name: "skjScore",
        label: t($ => $.employee.mcu.form.skjScore.label),
        placeholder: "",
        description: t($ => $.employee.mcu.form.skjScore.description),
      }
    },
    schema: {
      mcuHospitalName: z.string().min(1, { message: t($ => $.employee.mcu.form.mcuHospitalName.required) }),
      mcuDeviationNotes: z.string().min(1, { message: t($ => $.employee.mcu.form.mcuDeviationNotes.required) }),
      mcuFollowUp: z.string().min(1, { message: t($ => $.employee.mcu.form.mcuFollowUp.required) }),
      ohihReview: z.string().min(1, { message: t($ => $.employee.mcu.form.ohihReview.required) }),
      mcuDate: z.date(),
      mcuExpiredDate: z.date(),
      evidence: z.array(z.any()),
      statusKelaikanBekerja: z.string(),
      skjScore: z.string(),
    },
    defaultValue: {
      mcuHospitalName: "",
      mcuDeviationNotes: "",
      mcuFollowUp: "",
      ohihReview: "",
      mcuDate: new Date(),
      mcuExpiredDate: new Date(),
      evidence: [],
      statusKelaikanBekerja: "",
      skjScore: ""
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "mcu";
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
    mcuHospitalName: body?.mcuHospitalName,
    mcuDeviationNotes: body?.mcuDeviationNotes,
    mcuFollowUp: body?.mcuFollowUp,
    ohihReview: body?.ohihReview,
    mcuDate: date_to_string(body?.mcuDate, APP_CONFIG.dayFormat),
    mcuExpiredDate: date_to_string(body?.mcuExpiredDate, APP_CONFIG.dayFormat),
    files: bodyFiles,
    id: id ?? "",
    statusKelaikanBekerja: body?.statusKelaikanBekerja,
    skjScore: body?.skjScore
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

const onMcuDataCreated = (
  t: AppTranslation,
  employeeId: string,
  setConfirmationCreate: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormMcu: any
) => {
  const formData = createMcuFormData(t);

  setConfirmationCreate({
    title: t($ => $.employee.mcu.form.create.title),
    desc: t($ => $.employee.mcu.form.create.description),
    defaultValue: formData.defaultValue,
    child: formData.form,
    schema: formData.schema,
    content: FormMcu,
    onCancelClick: () => setConfirmationCreate(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam("", body));
      setConfirmationCreate(null);
    },
  });
};

const onMcuDataUpdated = (
  t: AppTranslation,
  employeeId: string,
  obj: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onCreateClicked: (id: string, body: any) => void,
  FormMcu: any
) => {
  const formData = createMcuFormData(t);

  setConfirmationPut({
    title: t($ => $.employee.mcu.form.update.title),
    desc: t($ => $.employee.mcu.form.update.description),
    defaultValue: {
      ...obj,
      mcuDate: new Date(obj?.mcuDate) ?? new Date(),
      mcuExpiredDate: new Date(obj?.mcuExpiredDate) ?? new Date(),
      evidence: []
    },
    child: formData.form,
    schema: formData.schema,
    content: FormMcu,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      onCreateClicked(employeeId, createBodyParam(obj?.id, body));
      setConfirmationPut(null);
    },
  });
};

export { createMcuFormData, createBodyParam, onMcuDataCreated, onMcuDataUpdated };
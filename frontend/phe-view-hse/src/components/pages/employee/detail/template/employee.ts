import { z } from "zod"
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { date_to_string, string_to_date } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { ModalFormProps } from "@/components/custom/components";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for employee with translations
const createEmployeeFormData = (t: AppTranslation) => {
  return {
    form: {
      category: {
        type: 'select',
        name: 'category',
        label: t($ => $.employee.form.category.label),
        placeholder: t($ => $.employee.form.category.placeholder),
        options: Object.values(EMPLOYEE_TYPE)
      },
      projectId: {
        type: 'combobox',
        name: 'projectId',
        label: t($ => $.employee.form.projectId.label),
        placeholder: t($ => $.employee.form.projectId.placeholder),
        options: [],
      },
      subContractorId: {
        type: 'combobox',
        name: 'subContractorId',
        label: t($ => $.employee.form.subContractorId.label),
        placeholder: t($ => $.employee.form.subContractorId.placeholder),
        options: [],
      },
      employeeName: {
        type: 'text',
        name: 'employeeName',
        label: t($ => $.employee.form.employeeName.label),
        placeholder: t($ => $.employee.form.employeeName.placeholder),
      },
      position: {
        type: 'text',
        name: 'position',
        label: t($ => $.employee.form.position.label),
        placeholder: t($ => $.employee.form.position.placeholder),
      },
      identityNumber: {
        type: 'text',
        name: 'identityNumber',
        label: t($ => $.employee.form.identityNumber.label),
        placeholder: t($ => $.employee.form.identityNumber.placeholder),
      },
      hssePassportNumber: {
        type: 'text',
        name: 'hssePassportNumber',
        label: t($ => $.employee.form.hssePassportNumber.label),
        placeholder: t($ => $.employee.form.hssePassportNumber.placeholder),
      },
      // statusOnDuty: {
      //   type: 'select',
      //   name: 'statusOnDuty',
      //   label: t($ => $.employee.form.statusOnDuty.label),
      //   placeholder: t($ => $.employee.form.statusOnDuty.placeholder),
      //   options: [
      //     { value: "true", label: t($ => $.employee.form.statusOnDuty.options.onDuty) },
      //     { value: "false", label: t($ => $.employee.form.statusOnDuty.options.offDuty) },
      //   ]
      // },
      // statusChangeDate: {
      //   type: 'date',
      //   name: 'statusChangeDate',
      //   label: t($ => $.employeeList.table.statusChangeDate) || "Change Date",
      //   placeholder: t($ => $.employee.form.statusChangeDate.placeholder),
      //   isShow: (values: any) => values?.statusOnDuty === "true" && values?.originalStatusOnDuty === "false"
      // },
      remarks: {
        type: 'textarea',
        name: 'remarks',
        label: t($ => $.employee.form.remarks.label),
        placeholder: t($ => $.employee.form.remarks.placeholder),
      },
      verifiedBy: {
        type: 'text',
        name: 'verifiedBy',
        label: t($ => $.employee.form.verifiedBy.label),
        placeholder: t($ => $.employee.form.verifiedBy.placeholder),
      },
      verifiedDate: {
        type: 'date',
        name: 'verifiedDate',
        label: t($ => $.employee.form.verifiedDate.label),
        placeholder: t($ => $.employee.form.verifiedDate.placeholder),
        isShow: (values: any) => values?.statusOnDuty === "true" && values?.originalStatusOnDuty === "false"
      },
      projectName: {
        type: 'text',
        name: 'projectName',
        label: t($ => $.employee.form.projectName.label),
        placeholder: t($ => $.employee.form.projectName.placeholder),
      },
      vesselId: {
        type: 'combobox',
        name: 'vesselId',
        label: t($ => $.employee.form.vesselId.label),
        placeholder: t($ => $.employee.form.vesselId.placeholder),
        options: [],
      },
      linkDataEmployee: {
        type: 'text',
        name: 'linkDataEmployee',
        label: t($ => $.employee.form.linkDataEmployee.label),
        placeholder: t($ => $.employee.form.linkDataEmployee.placeholder),
      },
      dateOfBirth: {
        type: 'date',
        name: 'dateOfBirth',
        label: t($ => $.employee.form.dateOfBirth.label),
        placeholder: t($ => $.employee.form.dateOfBirth.placeholder),
      },
      location: {
        type: 'text',
        name: 'location',
        label: t($ => $.employee.form.location.label),
        placeholder: t($ => $.employee.form.location.placeholder),
      },
    },
    schema: z.object({
      category: z.string().min(1, { message: t($ => $.employee.form.category.required) }),
      subContractorId: z.string().min(1, { message: t($ => $.employee.form.subContractorId.required) }),
      employeeName: z.string().min(1, { message: t($ => $.employee.form.employeeName.required) }),
      position: z.string().min(1, { message: t($ => $.employee.form.position.required) }),
      identityNumber: z.string().min(1, { message: t($ => $.employee.form.identityNumber.required) }),
      hssePassportNumber: z.string().min(1, { message: t($ => $.employee.form.hssePassportNumber.required) }),
      statusOnDuty: z.string().default("false"),
      originalStatusOnDuty: z.string().optional(),
      remarks: z.string().optional(),
      verifiedBy: z.string().optional(),
      verifiedDate: z.date().optional().nullable(),
      // projectName: z.string().optional(),
      projectId: z.string().min(0, { message: t($ => $.employee.form.projectId.required) }),
      vesselId: z.string().min(0, { message: t($ => $.employee.form.vesselId.required) }),
      // linkDataEmployee: z.string().optional(),
      dateOfBirth: z.date({ required_error: t($ => $.employee.form.dateOfBirth.required) }),
      location: z.string().optional(),
      statusChangeDate: z.date().optional().nullable(),
    }).superRefine((val, ctx) => {
      if (val.statusOnDuty === "true" && val.originalStatusOnDuty === "false") {
        if (!val.statusChangeDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t($ => $.shared.required),
            path: ["statusChangeDate"],
          });
        }
      }
    }),
    defaultValue: {
      category: "",
      subContractorId: "",
      employeeName: "",
      position: "",
      identityNumber: "",
      hssePassportNumber: "",
      statusOnDuty: "false",
      originalStatusOnDuty: "false",
      statusChangeDate: null,
      remarks: "",
      verifiedBy: "",
      verifiedDate: null,
      // projectName: "",
      projectId: "",
      vesselId: "",
      // linkDataEmployee: "",
      dateOfBirth: null,
      location: "",
    }
  }
};

const createBodyParam = (id: string, body: Record<string, any>) => {
  const formKey = "general";
  const bodyKey = "general";
  const fileKey = `${formKey}_file_`;
  let bodyFiles: any[] = [];
  let fileKeys: any[] = [];
  let files: any[] = [];

  let data_: any = {
    category: body?.category,
    // projectName: body?.projectName,
    projectId: body?.projectId,
    vesselId: body?.vesselId,
    subContractorId: body?.subContractorId,
    employeeName: body?.employeeName ?? "",
    position: body?.position ?? "",
    identityNumber: body?.identityNumber ?? "",
    hssePassportNumber: body?.hssePassportNumber ?? "",
    remarks: body?.remarks ?? "",
    verifiedBy: body?.verifiedBy ?? "",
    verifiedDate: body?.verifiedDate === null ? null : date_to_string(body?.verifiedDate, APP_CONFIG.dayFormat),
    files: bodyFiles,
    statusOnDuty: body?.statusOnDuty === "true" ? true : false,
    statusChangeDate: body?.statusChangeDate === null ? null : date_to_string(body?.statusChangeDate, APP_CONFIG.dayFormat),
    id: id ?? "",
    dateOfBirth: body?.dateOfBirth === null ? null : date_to_string(body?.dateOfBirth, APP_CONFIG.dayFormat),
    location: body?.location ?? "",
  }

  if (body?.verifiedDate === null) {
    delete data_.verifiedDate;
  }
  if (body?.dateOfBirth === null) {
    delete data_.dateOfBirth;
  }
  if (body?.statusChangeDate === null) {
    delete data_.statusChangeDate;
  }

  if (body?.category === EMPLOYEE_TYPE.project.value) {
    delete data_.vesselId;
  }
  else if (body?.category === EMPLOYEE_TYPE.marine.value) {
    delete data_.projectName;
    delete data_.projectId;
  }
  else {
    delete data_.vesselId;
    // delete data_.projectName;
    // delete data_.projectId;
    // delete data_.subContractorId;
  }
  if (data_.id === "") {
    delete data_.id;
  }

  let body_ = {
    key: bodyKey,
    data: data_,
    fileKey: fileKeys,
    files: files
  }
  return (body_);
}

const onDataUpdated = (
  employeeId: string,
  obj: any,
  FormGeneral: any,
  setConfirmationPut: (modal: ModalFormProps | null) => void,
  onUpdateClicked: (id: string, body: any) => void,
  formData: any,
  t: AppTranslation
) => {
  const defaultFormData = createEmployeeFormData(t);

  setConfirmationPut({
    title: t($ => $.employee.form.update.title),
    desc: t($ => $.employee.form.update.description),
    defaultValue: {
      category: obj?.category ?? "",
      subContractorId: obj?.subContractorId ?? "",
      employeeName: obj?.employeeName ?? "",
      position: obj?.position ?? "",
      identityNumber: obj?.identityNumber ?? "",
      hssePassportNumber: obj?.hssePassportNumber ?? "",
      statusOnDuty: obj?.statusOnDuty ? obj?.statusOnDuty.toString() : "false",
      originalStatusOnDuty: obj?.statusOnDuty ? obj?.statusOnDuty.toString() : "false",
      statusChangeDate: null,
      remarks: obj?.remarks ?? "",
      verifiedBy: obj?.verifiedBy ?? "",
      verifiedDate: obj?.verifiedDate ? string_to_date(obj?.verifiedDate) : null,
      projectId: obj?.projectId ?? "",
      vesselId: obj?.vesselId ?? "",
      dateOfBirth: obj?.dateOfBirth ? string_to_date(obj?.dateOfBirth) : null,
      location: obj?.location ?? "",
    },
    child: formData?.form || defaultFormData.form,
    schema: formData?.schema || defaultFormData.schema,
    content: FormGeneral,
    onCancelClick: () => setConfirmationPut(null),
    onConfirmClick: (body: Record<string, string>) => {
      let body_ = createBodyParam(obj?.id, body);
      if (body_?.data?.category === EMPLOYEE_TYPE.project.value) {
        delete body_.data.vesselId;
      }
      else if (body_?.data?.category === EMPLOYEE_TYPE.marine.value) {
        delete body_.data.projectName;
        // delete body_.data.subContractorId;
      }
      else {
        delete body_.data.vesselId;
        delete body_.data.projectName;
        // delete body_.data.subContractorId;
      }

      onUpdateClicked(employeeId, body_);
      setConfirmationPut(null);
    },
  });
};

export { createEmployeeFormData, createBodyParam, onDataUpdated };
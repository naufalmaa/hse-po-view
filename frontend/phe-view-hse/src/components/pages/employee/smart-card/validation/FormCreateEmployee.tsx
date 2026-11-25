import React from "react";
import { ControlForm } from "@/components/custom/forms";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean
};

const FormCreateEmployee = ({ values, form, showPassword = true, ...props }: any) => {
  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* employeeName */}
      <ControlForm form={form} item={values?.employeeName} />
      
      {/* category */}
      <ControlForm form={form} item={values?.category} />
      
      {/* subContractorId */}
      <ControlForm form={form} item={values?.subContractorId} />
      
      {/* identityNumber */}
      <ControlForm form={form} item={values?.identityNumber} />
    </div>
  );
}

export default FormCreateEmployee;
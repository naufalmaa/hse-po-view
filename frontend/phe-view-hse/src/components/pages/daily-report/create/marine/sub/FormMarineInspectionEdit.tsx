import React from "react";
import { ControlForm } from "@/components/custom/forms";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
};
const FormMarineInspectionEdit = ({ values, form, ...props }: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* status */}
      <ControlForm form={form} item={values?.status} />

      {/* descripsion */}
      <ControlForm form={form} item={values?.description} />

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence} />
    </div>
  );
}
export default FormMarineInspectionEdit

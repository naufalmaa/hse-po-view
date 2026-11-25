import React from "react";
import { ControlForm } from "@/components/custom/forms";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
};
const FormInspectionEdit = ({ values, form, ...props }: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* finding */}
      <ControlForm form={form} item={values?.finding} />

      {/* descripsion */}
      <ControlForm form={form} item={values?.description} />

      <div className="grid grid-cols-2 gap-4">
        {/* status */}
        <ControlForm form={form} item={values?.status} />

        {/* followUp */}
        <ControlForm form={form} item={values?.followUp} />
      </div>

      {/* <div className="grid grid-cols-2 gap-4"> */}
        {/* inspection */}
        {/* <ControlForm form={form} item={values?.inspection} /> */}
        {/* deadline */}
        <ControlForm form={form} item={values?.deadline} />
      {/* </div> */}

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence} />
    </div>
  );
}
export default FormInspectionEdit

import React from "react";
import {ControlForm} from "@/components/custom/forms";

const FormPermitToWorkEdit = ({values, form, ...props}: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* jenis */}
      <ControlForm form={form} item={values?.status}/>

      {/* descripsion */}
      <ControlForm form={form} item={values?.description}/>

      {/* exp date */}
      <ControlForm form={form} item={values?.expiryDate}/>

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence}/>
    </div>
  );
}
export default FormPermitToWorkEdit

import React from "react";
import {ControlForm} from "@/components/custom/forms";

const FormPasswordUpdate = ({values, form, showPassword=true, ...props}: any) => {
  return(
    <div className={"flex flex-col gap-4 w-full"}>
      <ControlForm form={form} item={values?.password} showMessage={false}/>
      <ControlForm form={form} item={values?.confirmPassword} showMessage={false}/>
    </div>
  );
}
export default FormPasswordUpdate
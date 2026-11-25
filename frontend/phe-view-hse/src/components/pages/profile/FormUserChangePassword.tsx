import React from "react";
import {ControlForm} from "@/components/custom/forms";
import { useAppTranslation } from "@/lib/i18n-typed";

const FormUserChangePassword = ({values, form, showPassword=true, ...props}: any) => {
  const { t } = useAppTranslation();
  return(
    <div className={"flex flex-col gap-4 w-full"}>
      <ControlForm form={form} item={values?.currentPassword} showMessage={false}/>
      <ControlForm form={form} item={values?.newPassword} showMessage={false}/>
    </div>
  );
}
export default FormUserChangePassword
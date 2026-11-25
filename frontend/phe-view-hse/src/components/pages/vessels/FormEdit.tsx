import React from "react";
import {ControlForm} from "@/components/custom/forms";
import { useAppTranslation } from "@/lib/i18n-typed";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean
};

const FormEdit = ({values, form, showPassword=true, ...props} : any) => {
  const { t } = useAppTranslation();

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* name */}
      <ControlForm form={form} item={values?.vesselName}/>

      {/* type */}
      <ControlForm form={form} item={values?.type}/>

      {/* target */}
      <ControlForm form={form} item={values?.target}/>

      {/* status */}
      <ControlForm form={form} item={values?.status}/>

      {/* statusChangeDate */}
      {values?.statusChangeDate && (
        <ControlForm form={form} item={values?.statusChangeDate}/>
      )}
    </div>
  );
}
export default FormEdit

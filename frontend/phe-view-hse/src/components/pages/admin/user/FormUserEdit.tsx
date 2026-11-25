import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { isContractorString, isCrewString } from "@/types/auth";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean
};

const FormUserEdit = ({ values, form, showPassword = true, ...props }: Props) => {
  const user_role = form.watch("role");

  return (
    <div className={"flex flex-col gap-4 w-full mb-2"}>
      {/* name */}
      <ControlForm form={form} item={values?.name} disabled={props.readOnly ?? false} showMessage={false} />

      {/* email */}
      <ControlForm form={form} item={values?.email} disabled={true} showMessage={false} />

      {/* role */}
      <ControlForm form={form} item={values?.role} disabled={true} showMessage={false} />

      {/*  sub contractors */}
      {isContractorString(user_role) || isCrewString(user_role) &&
        <ControlForm form={form} item={values?.sub_contractor} disabled={true} showMessage={false} />}

      {/* email Verified */}
      <ControlForm form={form} item={values?.emailVerified} disabled={false} showMessage={false} />
    </div>
  );
}
export default FormUserEdit

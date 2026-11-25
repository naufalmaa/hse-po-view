import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { useAppTranslation } from "@/lib/i18n-typed";

const FormGuideline = ({ values, form, ...props }: any) => {
  const { t } = useAppTranslation();

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* name */}
      <ControlForm form={form} item={{
        ...values?.title,
        label: t(values?.title?.label),
        placeholder: t(values?.title?.placeholder),
        showMessage: false
      }} />

      {/* description */}
      <ControlForm form={form} item={{
        ...values?.description,
        label: t(values?.description?.label),
        placeholder: t(values?.description?.placeholder),
        showMessage: false
      }} />

      {/* evidence */}
      <ControlForm form={form} item={{
        ...values?.evidence,
        label: t(values?.evidence?.label),
        placeholder: t(values?.evidence?.placeholder),
        showMessage: false
      }} />
    </div>
  );
}
export default FormGuideline
import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { formList } from "@/components/pages/daily-report/create/lib/project-template";

const FormPermitToWorkEdit = ({ values, form, onEditAssets, onDeleteAssets, onSubmitAssets, ...props }: any) => {
  const formData = formList?.permitToWork;

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      <ControlForm form={form} item={formData?.form?.status} />
      <ControlForm form={form} item={formData?.form?.description} />
      <div className={"grid md:grid-cols-2 grid-cols-1 gap-4"}>
        <ControlForm form={form} item={formData?.form?.openDate} />
        <ControlForm form={form} item={formData?.form?.noPTW} />
        <ControlForm form={form} item={formData?.form?.location} />
        <ControlForm form={form} item={formData?.form?.RA_JSA} />
        <ControlForm form={form} item={formData?.form?.performingAuthority} />
        <ControlForm form={form} item={formData?.form?.siteController} />
      </div>
      <ControlForm form={form} item={formData?.form?.evidence} />
    </div>
  );
};

export default FormPermitToWorkEdit;
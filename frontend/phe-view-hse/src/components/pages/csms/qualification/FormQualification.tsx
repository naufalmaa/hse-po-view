import React from "react";
import { ControlForm } from "@/components/custom/forms";

const FormQualification = ({ values, form, isContractor = true, disableContractor = false, ...props }: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* contractor id */}
      {!isContractor && <ControlForm form={form} item={values?.contractorId} disabled={disableContractor} />}

      {/* name */}
      <ControlForm form={form} item={values?.title} />

      <div className="flex flex-row gap-4">
        {/* numberCertificate */}
        <ControlForm form={form} item={values?.numberCertificate} />
        {/* qualifiedValue */}
        <ControlForm form={form} item={values?.qualifiedValue} />

      </div>

      <div className="flex flex-row gap-4">
        {/* assessmentDate */}
        <ControlForm form={form} item={values?.assessmentDate} />

        {/* expiredDate */}
        <ControlForm form={form} item={values?.expiredDate} />
      </div>

      {/* assessmentResult */}
      <ControlForm form={form} item={values?.assessmentResult} />

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence} />
    </div>
  );
}
export default FormQualification

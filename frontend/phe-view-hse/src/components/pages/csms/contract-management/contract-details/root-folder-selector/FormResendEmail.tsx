import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { UseFormReturn } from "react-hook-form";

interface FormResendEmailProps {
  values: any;
  form?: UseFormReturn<any>;
}

const FormResendEmail: React.FC<FormResendEmailProps> = ({ values, form }) => {
  // If form is not provided, we're just displaying the form structure
  // The actual form will be passed by the DialogModalForm component
  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* Evaluator */}
      {form && <ControlForm form={form} item={values.evaluator} showMessage={false} />}

      {/* Verificator */}
      {form && <ControlForm form={form} item={values.verificator} showMessage={false} />}

      {/* Manager */}
      {form && <ControlForm form={form} item={values.manager} showMessage={false} />}
    </div>
  );
};

export default FormResendEmail;
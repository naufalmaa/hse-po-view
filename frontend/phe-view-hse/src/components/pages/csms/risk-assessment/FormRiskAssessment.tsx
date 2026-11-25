import React from "react";
import {ControlForm} from "@/components/custom/forms";

const FormRiskAssessment = ({values, form, isContractor=true, ...props}: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/*/!* createdAt *!/*/}
      {/*<ControlForm form={form} item={values?.createdAt}/>*/}

      {/*/!* editedAt *!/*/}
      {/*<ControlForm form={form} item={values?.editedAt}/>*/}

      {/* name */}
      <ControlForm form={form} item={values?.title}/>

      {/* description */}
      <ControlForm form={form} item={values?.description}/>

      {/* status */}
      {!isContractor && <ControlForm form={form} item={values?.status} disabled={isContractor}/>}

      {/* note */}
      {!isContractor && <ControlForm form={form} item={values?.note}/>}

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence}/>
    </div>
  );
}
export default FormRiskAssessment

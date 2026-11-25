import React from "react";
import {ControlForm} from "@/components/custom/forms";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean
};
const FormInspectionEdit = ({values, form, ...props}: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* jenisMeeting */}
      <ControlForm form={form} item={values?.jenisMeeting}/>

      {/* meetingAgenda */}
      <ControlForm form={form} item={values?.meetingAgenda}/>

      {/* totalParticipant */}
      <ControlForm form={form} item={values?.totalParticipant}/>

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence}/>
    </div>
  );
}
export default FormInspectionEdit

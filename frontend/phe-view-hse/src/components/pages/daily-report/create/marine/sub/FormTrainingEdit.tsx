import React from "react";
import {ControlForm} from "@/components/custom/forms";

const FormTrainingEdit = ({values, form, ...props}: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* jenisMeeting */}
      <ControlForm form={form} item={values?.status}/>

      {/* meetingAgenda */}
      <ControlForm form={form} item={values?.description}/>

      {/* totalParticipants */}
      <ControlForm form={form} item={values?.totalParticipants}/>

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence}/>
    </div>
  );
}
export default FormTrainingEdit

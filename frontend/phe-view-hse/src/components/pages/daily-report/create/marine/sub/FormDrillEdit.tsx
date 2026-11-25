import React from "react";
import { ControlForm } from "@/components/custom/forms";

const FormDrillEdit = ({ values, form, ...props }: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* jenisMeeting */}
      <ControlForm form={form} item={values?.status} />

      {/* meetingAgenda */}
      <ControlForm form={form} item={values?.description} />

      {/* totalParticipants */}
      <ControlForm form={form} item={values?.totalParticipants} />

      {/* <div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>
        <ControlForm form={form} item={values?.collisionDrill} />
        <ControlForm form={form} item={values?.dryDrill} />
        <ControlForm form={form} item={values?.wetDrill} />
      </div> */}

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence} />
    </div>
  );
}
export default FormDrillEdit

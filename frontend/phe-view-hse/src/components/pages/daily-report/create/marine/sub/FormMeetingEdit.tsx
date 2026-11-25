import React from "react";
import { ControlForm } from "@/components/custom/forms";

const FormMeetingEdit = ({ values, form, ...props }: any) => {

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* jenisMeeting */}
      <ControlForm form={form} item={values?.status} />

      {/* meetingAgenda */}
      <ControlForm form={form} item={values?.description} />

      {/* <div className={"grid grid-cols-2 gap-4"}> */}
        {/* totalParticipant */}
        <ControlForm form={form} item={values?.absencePercentage} />

        {/* toolboxTalk */}
        {/* <ControlForm form={form} item={values?.toolboxTalk} /> */}
      {/* </div> */}

      {/* <div className={"grid grid-cols-2 gap-4"}> */}
        {/* managementVisit */}
        {/* <ControlForm form={form} item={values?.managementVisit} /> */}

        {/* learningFromCampaignEvent */}
        {/* <ControlForm form={form} item={values?.learningFromCampaignEvent} /> */}
      {/* </div> */}

      {/* evidence */}
      <ControlForm form={form} item={values?.evidence} />
    </div>
  );
}
export default FormMeetingEdit

import React, { useEffect } from "react";
import { ControlForm } from "@/components/custom/forms";
import { USER_ROLE } from "@/constants/app-enum";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean;
  vesselOptionsMap?: { [key: string]: any[] }; // Map of vessels by contractorId
};

const FormUserAdd = ({ values, form, showPassword = true, vesselOptionsMap = {}, ...props }: any) => {
  const user_role = form.watch("role");
  const selectedContractor = form.watch("sub_contractor_vessel");

  // Update vessel options when contractor selection changes
  useEffect(() => {
    if (user_role === USER_ROLE.crew.value && selectedContractor && vesselOptionsMap) {
      // Update the vesselId options in the form
      const vesselOptions = vesselOptionsMap[selectedContractor] || [];
      // We need to update the values object to reflect the new options
      if (values && values.vesselId) {
        values.vesselId.options = vesselOptions;
      }
    }
  }, [selectedContractor, user_role, vesselOptionsMap]);

  // Get vessel options for the selected contractor
  const getVesselOptions = () => {
    if (user_role === USER_ROLE.crew.value && selectedContractor && vesselOptionsMap) {
      return vesselOptionsMap[selectedContractor] || [];
    }
    return [];
  };

  // Create a copy of values to modify vessel options dynamically
  const dynamicValues = { ...values };
  if (user_role === USER_ROLE.crew.value && dynamicValues.vesselId) {
    dynamicValues.vesselId = {
      ...dynamicValues.vesselId,
      options: getVesselOptions()
    };
  }

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* name */}
      <ControlForm form={form} item={values?.name} disabled={props.readOnly ?? false} showMessage={false} />

      {/* email */}
      <ControlForm form={form} item={values?.email} showMessage={false} />

      {/* password */}
      {showPassword && <ControlForm form={form} item={values?.password} showMessage={false} />}

      {/* role */}
      <ControlForm form={form} item={values?.role} showMessage={false} />

      {/*  sub contractors */}
      {(user_role === USER_ROLE.contractor.value) &&
        <ControlForm form={form} item={values?.sub_contractor} showMessage={false} />}

      {user_role === USER_ROLE.crew.value &&
        <ControlForm form={form} item={values?.sub_contractor_vessel} showMessage={false} />}

      {/*  sub crew */}
      {(user_role === USER_ROLE.crew.value) &&
        <ControlForm form={form} item={dynamicValues?.vesselId} showMessage={false} />}
    </div>
  );
}
export default FormUserAdd
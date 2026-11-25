import React from "react";
import { ControlForm } from "@/components/custom/forms";

export const FormContractorVessel = ({ values, form, contractorOptions = [], vesselOptions = [], ...props }: any) => {
    // Create a copy of the form configuration and update the options
    const formWithSelectOptions = React.useMemo(() => {
        if (form && (contractorOptions.length > 0 || vesselOptions.length > 0)) {
            // Return a new form object with updated options
            return {
                ...form,
                contractorId: {
                    ...form.contractorId,
                    options: contractorOptions
                },
                vesselId: {
                    ...form.vesselId,
                    options: vesselOptions
                }
            };
        }
        return form;
    }, [form, contractorOptions, vesselOptions]);

    return (
        <div className="flex flex-col gap-4 w-full">
            <ControlForm form={formWithSelectOptions} item={values?.contractorId} showMessage={false}/>
            <ControlForm form={formWithSelectOptions} item={values?.vesselId} showMessage={false}/>
        </div>
    );
};
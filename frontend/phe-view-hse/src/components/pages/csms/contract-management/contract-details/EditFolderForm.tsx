import React from "react";
import { ControlForm } from "@/components/custom/forms";

export const EditFolderForm = ({ values, form, ...props }: any) => {
    return (
        <div className="flex flex-col gap-4 w-full mt-4">
            <ControlForm form={form} item={values?.folderName} />
            <ControlForm form={form} item={values?.description} />
        </div>
    );
};
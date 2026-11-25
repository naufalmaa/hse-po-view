import React from 'react';
import { ControlForm } from "@/components/custom/forms/ControlForm";
import { z } from "zod";
import { ModalFormProps } from "@/components/custom/components";
import { date_to_string } from '@/lib/my-utils';
import { APP_CONFIG } from '@/constants/config';
import { AppTranslation } from "@/lib/i18n-typed";

const FormStatusChange = ({ values, form }: any) => {
    if (!values?.showDate) return null;
    return (
        <div className="pt-2">
            <ControlForm
                form={form}
                item={{
                    name: "statusChangeDate",
                    label: values?.dateLabel,
                    type: "date"
                }}
            />
        </div>
    );
}

export const openStatusChangeDialog = (
    t: AppTranslation,
    employeeId: string,
    currentStatus: boolean,
    setConfirmation: (modal: ModalFormProps | null) => void,
    onManageAttendance: (body: any) => void
) => {
    const newStatus = !currentStatus;

    // Set up the confirmation dialog
    const confirmationTitle = newStatus
        ? t($ => $.employeeList.confirmSetOnDutyTitle)
        : t($ => $.employeeList.confirmSetOffDutyTitle);
    const confirmationMessage = newStatus
        ? t($ => $.employeeList.confirmSetOnDuty)
        : t($ => $.employeeList.confirmSetOffDuty);

    const schema = {
        statusChangeDate: z.date({
            required_error: t($ => $.shared.required),
            invalid_type_error: t($ => $.shared.required),
        })
    };

    setConfirmation({
        title: confirmationTitle,
        desc: confirmationMessage,
        defaultValue: { statusChangeDate: new Date() },
        child: {
            showDate: true,
            dateLabel: t($ => $.employeeList.table.statusChangeDate) || "Date"
        },
        schema: schema,
        content: <FormStatusChange />,
        textConfirm: t($ => $.shared.yes) || "Yes",
        onCancelClick: () => setConfirmation(null),
        onConfirmClick: (formData) => {
            const body = {
                action: 'create' as const,
                employeeId: employeeId,
                statusAfter: newStatus ? ('on_duty' as const) : ('off_duty' as const),
                attendanceDate: date_to_string(formData.statusChangeDate, APP_CONFIG.dayFormat)
            };
            onManageAttendance(body);
            setConfirmation(null);
        },
    });
};



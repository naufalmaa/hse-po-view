import { ModalFormProps, ModalProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";
import { date_to_string } from '@/lib/my-utils';
import { APP_CONFIG } from '@/constants/config';

// Define a function to create form data
const createVesselsFormData = (t: AppTranslation, isUpdate = false) => {
    return {
        form: {
            vesselName: {
                type: "text",
                name: "vesselName",
                label: t($ => $.vessels.vesselName),
                placeholder: "",
            },
            type: {
                type: "text",
                name: "type",
                label: t($ => $.vessels.type),
                placeholder: "",
            },
            status: {
                type: "switch",
                name: "status",
                label: t($ => $.vessels.vesselOnHire),
                placeholder: "",
            },
            ...(isUpdate ? {
                statusChangeDate: {
                    type: "date",
                    name: "statusChangeDate",
                    label: t($ => $.employeeList.table.statusChangeDate) || "Tanggal Perubahan Status",
                    placeholder: "",
                }
            } : {}),
            target: {
                type: "number",
                name: "target",
                label: t($ => $.vessels.target) || "Target",
                placeholder: "0",
            }
        },
        schema: {
            vesselName: z.string().min(1, { message: t($ => $.vessels.vesselNameRequired) }),
            type: z.string().optional(),
            status: z.boolean().default(true),
            target: z.number().optional(),
            ...(isUpdate ? {
                statusChangeDate: z.date({
                    required_error: t($ => $.shared.required),
                    invalid_type_error: t($ => $.shared.required),
                })
            } : {}),
        },
        defaultValue: {
            vesselName: "",
            type: "",
            status: true,
            target: 0,
            ...(isUpdate ? { statusChangeDate: new Date() } : {}),
        }
    }
};

export const onVesselsCreated = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: React.ComponentType<any>
) => {
    const formData = createVesselsFormData(t);
    
    setConfirmationCreate({
        title: t($ => $.vessels.form.addTitle),
        desc: t($ => $.vessels.form.addDescription),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(body);
            }
            setConfirmationCreate(null);
        },
    });
};

export const onVesselsUpdated = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormGuideline: React.ComponentType<any>
) => {
    const formData = createVesselsFormData(t, true);
    
    setConfirmationPut({
        title: t($ => $.vessels.form.updateTitle),
        desc: t($ => $.vessels.form.updateDescription),
        defaultValue: {
            vesselName: obj?.vesselName ?? "",
            type: obj?.type ?? "",
            status: obj?.status ?? true,
            target: obj?.extra?.target ?? 0,
            statusChangeDate: new Date(),
        },
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onDataUpdated) {
                const formattedBody = {
                    ...body,
                    statusChangeDate: body.statusChangeDate ? date_to_string(body.statusChangeDate, APP_CONFIG.dayFormat) : undefined
                };
                onDataUpdated(obj.id, formattedBody);
            }
            setConfirmationPut(null);
        },
    });
};

export const onVesselsDeleted = (
    t: AppTranslation,
    item: any,
    setConfirmationDelete: (modal: ModalProps | null) => void,
    onDeleteConfirmed: (body: any) => void
) => {
    setConfirmationDelete({
        title: t($ => $.vessels.form.deleteTitle),
        desc: t($ => $.vessels.deleteConfirmation),
        content: React.createElement(
            "div",
            null,
            t($ => $.vessels.form.deleteDescription),
            React.createElement(
                "span",
                { className: "font-bold text-primary" },
                item?.vesselName ?? ""
            ),
            "?"
        ),
        textConfirm: t($ => $.shared.delete),
        textCancel: t($ => $.shared.cancel),
        onConfirmClick: () => {
            onDeleteConfirmed({ id: item?.id });
            setConfirmationDelete(null);
        },
        onCancelClick: () => setConfirmationDelete(null),
    });
};
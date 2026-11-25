import { ModalFormProps, ModalProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data
const createSubTypesFormData = (t: AppTranslation) => {
    return {
        form: {
            name: {
                type: "text",
                name: "name",
                label: t($ => $.subTypes.name),
                placeholder: "",
            },
            hoursPobPheOses: {
                type: "number",
                name: "hoursPobPheOses",
                label: t($ => $.subTypes.hoursPobPheOses),
                placeholder: "0",
            },
            hoursPobContractor: {
                type: "number",
                name: "hoursPobContractor",
                label: t($ => $.subTypes.hoursPobContractor),
                placeholder: "0",
            },
            target: {
                type: "number",
                name: "target",
                label: t($ => $.subTypes.target) || "Target",
                placeholder: "0",
            },
            autoCalculateManhours: {
                type: "checkbox",
                name: "autoCalculateManhours",
                label: t($ => $.subTypes.autoCalculateManhours),
            },
        },
        schema: {
            name: z.string().min(1, { message: t($ => $.subTypes.nameRequired) }),
            hoursPobPheOses: z.number().optional(),
            hoursPobContractor: z.number().optional(),
            target: z.number().optional(),
            autoCalculateManhours: z.boolean().optional(),
            workLocations: z.array(z.object({
                id: z.string().optional(),
                name: z.string().min(1, { message: "Nama lokasi wajib diisi" }),
                latitude: z.union([z.number(), z.string()]).optional().nullable(),
                longitude: z.union([z.number(), z.string()]).optional().nullable(),
            })).optional(),
        },
        defaultValue: {
            name: "",
            hoursPobPheOses: 12,
            hoursPobContractor: 12,
            target: 0,
            autoCalculateManhours: true,
            workLocations: [],
        }
    }
};

export const onSubTypesCreated = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: React.ComponentType<any>
) => {
    const formData = createSubTypesFormData(t);
    
    setConfirmationCreate({
        title: t($ => $.subTypes.form.addTitle),
        desc: t($ => $.subTypes.form.addDescription),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, any>) => {
            const formattedBody = {
                ...body,
                hoursPobPheOses: body.hoursPobPheOses !== undefined ? Number(body.hoursPobPheOses) : 12,
                hoursPobContractor: body.hoursPobContractor !== undefined ? Number(body.hoursPobContractor) : 12,
                autoCalculateManhours: body.autoCalculateManhours !== undefined ? Boolean(body.autoCalculateManhours) : true,
                workLocations: (body?.workLocations || []).map((loc: any) => ({
                    ...loc,
                    latitude: loc.latitude !== '' && loc.latitude != null ? Number(loc.latitude) : null,
                    longitude: loc.longitude !== '' && loc.longitude != null ? Number(loc.longitude) : null,
                })),
            };
            if (onCreateClicked) {
                onCreateClicked(formattedBody);
            }
            setConfirmationCreate(null);
        },
    });
};

export const onSubTypesUpdated = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormGuideline: React.ComponentType<any>
) => {
    const formData = createSubTypesFormData(t);
    
    setConfirmationPut({
        title: t($ => $.subTypes.form.updateTitle),
        desc: t($ => $.subTypes.form.updateDescription),
        defaultValue: {
            name: obj?.name ?? "",
            hoursPobPheOses: obj?.extra?.hoursPobPheOses ?? 12,
            hoursPobContractor: obj?.extra?.hoursPobContractor ?? 12,
            target: obj?.extra?.target ?? 0,
            autoCalculateManhours: obj?.extra?.autoCalculateManhours !== undefined ? Boolean(obj?.extra?.autoCalculateManhours) : true,
            workLocations: obj?.workLocations ?? [],
        },
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, any>) => {
            const formattedBody = {
                ...body,
                hoursPobPheOses: body.hoursPobPheOses !== undefined ? Number(body.hoursPobPheOses) : 12,
                hoursPobContractor: body.hoursPobContractor !== undefined ? Number(body.hoursPobContractor) : 12,
                autoCalculateManhours: body.autoCalculateManhours !== undefined ? Boolean(body.autoCalculateManhours) : true,
                workLocations: (body?.workLocations || []).map((loc: any) => ({
                    ...loc,
                    latitude: loc.latitude !== '' && loc.latitude != null ? Number(loc.latitude) : null,
                    longitude: loc.longitude !== '' && loc.longitude != null ? Number(loc.longitude) : null,
                })),
            };
            if (onDataUpdated) {
                onDataUpdated(obj.id, formattedBody);
            }
            setConfirmationPut(null);
        },
    });
};

export const onSubTypesDeleted = (
    t: AppTranslation,
    item: any,
    setConfirmationDelete: (modal: ModalProps | null) => void,
    onDeleteConfirmed: (body: any) => void
) => {
    setConfirmationDelete({
        title: t($ => $.subTypes.form.deleteTitle),
        desc: t($ => $.subTypes.deleteConfirmation),
        content: React.createElement(
            "div",
            null,
            t($ => $.subTypes.form.deleteDescription),
            React.createElement(
                "span",
                { className: "font-bold text-primary" },
                item?.name ?? ""
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
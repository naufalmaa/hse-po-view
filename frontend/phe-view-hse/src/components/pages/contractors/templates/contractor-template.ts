import { ModalFormProps, ModalProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for contractor
const createContractorFormData = (t: AppTranslation) => {
    return {
        form: {
            name: {
                type: "text",
                name: "name",
                label: t($ => $.contractors.form.name.label),
                placeholder: t($ => $.contractors.form.name.placeholder),
            },
            category: {
                type: "select",
                name: "category",
                label: t($ => $.contractors.form.category.label),
                placeholder: t($ => $.contractors.form.category.placeholder),
                options: Object.values(EMPLOYEE_TYPE)
            },
        },
        schema: {
            name: z.string().min(1, { message: t($ => $.contractors.form.name.required) }),
            category: z.string().min(1, { message: t($ => $.contractors.form.category.required) })
        },
        defaultValue: {
            name: "",
            category: "",
        }
    }
};

export const onContractorCreated = (
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormContractor: React.ComponentType<any>,
    t: AppTranslation,
    showCategory: boolean = true,
    defaultCategory?: string,
    defaultName?: string,
) => {
    const formData = createContractorFormData(t);

    setConfirmationCreate({
        title: t($ => $.contractors.form.add.title),
        desc: t($ => $.contractors.form.add.description),
        defaultValue: {
            ...formData.defaultValue,
            name: defaultName || formData.defaultValue.name,
        },
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormContractor, { showCategory, defaultCategory }),
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(body);
            }
            setConfirmationCreate(null);
        },
    });
};

export const onContractorUpdated = (
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormContractor: React.ComponentType<any>,
    t: AppTranslation,
    showCategory: boolean = true,
    defaultCategory?: string,
) => {
    const formData = createContractorFormData(t);

    setConfirmationPut({
        title: t($ => $.contractors.form.update.title),
        desc: t($ => $.contractors.form.update.description),
        defaultValue: {
            ...obj,
            name: obj.name
        },
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormContractor, { showCategory, defaultCategory, disableCategory: true }),
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onDataUpdated) {
                onDataUpdated(obj.id, body);
            }
            setConfirmationPut(null);
        },
    });
};

export const onContractorDeleted = (
    item: any,
    setConfirmationDelete: (modal: ModalProps | null) => void,
    onDataDeleted: (id: string) => void,
    t: AppTranslation,
) => {
    setConfirmationDelete({
        title: t($ => $.contractors.form.delete.title),
        desc: t($ => $.contractors.form.delete.description),
        content: React.createElement("div", null,
            t($ => $.contractors.form.delete.confirmationPrefix),
            React.createElement("span", { className: "font-bold text-primary" }, item?.name ?? ""),
            t($ => $.contractors.form.delete.confirmationSuffix)
        ),
        textConfirm: t($ => $.contractors.form.delete.confirmText),
        textCancel: t($ => $.contractors.form.delete.cancelText),
        onConfirmClick: () => {
            if (onDataDeleted) {
                onDataDeleted(item.id);
            }
            setConfirmationDelete(null);
        },
        onCancelClick: () => setConfirmationDelete(null),
    });
};

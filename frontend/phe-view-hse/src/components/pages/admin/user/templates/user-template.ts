import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { USER_ROLE } from "@/constants/app-enum";
import { showNotifError } from "@/lib/show-notif";
import { TranslationSchema } from "@/lib/i18n-typed";

// Define a function to create form data with dynamic options
const createUserData = (subContractorOptions: any[] = [], subContractorVesselOptions: any[] = [], vesselOptions: any[] = [], t: (s: (trans: TranslationSchema) => any) => string) => {
    return {
        form: {
            name: {
                type: "text",
                name: "name",
                label: t($ => $.admin.users.form.name.label),
                placeholder: t($ => $.admin.users.form.name.placeholder),
            },
            email: {
                type: "email",
                name: "email",
                label: t($ => $.admin.users.form.email.label),
                placeholder: t($ => $.admin.users.form.email.placeholder),
            },
            password: {
                type: "password",
                name: "password",
                label: t($ => $.admin.users.form.password.label),
                placeholder: t($ => $.admin.users.form.password.placeholder),
            },
            role: {
                type: "select",
                name: "role",
                label: t($ => $.admin.users.form.role.label),
                placeholder: t($ => $.admin.users.form.role.placeholder),
                options: Object.values(USER_ROLE)
            },
            sub_contractor: {
                type: "multiselect",
                name: "sub_contractor",
                label: t($ => $.admin.users.form.subContractors.label),
                placeholder: t($ => $.admin.users.form.subContractors.placeholder),
                maxCount: 1,
                options: subContractorOptions || []
            },
            sub_contractor_vessel: {
                type: "select",
                name: "sub_contractor_vessel",
                label: t($ => $.admin.users.form.subContractor.label),
                placeholder: t($ => $.admin.users.form.subContractor.placeholder),
                options: subContractorVesselOptions || []
            },
            vesselId: {
                type: "select",
                name: "vesselId",
                label: t($ => $.admin.users.form.vessel.label),
                placeholder: t($ => $.admin.users.form.vessel.placeholder),
                options: vesselOptions || []
            }
        },
        schema: {
            name: z.string().min(1, t($ => $.admin.users.form.name.required)),
            email: z.string().email(t($ => $.admin.users.form.email.invalid)).min(1, t($ => $.admin.users.form.email.required)),
            password: z.string({ required_error: t($ => $.admin.users.form.password.required) }).min(8, t($ => $.admin.users.form.password.minLength)),
            role: z.string().min(1, t($ => $.admin.users.form.role.required)),
            sub_contractor: z.array(z.string()),
            sub_contractor_vessel: z.optional(z.string()),
            // VesselId is optional by default, will be required only for crew users in the form logic
            vesselId: z.optional(z.string())
        },
        defaultValue: {
            name: "",
            email: "",
            password: "",
            role: "",
            sub_contractor: [],
            sub_contractor_vessel: "",
            vesselId: ""
        }
    }
};

const editUserData = (subContractorOptions: any[] = [], t: (s: (trans: TranslationSchema) => any) => string) => {
    return ({
        form: {
            name: {
                type: "text",
                name: "name",
                label: t($ => $.admin.users.form.name.label),
                placeholder: t($ => $.admin.users.form.name.placeholder),
            },
            email: {
                type: "email",
                name: "email",
                label: t($ => $.admin.users.form.email.label),
                placeholder: t($ => $.admin.users.form.email.placeholder),
            },
            role: {
                type: "select",
                name: "role",
                label: t($ => $.admin.users.form.role.label),
                placeholder: t($ => $.admin.users.form.role.placeholder),
                options: Object.values(USER_ROLE)
            },
            sub_contractor: {
                type: "multiselect",
                name: "sub_contractor",
                label: t($ => $.admin.users.form.subContractors.label),
                placeholder: t($ => $.admin.users.form.subContractors.placeholder),
                maxCount: 1,
                options: subContractorOptions || []
            },
            emailVerified: {
                type: "checkbox",
                name: "emailVerified",
                label: t($ => $.admin.users.form.emailVerified.label),
                placeholder: t($ => $.admin.users.form.emailVerified.placeholder),
            }
        },
        schema: {
            name: z.string().min(1, t($ => $.admin.users.form.name.required)),
            email: z.optional(z.string()),
            role: z.optional(z.string()),
            sub_contractor: z.optional(z.array(z.string())),
            emailVerified: z.optional(z.boolean()),
        },
        defaultValue: {
            name: "",
            email: "",
            role: "",
            sub_contractor: [],
            emailVerified: false
        }
    });
}

const createChangePasswordData = (t: (s: (trans: TranslationSchema) => any) => string) => {
    return {
        form: {
            password: {
                type: "password",
                name: "password",
                label: t($ => $.admin.users.form.password.label),
                placeholder: t($ => $.admin.users.form.password.placeholder),
            },
            confirmPassword: {
                type: "password",
                name: "confirmPassword",
                label: t($ => $.admin.users.form.confirmPassword.label),
                placeholder: t($ => $.admin.users.form.confirmPassword.placeholder),
            },
        },
        schema: {
            password: z.string({ required_error: t($ => $.admin.users.form.password.required) }).min(8, t($ => $.admin.users.form.password.minLength)),
            confirmPassword: z.string({ required_error: t($ => $.admin.users.form.confirmPassword.required) }).min(8, t($ => $.admin.users.form.confirmPassword.minLength)),
        },
        defaultValue: {
            password: "",
            confirmPassword: "",
        }
    }
};

export const onUserCreated = (
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: React.ComponentType<any>,
    subContractorOptions: any[] = [],
    subContractorVesselOptions: any[] = [],
    vesselOptionsMap: any = {},
    t: (s: (trans: TranslationSchema) => any) => string
) => {
    const formData = createUserData(subContractorOptions, subContractorVesselOptions, [], t);

    setConfirmationCreate({
        title: t($ => $.admin.users.modal.addUser.title),
        desc: t($ => $.admin.users.modal.addUser.description),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline, { vesselOptionsMap }), // Pass vesselOptionsMap as prop
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (body.role !== USER_ROLE.contractor.value) {
                body.sub_contractor = [];
            }

            // Only require vesselId for crew users
            if (body.role === USER_ROLE.crew.value) {
                if (!body.vesselId || body.vesselId.trim() === "") {
                    // Handle error - vessel is required for crew users
                    // In a real implementation, this would be handled by the form validation
                    showNotifError({ message: t($ => $.admin.users.form.vessel.required) });
                    return;
                }
            } else {
                // For non-crew users, remove vesselId from the body
                delete body.vesselId;
            }

            if (onCreateClicked) {
                onCreateClicked(body);
            }
            setConfirmationCreate(null);
        },
    });
};

export const onUserUpdated = (
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormGuideline: React.ComponentType<any>,
    subContractorOptions: any[] = [],
    t: (s: (trans: TranslationSchema) => any) => string
) => {
    const formData = editUserData(subContractorOptions, t);

    let newItem = { ...obj };
    if (newItem.subContractors) {
        newItem.sub_contractor = newItem.subContractors.map((item: any) => item.id)
    }

    setConfirmationPut({
        title: t($ => $.admin.users.modal.updateUser.title),
        desc: t($ => $.admin.users.modal.updateUser.description),
        defaultValue: newItem,
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onDataUpdated) {
                onDataUpdated(obj.id, { name: body?.name, emailVerified: body?.emailVerified || false });
            }
            setConfirmationPut(null);
        },
    });
};

export const onUserPasswordChanged = (
    obj: any,
    setConfirmationUpdatePassword: (modal: ModalFormProps | null) => void,
    onDataUpdated: (body: any) => void,
    FormGuideline: React.ComponentType<any>,
    t: (s: (trans: TranslationSchema) => any) => string
) => {
    const formData = createChangePasswordData(t);

    setConfirmationUpdatePassword({
        title: t($ => $.admin.users.modal.changePassword.title),
        desc: t($ => $.admin.users.modal.changePassword.description),
        child: formData.form,
        schema: formData.schema,
        defaultValue: formData.defaultValue,
        content: React.createElement(FormGuideline),
        textConfirm: t($ => $.admin.users.modal.changePassword.buttonText),
        onCancelClick: () => setConfirmationUpdatePassword(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (body.password !== body.confirmPassword) {
                // Error handling should be done in the parent component
                return { error: t($ => $.admin.users.modal.changePassword.mismatchError) };
            }

            const newBody = {
                userId: obj?.id,
                newPassword: body.password
            }

            if (onDataUpdated) {
                onDataUpdated(newBody);
            }
            setConfirmationUpdatePassword(null);
        },
    });
};
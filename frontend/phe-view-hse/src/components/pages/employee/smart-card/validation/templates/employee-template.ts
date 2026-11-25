import { ModalFormProps, ModalProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data
const createEmployeeFormData = (t: AppTranslation, contractorOptions: any[] = [], defaultValues: any = {}) => {
    return {
        form: {
            employeeName: {
                type: "text",
                name: "employeeName",
                label: t($ => $.employee.smartCard.validation.employeeName) || "Employee Name",
                placeholder: "",
            },
            category: {
                type: "select",
                name: "category",
                label: t($ => $.employee.smartCard.validation.category) || "Category",
                placeholder: "",
                options: [
                    { value: "project", label: "Project" },
                    { value: "marine", label: "Marine" },
                    { value: "mitra", label: "Mitra" }
                ]
            },
            subContractorId: {
                type: "select",
                name: "subContractorId",
                label: t($ => $.employee.smartCard.validation.subContractorId) || "Sub Contractor",
                placeholder: t($ => $.employee.smartCard.validation.selectSubContractor) || "Select a sub contractor...",
                options: contractorOptions
            },
            identityNumber: {
                type: "text",
                name: "identityNumber",
                label: t($ => $.employee.smartCard.validation.identityNumber) || "Identity Number",
                placeholder: "",
            },
        },
        schema: {
            employeeName: z.string().min(1, { message: t($ => $.employee.smartCard.validation.employeeNameRequired) || "Employee name is required" }),
            category: z.string().min(1, { message: t($ => $.employee.smartCard.validation.categoryRequired) || "Category is required" }),
            subContractorId: z.string().min(1, { message: t($ => $.employee.smartCard.validation.subContractorIdRequired) || "Sub contractor is required" }),
            identityNumber: z.string().min(1, { message: t($ => $.employee.smartCard.validation.identityNumberRequired) || "Identity number is required" }),
        },
        defaultValue: {
            employeeName: defaultValues.employeeName || "",
            category: defaultValues.category || "",
            subContractorId: defaultValues.subContractorId || "",
            identityNumber: defaultValues.identityNumber || "",
        }
    }
};

export const onCreateEmployee = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: React.ComponentType<any>,
    contractorOptions: any[] = [],
    defaultValues: any = {}
) => {
    const formData = createEmployeeFormData(t, contractorOptions, defaultValues);
    
    setConfirmationCreate({
        title: t($ => $.employee.smartCard.validation.createEmployeeTitle) || "Create New Employee",
        desc: t($ => $.employee.smartCard.validation.createEmployeeDescription) || "Please fill the form below to create a new employee.",
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
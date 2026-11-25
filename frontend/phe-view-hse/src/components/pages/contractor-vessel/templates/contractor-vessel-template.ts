import { ModalFormProps, ModalProps } from "@/components/custom/components";
import { z } from "zod"
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data with dynamic options
const createContractorVesselFormData = (t: AppTranslation, contractorOptions: any[] = [], vesselOptions: any[] = []) => {
    return {
        form: {
            contractorId: {
                type: "select",
                name: "contractorId",
                label: t($ => $.contractorVessel.contractor),
                placeholder: t($ => $.contractorVessel.selectContractor),
                options: contractorOptions
            },
            vesselId: {
                type: "multiselect",
                name: "vesselId",
                label: t($ => $.contractorVessel.vessel),
                placeholder: t($ => $.contractorVessel.selectVessel),
                maxCount: 2,
                options: vesselOptions
            }
        },
        schema: {
            contractorId: z.string().min(1, { message: t($ => $.contractorVessel.selectContractor) }),
            vesselId: z.array(z.string()).min(1, { message: t($ => $.contractorVessel.selectVessel) }),
        },
        defaultValue: {
            contractorId: "",
            vesselId: [],
        }
    }
};

export const onContractorVesselCreated = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: React.ComponentType<any>,
    contractorOptions: any[] = [], // Add contractor options parameter
    vesselOptions: any[] = [] // Add vessel options parameter
) => {
    const formData = createContractorVesselFormData(t, contractorOptions, vesselOptions);
    
    setConfirmationCreate({
        title: t($ => $.contractorVessel.mappingVessel.title),
        desc: t($ => $.contractorVessel.mappingVessel.description),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onCreateClicked) {
                onCreateClicked(body);
            }
            setConfirmationCreate(null);
        },
    });
};

export const onContractorVesselUpdated = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (body: any) => void,
    FormGuideline: React.ComponentType<any>,
    contractorOptions: any[] = [], // Add contractor options parameter
    vesselOptions: any[] = [] // Add vessel options parameter
) => {
    const formData = createContractorVesselFormData(t, contractorOptions, vesselOptions);
    
    setConfirmationPut({
        title: t($ => $.contractorVessel.mappingVessel.title),
        desc: t($ => $.contractorVessel.mappingVessel.description),
        defaultValue: {
            contractorId: obj.id || obj.contractorId,
            vesselId: []
        },
        child: formData.form,
        schema: formData.schema,
        content: React.createElement(FormGuideline),
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onDataUpdated) {
                onDataUpdated(body);
            }
            setConfirmationPut(null);
        },
    });
};

export const onContractorVesselDeleted = (
    t: AppTranslation,
    item: any,
    vessel: Record<string, any>,
    setConfirmationDelete: (modal: ModalProps | null) => void,
    onDeleteConfirmed: (body: any) => void
) => {
    setConfirmationDelete({
        title: t($ => $.contractorVessel.form.deleteTitle),
        desc: t($ => $.contractorVessel.deleteConfirmation),
        content: React.createElement(
            "div",
            null,
            t($ => $.contractorVessel.form.deleteDescription),
            React.createElement(
                "span",
                { className: "font-bold text-primary" },
                vessel?.vesselName ?? ""
            ),
            t($ => $.contractorVessel.form.deleteQuestionMark)
        ),
        textConfirm: t($ => $.shared.delete),
        textCancel: t($ => $.shared.cancel),
        onConfirmClick: () => {
            onDeleteConfirmed({ contractorId: item?.id, vesselId: vessel?.id });
            setConfirmationDelete(null);
        },
        onCancelClick: () => setConfirmationDelete(null),
    });
};

export const onContractorDeleted = (
    t: AppTranslation,
    item: any,
    setConfirmationDelete: (modal: ModalProps | null) => void,
    onDeleteConfirmed: (body: any) => void
) => {
    setConfirmationDelete({
        title: t($ => $.contractorVessel.form.deleteContractorTitle),
        desc: t($ => $.contractorVessel.deleteContractorConfirmation),
        content: React.createElement(
            "div",
            null,
            t($ => $.contractorVessel.form.deleteContractorDescription),
            React.createElement(
                "span",
                { className: "font-bold text-primary" },
                item?.name ?? ""
            ),
            t($ => $.contractorVessel.form.deleteContractorQuestionMark)
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
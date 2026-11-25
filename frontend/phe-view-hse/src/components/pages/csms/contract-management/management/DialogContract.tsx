import React from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { z } from "zod";
import { ControlForm } from "@/components/custom/forms";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { useCreateContract, useUpdateContract } from "@/service/csms/contract-management-api";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { date_to_string, string_to_date } from "@/lib/my-utils";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { useContractorGet } from "@/service/contractor-api";
import { useContractorVesselList } from "@/service/contractor-vessel";

export type DialogCreateContractProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export type DialogUpdateContractProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: any;
    onSuccess?: () => void;
};

const FormContractFields = ({ values, form }: any) => {
    const { t } = useAppTranslation();
    const selectedCategory = form.watch("category");
    const selectedContractorId = form.watch("contractorId");
    const selectedVesselId = form.watch("vesselId");

    const { data: contractorData } = useContractorGet();
    const vesselListMutation = useContractorVesselList();

    const [vessels, setVessels] = React.useState<any[]>([]);
    const [vesselsLoading, setVesselsLoading] = React.useState(false);
    
    // Dynamically filter contractors by the selected category
    const filteredContractorOptions = React.useMemo(() => {
        const rawList = contractorData || [];
        const filtered = selectedCategory 
            ? rawList.filter((c: any) => c.category === selectedCategory)
            : rawList;

        return filtered.map((contractor: any) => ({
            value: contractor.id,
            label: contractor.name
        }));
    }, [contractorData, selectedCategory]);

    const lastCategoryRef = React.useRef(selectedCategory);
    const lastContractorRef = React.useRef(selectedContractorId);
    
    // Clear selected contractor when category changes
    React.useEffect(() => {
        if (lastCategoryRef.current !== selectedCategory) {
            form.setValue("contractorId", "");
            form.setValue("vesselId", "");
            form.setValue("vesselName", "");
            lastCategoryRef.current = selectedCategory;
        }
    }, [selectedCategory, form]);

    // Reset vesselId and vesselName when contractorId changes
    React.useEffect(() => {
        if (lastContractorRef.current !== selectedContractorId) {
            form.setValue("vesselId", "");
            form.setValue("vesselName", "");
            lastContractorRef.current = selectedContractorId;
        }
    }, [selectedContractorId, form]);

    // Fetch vessels when category is marine and contractorId is selected
    React.useEffect(() => {
        if (selectedCategory === "marine" && selectedContractorId) {
            setVesselsLoading(true);
            vesselListMutation.mutate({ body: { contractorId: selectedContractorId } }, {
                onSuccess: (data: any) => {
                    const contractorVessels = data?.data?.[0]?.vessels || [];
                    setVessels(contractorVessels);
                    setVesselsLoading(false);
                },
                onError: () => {
                    setVessels([]);
                    setVesselsLoading(false);
                }
            });
        } else {
            setVessels([]);
            form.setValue("vesselId", "");
            form.setValue("vesselName", "");
        }
    }, [selectedCategory, selectedContractorId]);

    // Keep vesselName in sync with selectedVesselId
    React.useEffect(() => {
        if (selectedVesselId) {
            const chosen = vessels.find((v: any) => v.id === selectedVesselId);
            if (chosen) {
                form.setValue("vesselName", chosen.vesselName);
            }
        } else {
            form.setValue("vesselName", "");
        }
    }, [selectedVesselId, vessels, form]);

    const contractorItem = {
        ...values.contractorId,
        options: filteredContractorOptions
    };

    const vesselItem = {
        type: "select",
        name: "vesselId",
        label: t($ => $.employee.form.vesselId.label),
        placeholder: vesselsLoading ? t($ => $.shared.loading) : t($ => $.employee.form.vesselId.placeholder),
        options: vessels.map((v: any) => ({
            value: v.id,
            label: v.vesselName
        })),
        required: false,
        disabled: vesselsLoading
    };

    return (
        <div className="flex flex-col gap-y-4 w-full">
            <ControlForm form={form} item={values.title} showMessage={false} />
            <div className="grid grid-cols-2 gap-4">
                <ControlForm form={form} item={values.category} showMessage={false} />
                <ControlForm form={form} item={values.numberContract} showMessage={false} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <ControlForm form={form} item={values.riskAssessmentId} showMessage={false} />
                <ControlForm form={form} item={values.riskLevel} showMessage={false} />
            </div>
            <ControlForm form={form} item={contractorItem} showMessage={false} />
            {selectedCategory === "marine" && selectedContractorId && (
                <ControlForm form={form} item={vesselItem} showMessage={false} />
            )}

            <div className="grid grid-cols-2 gap-4">
                <ControlForm form={form} item={values.startDate} showMessage={false} />
                <ControlForm form={form} item={values.endDate} showMessage={false} />
            </div>
            <ControlForm form={form} item={values.note} showMessage={false} />
        </div>
    );
};

const RISK_LEVEL_OPTIONS = [
    { value: "Low Risk", label: "Low Risk" },
    { value: "Medium Risk", label: "Medium Risk" },
    { value: "High Risk", label: "High Risk" },
    { value: "N/A", label: "N/A" },
];

export const DialogCreateContract = ({ open, onOpenChange, onSuccess }: DialogCreateContractProps) => {
    const { t } = useAppTranslation();
    const createMutation = useCreateContract();

    const categoryOptions = Object.values(EMPLOYEE_TYPE).map((type: any) => ({
        value: type.value,
        label: type.label,
    }));

    const formSchema = z.object({
        title: z.string().min(1, { message: t($ => $.contractManagement.form.title.required) }),
        numberContract: z.string().min(1, { message: t($ => $.contractManagement.form.number.required) }),
        riskAssessmentId: z.string().optional(),
        riskLevel: z.string().optional(),
        contractorId: z.string().min(1, { message: t($ => $.contractManagement.form.contractor.required) }),
        category: z.string().min(1, { message: t($ => $.employee.form.category.required) }),
        vesselId: z.string().optional().nullable(),
        vesselName: z.string().optional().nullable(),
        startDate: z.date({ required_error: t($ => $.contractManagement.form.startDate.required) }),
        endDate: z.date({ required_error: t($ => $.contractManagement.form.endDate.required) }),
        note: z.string().optional(),
    });

    const formConfig = {
        title: {
            type: "text",
            name: "title",
            label: t($ => $.contractManagement.form.title.label),
            placeholder: t($ => $.contractManagement.form.title.placeholder),
            required: true,
        },
        numberContract: {
            type: "text",
            name: "numberContract",
            label: t($ => $.contractManagement.form.number.label),
            placeholder: t($ => $.contractManagement.form.number.placeholder),
            required: true,
        },
        riskAssessmentId: {
            type: "text",
            name: "riskAssessmentId",
            label: "Risk Assessment ID",
            placeholder: "Masukkan Risk Assessment ID",
            required: false,
        },
        riskLevel: {
            type: "select",
            name: "riskLevel",
            label: "Risk Level",
            placeholder: "Pilih Risk Level",
            options: RISK_LEVEL_OPTIONS,
            required: false,
        },
        contractorId: {
            type: "select",
            name: "contractorId",
            label: t($ => $.contractManagement.form.contractor.label),
            placeholder: t($ => $.contractManagement.form.contractor.placeholder),
            options: [],
            required: true,
        },
        category: {
            type: "select",
            name: "category",
            label: t($ => $.employee.form.category.label),
            placeholder: t($ => $.employee.form.category.placeholder),
            options: categoryOptions,
            required: true,
        },
        startDate: {
            type: "date",
            name: "startDate",
            label: t($ => $.contractManagement.form.startDate.label),
            placeholder: t($ => $.contractManagement.form.startDate.placeholder),
            required: true,
        },
        endDate: {
            type: "date",
            name: "endDate",
            label: t($ => $.contractManagement.form.endDate.label),
            placeholder: t($ => $.contractManagement.form.endDate.placeholder),
            required: true,
        },
        note: {
            type: "textarea",
            name: "note",
            label: t($ => $.contractManagement.form.notes.label),
            placeholder: t($ => $.contractManagement.form.notes.placeholder),
            required: false,
        },
    };

    const modalProps: ModalFormProps = {
        title: t($ => $.contractManagement.form.add.title),
        desc: t($ => $.contractManagement.form.add.description),
        modal: true,
        textConfirm: createMutation.isPending ? t($ => $.dialog.processing) : t($ => $.labels.save),
        textCancel: t($ => $.labels.cancel),
        defaultValue: {
            title: "",
            numberContract: "",
            riskAssessmentId: "-",
            riskLevel: "N/A",
            contractorId: "",
            category: "",
            vesselId: "",
            vesselName: "",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            note: "",
        },
        child: formConfig,
        schema: formSchema,
        content: <FormContractFields />,
        onCancelClick: () => onOpenChange(false),
        onConfirmClick: async (values) => {
            if (values.startDate >= values.endDate) {
                showNotifError({ message: t($ => $.contractManagement.startDateError) });
                return;
            }

            const body = {
                title: values.title,
                numberContract: values.numberContract,
                riskAssessmentId: values.riskAssessmentId?.trim() ? values.riskAssessmentId : "-",
                riskLevel: values.riskLevel?.trim() ? values.riskLevel : "N/A",
                contractorId: values.contractorId,
                category: values.category,
                vesselId: values.category === "marine" ? values.vesselId : null,
                vesselName: values.category === "marine" ? values.vesselName : null,
                startDate: date_to_string(values.startDate),
                endDate: date_to_string(values.endDate),
                note: values.note,
            };

            await createMutation.mutateAsync(body, {
                onSuccess: (res) => {
                    showNotifSuccess({ message: res?.message || t($ => $.contractManagement.createSuccess) });
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (err: any) => {
                    showNotifError({ message: (err?.response?.data?.message ?? err?.message) || t($ => $.contractManagement.createError) });
                }
            });
        },
    };

    if (!open) return null;

    return <DialogModalForm modal={modalProps} className="lg:max-w-lg" />;
};

export const DialogUpdateContract = ({ open, onOpenChange, contract, onSuccess }: DialogUpdateContractProps) => {
    const { t } = useAppTranslation();
    const updateMutation = useUpdateContract();

    const categoryOptions = Object.values(EMPLOYEE_TYPE).map((type: any) => ({
        value: type.value,
        label: type.label,
    }));

    const formSchema = z.object({
        title: z.string().min(1, { message: t($ => $.contractManagement.form.title.required) }),
        numberContract: z.string().min(1, { message: t($ => $.contractManagement.form.number.required) }),
        riskAssessmentId: z.string().optional(),
        riskLevel: z.string().optional(),
        contractorId: z.string().min(1, { message: t($ => $.contractManagement.form.contractor.required) }),
        category: z.string().min(1, { message: t($ => $.employee.form.category.required) }),
        vesselId: z.string().optional().nullable(),
        vesselName: z.string().optional().nullable(),
        startDate: z.date({ required_error: t($ => $.contractManagement.form.startDate.required) }),
        endDate: z.date({ required_error: t($ => $.contractManagement.form.endDate.required) }),
        note: z.string().optional(),
    });

    const formConfig = {
        title: {
            type: "text",
            name: "title",
            label: t($ => $.contractManagement.form.title.label),
            placeholder: t($ => $.contractManagement.form.title.placeholder),
            required: true,
        },
        numberContract: {
            type: "text",
            name: "numberContract",
            label: t($ => $.contractManagement.form.number.label),
            placeholder: t($ => $.contractManagement.form.number.placeholder),
            required: true,
        },
        riskAssessmentId: {
            type: "text",
            name: "riskAssessmentId",
            label: "Risk Assessment ID",
            placeholder: "Masukkan Risk Assessment ID",
            required: false,
        },
        riskLevel: {
            type: "select",
            name: "riskLevel",
            label: "Risk Level",
            placeholder: "Pilih Risk Level",
            options: RISK_LEVEL_OPTIONS,
            required: false,
        },
        contractorId: {
            type: "select",
            name: "contractorId",
            label: t($ => $.contractManagement.form.contractor.label),
            placeholder: t($ => $.contractManagement.form.contractor.placeholder),
            options: [],
            required: true,
        },
        category: {
            type: "select",
            name: "category",
            label: t($ => $.employee.form.category.label),
            placeholder: t($ => $.employee.form.category.placeholder),
            options: categoryOptions,
            required: true,
        },
        startDate: {
            type: "date",
            name: "startDate",
            label: t($ => $.contractManagement.form.startDate.label),
            placeholder: t($ => $.contractManagement.form.startDate.placeholder),
            required: true,
        },
        endDate: {
            type: "date",
            name: "endDate",
            label: t($ => $.contractManagement.form.endDate.label),
            placeholder: t($ => $.contractManagement.form.endDate.placeholder),
            required: true,
        },
        note: {
            type: "textarea",
            name: "note",
            label: t($ => $.contractManagement.form.notes.label),
            placeholder: t($ => $.contractManagement.form.notes.placeholder),
            required: false,
        },
    };

    const modalProps: ModalFormProps = {
        title: t($ => $.contractManagement.form.update.title),
        desc: t($ => $.contractManagement.form.update.description),
        modal: true,
        textConfirm: updateMutation.isPending ? t($ => $.dialog.processing) : t($ => $.labels.save),
        textCancel: t($ => $.labels.cancel),
        defaultValue: {
            title: contract?.title || "",
            numberContract: contract?.numberContract || "",
            riskAssessmentId: contract?.riskAssessmentId || "-",
            riskLevel: contract?.riskLevel || "N/A",
            contractorId: contract?.contractorId || "",
            category: contract?.category || "",
            vesselId: contract?.vesselId || "",
            vesselName: contract?.vesselName || "",
            startDate: contract?.startDate ? string_to_date(contract.startDate) : new Date(),
            endDate: contract?.endDate ? string_to_date(contract.endDate) : new Date(Date.now() + 86400000),
            note: contract?.note || "",
        },
        child: formConfig,
        schema: formSchema,
        content: <FormContractFields />,
        onCancelClick: () => onOpenChange(false),
        onConfirmClick: async (values) => {
            if (values.startDate >= values.endDate) {
                showNotifError({ message: t($ => $.contractManagement.startDateError) });
                return;
            }

            const body = {
                id: contract.id,
                title: values.title,
                numberContract: values.numberContract,
                riskAssessmentId: values.riskAssessmentId?.trim() ? values.riskAssessmentId : "-",
                riskLevel: values.riskLevel?.trim() ? values.riskLevel : "N/A",
                contractorId: values.contractorId,
                category: values.category,
                vesselId: values.category === "marine" ? values.vesselId : null,
                vesselName: values.category === "marine" ? values.vesselName : null,
                startDate: date_to_string(values.startDate),
                endDate: date_to_string(values.endDate),
                note: values.note,
            };

            await updateMutation.mutateAsync(body, {
                onSuccess: (res) => {
                    showNotifSuccess({ message: res?.message || t($ => $.contractManagement.updateSuccess) });
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (err: any) => {
                    showNotifError({ message: (err?.response?.data?.message ?? err?.message) || t($ => $.contractManagement.updateError) });
                }
            });
        },
    };

    if (!open) return null;

    return <DialogModalForm modal={modalProps} className="lg:max-w-lg" />;
};

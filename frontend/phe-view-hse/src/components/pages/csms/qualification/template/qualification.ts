import { QUALIFICATION_ASSESSMENT_STATUS } from "@/constants/app-enum";
import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod"
import { date_to_string, string_to_date } from "@/lib/my-utils";
import { AppTranslation } from "@/lib/i18n-typed";

const getFormData = (t: AppTranslation) => ({
    form: {
        info: {
            title: "title",
        },
        title: {
            type: "text",
            name: "title",
            label: t($ => $.qualification.form.name.label),
            placeholder: t($ => $.qualification.form.name.placeholder),
        },
        numberCertificate: {
            type: "text",
            name: "numberCertificate",
            label: t($ => $.qualification.form.numberCertificate.label),
            placeholder: t($ => $.qualification.form.numberCertificate.placeholder),
        },
        assessmentDate: {
            type: "date",
            name: "assessmentDate",
            label: t($ => $.qualification.form.assessmentDate.label),
            placeholder: t($ => $.qualification.form.assessmentDate.placeholder),
        },
        expiredDate: {
            type: "date",
            name: "expiredDate",
            label: t($ => $.qualification.form.expiredDate.label),
            placeholder: t($ => $.qualification.form.expiredDate.placeholder),
        },
        qualifiedValue: {
            type: "text",
            name: "qualifiedValue",
            label: t($ => $.qualification.form.qualifiedValue.label),
            placeholder: t($ => $.qualification.form.qualifiedValue.placeholder),
        },
        assessmentResult: {
            type: "textarea",
            name: "assessmentResult",
            label: t($ => $.qualification.form.assessmentResult.label),
            placeholder: t($ => $.qualification.form.assessmentResult.placeholder),
        },
        description: {
            type: "textarea",
            name: "description",
            label: t($ => $.qualification.form.description.label),
            placeholder: t($ => $.qualification.form.description.placeholder),
        },
        status: {
            type: "select",
            name: "status",
            label: t($ => $.qualification.form.status.label),
            placeholder: t($ => $.qualification.form.status.placeholder),
            options: Object.values(QUALIFICATION_ASSESSMENT_STATUS),
        },
        note: {
            type: "textarea",
            name: "note",
            label: t($ => $.qualification.form.notes.label),
            placeholder: t($ => $.qualification.form.notes.placeholder),
        },
        evidence: {
            type: "upload",
            name: "evidence",
            label: t($ => $.qualification.form.evidence.label),
            placeholder: t($ => $.qualification.form.evidence.placeholder),
            maxFiles: 25,
            maxSize: 100 * 1024 * 1024,
            totalMaxSize: 100 * 1024 * 1024
        }
    },
    schema: {
        title: z.string().min(1, { message: t($ => $.qualification.form.name.required) }),
        numberCertificate: z.string().min(1, { message: t($ => $.qualification.form.numberCertificate.required) }),
        assessmentDate: z.date().optional(),
        expiredDate: z.date().optional(),
        qualifiedValue: z.string().min(0, { message: t($ => $.qualification.form.qualifiedValue.required) }),
        assessmentResult: z.string().min(1, { message: t($ => $.qualification.form.assessmentResult.required) }),
        evidence: z.array(z.any()),
    },
    defaultValue: {
        title: "",
        numberCertificate: "",
        assessmentDate: new Date(),
        expiredDate: new Date(),
        qualifiedValue: "",
        assessmentResult: "",
        type: "",
        description: "",
        status: "not started",
        note: "",
        evidence: [],
    }
});

const getFormDataAdmin = (t: AppTranslation, contractorOptions: any[] = []) => ({
    form: {
        info: {
            title: "title",
        },
        contractorId: {
            type: "combobox",
            name: "contractorId",
            label: t($ => $.qualification.form.contractorId.label),
            placeholder: t($ => $.qualification.form.contractorId.placeholder),
            options: contractorOptions,
        },
        title: {
            type: "text",
            name: "title",
            label: t($ => $.qualification.form.name.label),
            placeholder: t($ => $.qualification.form.name.placeholder),
        },
        numberCertificate: {
            type: "text",
            name: "numberCertificate",
            label: t($ => $.qualification.form.numberCertificate.label),
            placeholder: t($ => $.qualification.form.numberCertificate.placeholder),
        },
        assessmentDate: {
            type: "date",
            name: "assessmentDate",
            label: t($ => $.qualification.form.assessmentDate.label),
            placeholder: t($ => $.qualification.form.assessmentDate.placeholder),
        },
        expiredDate: {
            type: "date",
            name: "expiredDate",
            label: t($ => $.qualification.form.expiredDate.label),
            placeholder: t($ => $.qualification.form.expiredDate.placeholder),
        },
        qualifiedValue: {
            type: "text",
            name: "qualifiedValue",
            label: t($ => $.qualification.form.qualifiedValue.label),
            placeholder: t($ => $.qualification.form.qualifiedValue.placeholder),
        },
        assessmentResult: {
            type: "textarea",
            name: "assessmentResult",
            label: t($ => $.qualification.form.assessmentResult.label),
            placeholder: t($ => $.qualification.form.assessmentResult.placeholder),
        },
        description: {
            type: "textarea",
            name: "description",
            label: t($ => $.qualification.form.description.label),
            placeholder: t($ => $.qualification.form.description.placeholder),
        },
        status: {
            type: "select",
            name: "status",
            label: t($ => $.qualification.form.status.label),
            placeholder: t($ => $.qualification.form.status.placeholder),
            options: Object.values(QUALIFICATION_ASSESSMENT_STATUS),
        },
        note: {
            type: "textarea",
            name: "note",
            label: t($ => $.qualification.form.notes.label),
            placeholder: t($ => $.qualification.form.notes.placeholder),
        },
        evidence: {
            type: "upload",
            name: "evidence",
            label: t($ => $.qualification.form.evidence.label),
            placeholder: t($ => $.qualification.form.evidence.placeholder),
            maxFiles: 25,
            maxSize: 100 * 1024 * 1024,
            totalMaxSize: 100 * 1024 * 1024
        }
    },
    schema: {
        contractorId: z.string().min(1, { message: t($ => $.qualification.form.contractorId.required) }),
        title: z.string().min(1, { message: t($ => $.qualification.form.name.required) }),
        numberCertificate: z.string().min(1, { message: t($ => $.qualification.form.numberCertificate.required) }),
        assessmentDate: z.date().optional(),
        expiredDate: z.date().optional(),
        qualifiedValue: z.string().min(0, { message: t($ => $.qualification.form.qualifiedValue.required) }),
        assessmentResult: z.string().min(1, { message: t($ => $.qualification.form.assessmentResult.required) }),
        evidence: z.array(z.any()),
    },
    defaultValue: {
        contractorId: "",
        title: "",
        numberCertificate: "",
        assessmentDate: new Date(),
        expiredDate: new Date(),
        qualifiedValue: "",
        assessmentResult: "",
        type: "",
        description: "",
        status: "not started",
        note: "",
        evidence: [],
    }
});

const createBodyParam = (canCreate: boolean, body: Record<string, any>) => {
    let files = [];
    for (let i = 0; i < body?.evidence?.length; i++) {
        files.push({
            keyFile: "file",
            keyNote: "note",
            file: body?.evidence[i]?.file?.file,
            note: ""
        });
    }
    let data_: any = {
        title: body?.title,
        numberCertificate: body?.numberCertificate,
        assessmentDate: date_to_string(body?.assessmentDate),
        expiredDate: date_to_string(body?.expiredDate),
        qualifiedValue: body?.qualifiedValue,
        assessmentResult: body?.assessmentResult,
        contractorId: body?.contractorId, // Add contractorId to the data
    }
    if(body?.id) {
        data_.qualificationAssessmentId = body?.id;
        delete body.id;
    }

    let body_ = {
        data: data_,
        files: files
    }
    return (body_);
}

const onQualificationDataCreated = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormQualification: any,
    canCreate: boolean
) => {
    const formData = getFormData(t);

    setConfirmationCreate({
        title: t($ => $.qualification.form.add.title),
        desc: t($ => $.qualification.form.add.description),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormQualification,
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(createBodyParam(canCreate, body));
            }
            setConfirmationCreate(null);
        },
    });
};

const onQualificationDataCreatedAdmin = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormQualification: any,
    contractorOptions: any[] = [],
    canCreate: boolean
) => {
    const formData = getFormDataAdmin(t, contractorOptions);

    setConfirmationCreate({
        title: t($ => $.qualification.form.add.title),
        desc: t($ => $.qualification.form.add.description),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormQualification,
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(createBodyParam(canCreate, body));
            }
            setConfirmationCreate(null);
        },
    });
};

const onQualificationDataUpdated = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (body: any) => void,
    FormQualification: any,
    canCreate: boolean
) => {
    const formData = getFormData(t);

    if (obj?.note === null) {
        obj.note = "";
    }

    setConfirmationPut({
        title: t($ => $.qualification.form.update.title),
        desc: t($ => $.qualification.form.update.description),
        defaultValue: {
            ...obj,
            assessmentDate: string_to_date(obj.assessmentDate),
            expiredDate: string_to_date(obj.expiredDate),
        },
        child: formData.form,
        schema: formData.schema,
        content: FormQualification,
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onDataUpdated) {
                body.id = obj.id;
                onDataUpdated(createBodyParam(canCreate, body));
            }
            setConfirmationPut(null);
        },
    });
};

const onQualificationDataUpdatedAdmin = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (body: any) => void,
    FormQualification: any,
    contractorOptions: any[] = [],
    canCreate: boolean
) => {
    const formData = getFormDataAdmin(t, contractorOptions);

    if (obj?.note === null) {
        obj.note = "";
    }

    setConfirmationPut({
        title: t($ => $.qualification.form.update.title),
        desc: t($ => $.qualification.form.update.description),
        defaultValue: {
            ...obj,
            assessmentDate: string_to_date(obj.assessmentDate),
            expiredDate: string_to_date(obj.expiredDate),
            contractorId: obj.contractorId || "", // Ensure contractorId is set in defaultValue
        },
        child: formData.form,
        schema: formData.schema,
        content: FormQualification,
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onDataUpdated) {
                body.id = obj.id;
                onDataUpdated(createBodyParam(canCreate, body));
            }
            setConfirmationPut(null);
        },
    });
};

export { onQualificationDataCreated, onQualificationDataUpdated, onQualificationDataCreatedAdmin, onQualificationDataUpdatedAdmin }
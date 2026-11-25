import { ModalFormProps } from "@/components/custom/components";
import { AppTranslation } from "@/lib/i18n-typed";
import { z } from "zod"

const getFormData = (t: AppTranslation) => ({
    form: {
        title: {
            type: "text",
            name: "title",
            label: t($ => $.guidelines.form.guideName.label),
            placeholder: t($ => $.guidelines.form.guideName.placeholder),
        },
        description: {
            type: "textarea",
            name: "description",
            label: t($ => $.guidelines.form.description.label),
            placeholder: t($ => $.guidelines.form.description.placeholder),
        },
        evidence: {
            type: "upload",
            name: "evidence",
            label: t($ => $.guidelines.form.evidence.label),
            placeholder: t($ => $.guidelines.form.evidence.placeholder),
            maxFiles: 25,
            maxSize: 100 * 1024 * 1024,
            totalMaxSize: 100 * 1024 * 1024
        }
    },
    schema: {
        title: z.string().min(1, { message: t($ => $.guidelines.form.guideName.required) }),
        description: z.string().min(1, { message: t($ => $.guidelines.form.description.required) }),
        evidence: z.array(z.any()),
    },
    defaultValue: {
        title: "",
        description: "",
        evidence: [],
    }
});

const createBodyParam = (body: Record<string, any>) => {
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
        description: body?.description
    }
    // if (id === "") {
    //   delete data_["id"];
    // }

    let body_ = {
        data: data_,
        files: files
    }
    return (body_);
}

const onGuidelineDataCreated = (
    t: AppTranslation,
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormGuideline: any
) => {
    const formData = getFormData(t);
    
    setConfirmationCreate({
        title: t($ => $.guidelines.form.add.title),
        desc: t($ => $.guidelines.form.add.description),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormGuideline,
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(createBodyParam(body));
            }
            setConfirmationCreate(null);
        },
    });
};

const onGuidelineDataUpdated = (
    t: AppTranslation,
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormGuideline: any
) => {
    const formData = getFormData(t);
    
    setConfirmationPut({
        title: t($ => $.guidelines.form.update.title),
        desc: t($ => $.guidelines.form.update.description),
        defaultValue: {
            ...obj,
        },
        child: formData.form,
        schema: formData.schema,
        content: FormGuideline,
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onDataUpdated) {
                onDataUpdated(obj.id, createBodyParam(body));
            }
            setConfirmationPut(null);
        },
    });
};

export { onGuidelineDataCreated, onGuidelineDataUpdated }
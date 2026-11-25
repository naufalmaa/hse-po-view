import { RISK_ASSESSMENT_STATUS } from "@/constants/app-enum";
import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod"

const formData = {
    form: {
        info: {
            title: "title",
        },
        title: {
            type: "text",
            name: "title",
            label: "Name Risk Assessment",
            placeholder: "",
        },
        description: {
            type: "textarea",
            name: "description",
            label: "Description",
            placeholder: "",
        },
        status: {
            type: "select",
            name: "status",
            label: "Status",
            placeholder: "",
            options: Object.values(RISK_ASSESSMENT_STATUS),
        },
        note: {
            type: "textarea",
            name: "note",
            label: "Notes",
            placeholder: "",
        },
        evidence: {
            type: "upload",
            name: "evidence",
            label: "Lampiran",
            placeholder: "",
            maxFiles: 25,
            maxSize: 100 * 1024 * 1024,
            totalMaxSize: 100 * 1024 * 1024
        }
    },
    schema: {
        title: z.string().min(1, { message: "Please enter name" }),
        description: z.string().min(1, { message: "Please enter description" }),
        status: z.string().min(1, { message: "Please enter status" }),
        note: z.string(),
        evidence: z.array(z.any()),
    },
    defaultValue: {
        title: "",
        description: "",
        status: "not started",
        note: "",
        evidence: [],
    }
}

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
        riskAssessmentId: body?.id,
        title: body?.title,
        description: body?.description,
        status: body?.status,
        note: body?.note,
    }

    if (canCreate) {
        delete data_["status"];
        delete data_["note"];
    }

    let body_ = {
        data: data_,
        files: files
    }
    return (body_);
}

const onRiskDataCreated = (
    setConfirmationCreate: (modal: ModalFormProps | null) => void,
    onCreateClicked: (body: any) => void,
    FormRiskAssessment: any,
    canCreate: boolean
) => {
    setConfirmationCreate({
        title: "Add New Risk Assessment",
        desc: "Please fill the form below to create new risk assessment.",
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        // content: <FormRiskAssessment isContractor={ canCreate } />,
        content: FormRiskAssessment,
        onCancelClick: () => setConfirmationCreate(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onCreateClicked) {
                onCreateClicked(createBodyParam(canCreate, body));
            }
            setConfirmationCreate(null);
        },
    });
};

const onRiskDataUpdated = (
    obj: any,
    setConfirmationPut: (modal: ModalFormProps | null) => void,
    onDataUpdated: (id: string, body: any) => void,
    FormRiskAssessment: any,
    canCreate: boolean
) => {
    if (obj?.note === null) {
        obj.note = "";
    }

    setConfirmationPut({
        title: "Update Risk Assessment",
        desc: "Please fill the form below to update the risk assessment.",
        defaultValue: obj,
        child: formData.form,
        schema: formData.schema,
        // content: <FormRiskAssessment isContractor={ canCreate } />,
        content: FormRiskAssessment,
        onCancelClick: () => setConfirmationPut(null),
        onConfirmClick: (body: Record<string, string>) => {
            if (onDataUpdated) {
                body.id = obj.id;
                onDataUpdated(obj.id, createBodyParam(canCreate, body));
            }
            setConfirmationPut(null);
        },
    });
};

export { onRiskDataCreated, onRiskDataUpdated }
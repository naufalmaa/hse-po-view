import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for changing folder rating
const createChangeRatingFormData = (t: AppTranslation, currentStatus: string, currentScore: string, currentNote: string) => {
    const isNA = currentScore === "-1";
    return {
        form: {
            status: {
                type: "select",
                name: "status",
                label: t($ => $.contractManagement.changeRatingModal.status.label),
                placeholder: t($ => $.contractManagement.changeRatingModal.status.placeholder),
                options: [
                    { label: t($ => $.contractManagement.accept), value: "accept" },
                    { label: t($ => $.contractManagement.reject), value: "reject" },
                    { label: t($ => $.contractManagement.revisi), value: "revision" },
                    { label: "N/A", value: "na" }
                ]
            },
            score: {
                type: "select",
                name: "score",
                label: t($ => $.contractManagement.changeRatingModal.score.label),
                placeholder: t($ => $.contractManagement.changeRatingModal.score.placeholder),
                options: [
                    { label: "N/A", value: "na" },
                    { label: "0", value: "0" },
                    { label: "3", value: "3" },
                    { label: "6", value: "6" },
                    { label: "10", value: "10" },
                ]
            },
            note: {
                type: "textarea",
                name: "note",
                label: t($ => $.contractManagement.changeRatingModal.note.label),
                placeholder: t($ => $.contractManagement.changeRatingModal.note.placeholder),
                rows: 4
            },
            // admin only, shown when the score differs from the AI score (ChangeRatingForm)
            ai_feedback: {
                type: "textarea",
                name: "ai_feedback",
                label: "Koreksi untuk AI (opsional)",
                placeholder: "Mengapa skor berbeda dari AI? Contoh: dokumen MWT tidak ditandatangani nakhoda, sehingga belum memenuhi skor 10.",
                rows: 3
            },
            send_notif: {
                type: "switch",
                name: "send_notif",
                label: t($ => $.contractManagement.changeRatingModal.sendNotification.label),
            }
        },
        schema: {
            status: z.string().min(1, { message: t($ => $.contractManagement.changeRatingModal.status.required) }),
            score: z.string().min(1, { message: t($ => $.contractManagement.changeRatingModal.score.required) }),
            note: z.string().optional(),
            ai_feedback: z.string().max(4000).optional(),
            send_notif: z.boolean().optional(),
        },
        defaultValue: {
            status: isNA ? "na" : (currentStatus || "accept"),
            score: isNA ? "na" : (currentScore || ""),
            note: currentNote || "",
            ai_feedback: "",
            send_notif: false,
        }
    }
};

const createChangeRatingBodyParam = (body: Record<string, any>) => {
    return {
        status: body.status === "na" ? "pending" : body.status,
        score: body.status === "na" ? -1 : parseInt(body.score, 10),
        note: body.note,
        send_notif: body.send_notif,
        ...(body.ai_feedback?.trim() ? { aiFeedback: body.ai_feedback.trim() } : {}),
    }
};

export const onChangeRating = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    currentStatus: string,
    currentScore: string,
    currentNote: string,
    setChangeRatingModal: (modal: ModalFormProps | null) => void,
    onChangeRatingClicked: (folderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createChangeRatingFormData(t, currentStatus, currentScore, currentNote);

    setChangeRatingModal({
        title: t($ => $.contractManagement.changeRatingModal.title),
        desc: t($ => $.contractManagement.changeRatingModal.description).replace('{folderName}', folderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setChangeRatingModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onChangeRatingClicked) {
                onChangeRatingClicked(folderId, createChangeRatingBodyParam(body));
            }
            setChangeRatingModal(null);
        },
    });
}
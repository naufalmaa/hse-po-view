import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for changing folder note
const createChangeNoteFormData = (t: AppTranslation, currentNote: string) => {
    return {
        form: {
            noteContractor: {
                type: "textarea",
                name: "noteContractor",
                label: t($ => $.contractManagement.changeNoteModal.noteContractor.label),
                placeholder: t($ => $.contractManagement.changeNoteModal.noteContractor.placeholder),
                rows: 4
            }
        },
        schema: {
            noteContractor: z.string().optional(),
        },
        defaultValue: {
            noteContractor: currentNote || "",
        }
    }
};

const createChangeNoteBodyParam = (body: Record<string, any>) => {
    return {
        noteContractor: body.noteContractor,
    }
};

export const onChangeNote = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    currentNote: string,
    setChangeNoteModal: (modal: ModalFormProps | null) => void,
    onChangeNoteClicked: (folderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createChangeNoteFormData(t, currentNote);

    setChangeNoteModal({
        title: t($ => $.contractManagement.changeNoteModal.title),
        desc: t($ => $.contractManagement.changeNoteModal.description).replace('{folderName}', folderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setChangeNoteModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onChangeNoteClicked) {
                onChangeNoteClicked(folderId, createChangeNoteBodyParam(body));
            }
            setChangeNoteModal(null);
        },
    });
}

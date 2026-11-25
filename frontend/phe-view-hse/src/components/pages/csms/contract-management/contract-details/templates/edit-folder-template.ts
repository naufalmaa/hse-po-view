import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for editing folder name and description
const createEditFolderFormData = (t: AppTranslation, currentName: string, currentDescription: string) => {
    return {
        form: {
            folderName: {
                type: "text",
                name: "folderName",
                label: t($ => $.contractManagement.editFolderModal.folderName.label),
                placeholder: t($ => $.contractManagement.editFolderModal.folderName.placeholder),
            },
            description: {
                type: "textarea",
                name: "description",
                label: t($ => $.contractManagement.editFolderModal.folderDescription.label),
                placeholder: t($ => $.contractManagement.editFolderModal.folderDescription.placeholder),
                rows: 4
            }
        },
        schema: {
            folderName: z.string().min(1, { message: t($ => $.contractManagement.editFolderModal.folderName.required) }),
            description: z.string().optional(),
        },
        defaultValue: {
            folderName: currentName || "",
            description: currentDescription || "",
        }
    }
};

const createEditFolderBodyParam = (body: Record<string, any>) => {
    return {
        name: body.folderName,
        description: body.description,
    }
};

export const onEditFolder = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    currentName: string,
    currentDescription: string,
    setEditFolderModal: (modal: ModalFormProps | null) => void,
    onEditClicked: (folderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createEditFolderFormData(t, currentName, currentDescription);
    
    setEditFolderModal({
        title: t($ => $.contractManagement.editFolderModal.title),
        desc: t($ => $.contractManagement.editFolderModal.description).replace('{folderName}', folderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setEditFolderModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onEditClicked) {
                onEditClicked(folderId, createEditFolderBodyParam(body));
            }
            setEditFolderModal(null);
        },
    });
};
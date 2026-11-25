import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for editing folder descriptions
const createEditDescriptionFormData = (t: AppTranslation, currentDescription: string) => {
    return {
        form: {
            description: {
                type: "textarea",
                name: "description",
                label: t($ => $.contractManagement.editDescriptionModal.folderDescription.label),
                placeholder: t($ => $.contractManagement.editDescriptionModal.folderDescription.placeholder),
                rows: 4
            }
        },
        schema: {
            description: z.string().optional(),
        },
        defaultValue: {
            description: currentDescription || "",
        }
    }
};

const createEditDescriptionBodyParam = (body: Record<string, any>) => {
    return {
        description: body.description,
    }
};

export const onEditDescription = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    currentDescription: string,
    setEditDescriptionModal: (modal: ModalFormProps | null) => void,
    onEditClicked: (folderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createEditDescriptionFormData(t, currentDescription);
    
    setEditDescriptionModal({
        title: t($ => $.contractManagement.editDescriptionModal.title),
        desc: t($ => $.contractManagement.editDescriptionModal.description).replace('{folderName}', folderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setEditDescriptionModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onEditClicked) {
                onEditClicked(folderId, createEditDescriptionBodyParam(body));
            }
            setEditDescriptionModal(null);
        },
    });
};
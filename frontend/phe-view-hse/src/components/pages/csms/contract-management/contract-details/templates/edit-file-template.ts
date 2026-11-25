import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for editing file name
const createEditFileFormData = (t: AppTranslation, currentName: string) => {
    return {
        form: {
            fileName: {
                type: "text",
                name: "fileName",
                label: t($ => $.contractManagement.editFileModal.fileName.label),
                placeholder: t($ => $.contractManagement.editFileModal.fileName.placeholder),
            }
        },
        schema: {
            fileName: z.string().min(1, { message: t($ => $.contractManagement.editFileModal.fileName.required) }),
        },
        defaultValue: {
            fileName: currentName || "",
        }
    }
};

const createEditFileBodyParam = (body: Record<string, any>) => {
    return {
        name: body.fileName,
    }
};

export const onEditFile = (
    t: AppTranslation,
    fileId: string,
    fileName: string,
    currentName: string,
    setEditFileModal: (modal: ModalFormProps | null) => void,
    onEditClicked: (fileId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createEditFileFormData(t, currentName);
    
    setEditFileModal({
        title: t($ => $.contractManagement.editFileModal.title),
        desc: t($ => $.contractManagement.editFileModal.description).replace('{fileName}', fileName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setEditFileModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onEditClicked) {
                onEditClicked(fileId, createEditFileBodyParam(body));
            }
            setEditFileModal(null);
        },
    });
};
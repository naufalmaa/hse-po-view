import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for creating subfolders
const createSubfolderFormData = (t: AppTranslation) => {
    return {
        form: {
            folderName: {
                type: "text",
                name: "folderName",
                label: t($ => $.contractManagement.createSubfolder.folderName.label),
                placeholder: t($ => $.contractManagement.createSubfolder.folderName.placeholder),
            }
        },
        schema: {
            folderName: z.string().min(1, { message: t($ => $.contractManagement.createSubfolder.folderName.required) }),
        },
        defaultValue: {
            folderName: "",
        }
    }
};

const createSubfolderBodyParam = (body: Record<string, any>) => {
    return {
        folderName: body.folderName,
    }
};

export const onCreateSubfolder = (
    t: AppTranslation,
    parentFolderId: string,
    parentFolderName: string,
    setCreateSubfolderModal: (modal: ModalFormProps | null) => void,
    onCreateClicked: (parentFolderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createSubfolderFormData(t);
    
    setCreateSubfolderModal({
        title: t($ => $.contractManagement.createSubfolder.title),
        desc: t($ => $.contractManagement.createSubfolder.description).replace('{parentFolderName}', parentFolderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setCreateSubfolderModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onCreateClicked) {
                onCreateClicked(parentFolderId, createSubfolderBodyParam(body));
            }
            setCreateSubfolderModal(null);
        },
    });
};
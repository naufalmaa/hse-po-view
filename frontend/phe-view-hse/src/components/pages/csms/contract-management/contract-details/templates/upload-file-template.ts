import { ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create form data for uploading a file
const createUploadFileFormData = (t: AppTranslation) => {
    return {
        form: {
            file: {
                type: "upload",
                name: "file",
                label: t($ => $.contractManagement.uploadFileModal.fileUpload.label),
                placeholder: t($ => $.contractManagement.uploadFileModal.fileUpload.placeholder),
                maxFiles: 25, // Allow up to 25 files
                maxSize: 100 * 1024 * 1024, // 100MB per file
                totalMaxSize: 100 * 1024 * 1024, // 100MB total batch
            }
        },
        schema: {
            file: z.array(z.any())
                .min(1, { message: t($ => $.contractManagement.uploadFileModal.fileUpload.required) })
                .max(25, { message: t($ => $.contractManagement.uploadFileModal.fileUpload.maxFiles) })
                .refine((files) => {
                    const totalSize = files.reduce((acc: number, item: any) => {
                        const size = item?.file?.file?.size ?? item?.file?.size ?? 0;
                        return acc + size;
                    }, 0);
                    return totalSize <= 100 * 1024 * 1024;
                }, { message: t($ => $.contractManagement.uploadFileModal.fileUpload.maxBatchSize) }),
        },
        defaultValue: {
            file: [],
        }
    }
};

const createUploadFileBodyParam = (body: Record<string, any>, folderId: string) => {
    // Create a new object that contains the folderId and the file data
    // The file data will be handled by the parent component
    return {
        folderId: folderId,
        file: body.file
    };
};

export const onUploadFile = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    setUploadFileModal: (modal: ModalFormProps | null) => void,
    onUploadClicked: (folderId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createUploadFileFormData(t);
    
    setUploadFileModal({
        title: t($ => $.contractManagement.uploadFileModal.title),
        desc: t($ => $.contractManagement.uploadFileModal.description).replace('{folderName}', folderName),
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setUploadFileModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onUploadClicked) {
                onUploadClicked(folderId, createUploadFileBodyParam(body, folderId));
            }
            setUploadFileModal(null);
        },
    });
};
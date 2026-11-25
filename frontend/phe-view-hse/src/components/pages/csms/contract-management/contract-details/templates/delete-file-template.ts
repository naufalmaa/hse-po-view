import { ModalFormProps } from "@/components/custom/components";
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create the delete file confirmation dialog
export const onDeleteFile = (
    t: AppTranslation,
    fileId: string,
    fileName: string,
    setDeleteFileModal: (modal: ModalFormProps | null) => void,
    onDeleteConfirmed: (fileId: string) => void
) => {
    setDeleteFileModal({
        title: t($ => $.contractManagement.deleteFileModal.title),
        desc: t($ => $.contractManagement.deleteFileModal.description).replace('{fileName}', fileName),
        defaultValue: {},
        child: null,
        schema: {},
        content: React.createElement("div", {}),
        textConfirm: t($ => $.contractManagement.deleteFileModal.confirmButton),
        textCancel: t($ => $.contractManagement.deleteFileModal.cancelButton),
        onCancelClick: () => setDeleteFileModal(null),
        onConfirmClick: () => {
            if (onDeleteConfirmed) {
                onDeleteConfirmed(fileId);
            }
            setDeleteFileModal(null);
        },
    });
};
import { ModalFormProps } from "@/components/custom/components";
import React from "react";
import { AppTranslation } from "@/lib/i18n-typed";

// Define a function to create the delete folder confirmation dialog
export const onDeleteFolder = (
    t: AppTranslation,
    folderId: string,
    folderName: string,
    setDeleteFolderModal: (modal: ModalFormProps | null) => void,
    onDeleteConfirmed: (folderId: string) => void
) => {
    setDeleteFolderModal({
        title: t($ => $.contractManagement.deleteFolderModal.title),
        desc: t($ => $.contractManagement.deleteFolderModal.description).replace('{folderName}', folderName),
        defaultValue: {},
        child: null,
        schema: {},
        content: React.createElement("div", {}),
        textConfirm: t($ => $.contractManagement.deleteFolderModal.confirmButton),
        textCancel: t($ => $.contractManagement.deleteFolderModal.cancelButton),
        onCancelClick: () => setDeleteFolderModal(null),
        onConfirmClick: () => {
            if (onDeleteConfirmed) {
                onDeleteConfirmed(folderId);
            }
            setDeleteFolderModal(null);
        },
    });
};
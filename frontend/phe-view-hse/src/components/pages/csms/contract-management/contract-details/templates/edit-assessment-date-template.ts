import { ModalFormProps } from "@/components/custom/components";
import { date_to_string } from "@/lib/my-utils";
import { z } from "zod";

// Define a function to create form data for editing assessment dates
const createEditAssessmentDateFormData = (currentDate: Date) => {
    return {
        form: {
            assessmentDate: {
                type: "date",
                name: "assessmentDate",
                label: "Assessment Date",
                placeholder: "Enter assessment date",
            }
        },
        schema: {
            assessmentDate: z.date({ required_error: "Please enter assessment date" }),
        },
        defaultValue: {
            assessmentDate: currentDate,
        }
    }
};

const createEditAssessmentDateBodyParam = (body: Record<string, any>) => {
    return {
        newDate: date_to_string(body.assessmentDate),
    }
};

export const onEditAssessmentDate = (
    folderId: string,
    folderType: string,
    currentFolderName: string,
    currentAssessmentDate: Date,
    setEditAssessmentDateModal: (modal: ModalFormProps | null) => void,
    onEditClicked: (folderId: string, folderType: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createEditAssessmentDateFormData(currentAssessmentDate);
    
    setEditAssessmentDateModal({
        title: "Edit Assessment Date",
        desc: `Update date for ${folderType} folder: ${currentFolderName}`,
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setEditAssessmentDateModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onEditClicked) {
                onEditClicked(folderId, folderType, createEditAssessmentDateBodyParam(body));
            }
            setEditAssessmentDateModal(null);
        },
    });
};
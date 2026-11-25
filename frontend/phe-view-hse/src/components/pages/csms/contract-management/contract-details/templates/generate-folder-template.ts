import { ModalFormProps } from "@/components/custom/components";
import { string_to_date } from "@/lib/my-utils";
import { z } from "zod";

// Define a function to create form data for generating assessment folders
const createGenerateFolderFormData = () => {
    return {
        form: {
            assessmentType: {
                type: "select",
                name: "assessmentType",
                label: "Assessment Type",
                placeholder: "Select assessment type",
                options: [
                    { value: "ongoing", label: "Penilaian Berjalan (PB)" },
                    { value: "final", label: "Penilaian Akhir (PA)" }
                ]
            },
            assessmentDate: {
                type: "date",
                name: "assessmentDate",
                label: "Assessment Date",
                placeholder: "Enter assessment date",
            }
        },
        schema: {
            assessmentType: z.string().min(1, { message: "Please select an assessment type" }),
            assessmentDate: z.date({ required_error: "Please enter assessment date" }),
        },
        defaultValue: {
            assessmentType: "ongoing",
            assessmentDate: new Date(),
        }
    }
};

const createGenerateFolderBodyParam = (body: Record<string, any>) => {
    return {
        assessmentType: body.assessmentType,
        assessmentDate: string_to_date(body.assessmentDate),
    }
};

export const onGenerateFolder = (
    contractId: string,
    setGenerateFolderModal: (modal: ModalFormProps | null) => void,
    onGenerateClicked: (contractId: string, body: any) => void,
    FormComponent: any
) => {
    const formData = createGenerateFolderFormData();
    
    setGenerateFolderModal({
        title: "Generate Assessment Folder",
        desc: "Create a new assessment folder for this contract",
        defaultValue: formData.defaultValue,
        child: formData.form,
        schema: formData.schema,
        content: FormComponent,
        onCancelClick: () => setGenerateFolderModal(null),
        onConfirmClick: (body: Record<string, any>) => {
            if (onGenerateClicked) {
                onGenerateClicked(contractId, createGenerateFolderBodyParam(body));
            }
            setGenerateFolderModal(null);
        },
    });
};
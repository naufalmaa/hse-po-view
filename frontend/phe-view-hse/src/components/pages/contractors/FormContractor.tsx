import { ControlForm } from "@/components/custom/forms";
import { useEffect } from "react";

export const FormContractor = ({ values, form, showCategory = true, defaultCategory, disableCategory = false, ...props }: any) => {
    // If showCategory is false and defaultCategory is provided, set the default value
    useEffect(() => {
        if (!showCategory && defaultCategory) {
            form.setValue("category", defaultCategory);
        }
    }, [showCategory, defaultCategory, form]);

    return (
        <div className="flex flex-col gap-4 w-full">
                <ControlForm 
                    form={form} 
                    item={values?.name} 
                    className="" 
                    showMessage={false}
                />
                {showCategory && (
                    <ControlForm 
                        form={form} 
                        item={values?.category} 
                        className="" 
                        disabled={disableCategory}
                        showMessage={false}
                    />
                )}
        </div>
    );
};

export default FormContractor;
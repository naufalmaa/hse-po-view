import { ControlForm } from "@/components/custom/forms";

const FormOtherHealthAssurance = ({ values, form, isFormCreate = false, ...props }: any) => {

    return (
        <div className={"flex flex-col gap-4 w-full"}>
            {/* otherHealthAssurance */}
            <ControlForm form={form} item={values?.otherHealthAssurance} showMessage={false} />
        </div>);
};

export default FormOtherHealthAssurance;

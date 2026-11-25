import { ControlForm } from "@/components/custom/forms";

const FormPPE = ({ values, form, isFormCreate = false, ...props }: any) => {

    return (
        <div className={"flex flex-col gap-4 w-full"}>
            {/* ppe */}
            <ControlForm form={form} item={values?.ppe} showMessage={false} />
        </div>);
};

export default FormPPE;

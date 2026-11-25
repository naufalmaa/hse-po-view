import { ControlForm } from "@/components/custom/forms";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";

const FormCategory = ({ values, form, isFormCreate = false, ...props }: any) => {
  const category = form.watch("category");

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* category */}
      <ControlForm form={form} item={values?.category} showMessage={false} />

      {/* subContractorId */}
      <ControlForm form={form} item={values?.subContractorId} showMessage={false} />

      {/* projectId */}
      {category !== EMPLOYEE_TYPE.marine.value &&
        <ControlForm form={form} item={values?.projectId} showMessage={false} />
      }

      {/* vesselId */}
      {category === EMPLOYEE_TYPE.marine.value &&
        <ControlForm form={form} item={values?.vesselId} showMessage={false} />
      }

      {/* location */}
      <ControlForm form={form} item={values?.location} showMessage={false} />
    </div>);
};

export default FormCategory;
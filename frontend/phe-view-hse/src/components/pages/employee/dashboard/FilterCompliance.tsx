import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultStore } from "@/stores/useAppStore";
import { FormSelect } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  defaultValues?: any;
}

const FilterCompliance = ({ form, onSubmit, setOpenFilter, defaultValues }: Props) => {
  const { t } = useAppTranslation();

  const [formList, setFormList] = useState<Record<string, any>>({
    orderBy: {
      name: "orderBy",
      label: t($ => $.employee.dashboard.filters.sortOrder),
      options: [
        { value: "asc", label: t($ => $.employee.dashboard.filters.ascending) },
        { value: "desc", label: t($ => $.employee.dashboard.filters.descending) },
      ]
    }
  });

  const onSubmitClicked = () => {
    onSubmit(form.getValues());
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = defaultValues || {
      ...defaultStore.employeeDashboard.complianceRate,
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      {/*<div>*/}
      {/*  <h4 className="leading-none font-medium">Daily Report Filter</h4>*/}
      {/*</div>*/}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
          className={"grid grid-cols-1 gap-2"}>
          <div className={""}>
            <FormSelect form={form} item={formList?.orderBy} />
          </div>
          <div className={"grid grid-cols-2 gap-2 mt-2"}>
            <Button variant={"destructive"} onClick={onResetClicked}>{t($ => $.shared.reset)}</Button>
            <Button>{t($ => $.shared.submit)}</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
export default FilterCompliance
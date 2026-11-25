import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {defaultStore} from "@/stores/useAppStore";
import {FormMultiSelect} from "@/components/custom/forms";
import {Form} from "@/components/ui/form";
import {useAppTranslation, AppTranslation} from "@/lib/i18n-typed";
import {EMPLOYEE_TYPE} from "@/constants/app-enum";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  subtypes: any[]
}

const ContainerFilter = ({form, onSubmit, setOpenFilter, subtypes}: Props) => {
  const {t} = useAppTranslation();

  const startYear = 2020;
  const currentYear = new Date().getFullYear();
  const optionsYear = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => {
      const year = currentYear - i; // descending order
      return { value: year, label: year.toString() };
    }
  )

  const [formList, setFormList] = useState<Record<string, any>>({
    years: {
      name: "years",
      label: t($ => $.employee.dashboard.filters.years),
      options: optionsYear
    },
    category: {
      name: "category",
      label: t($ => $.employee.dashboard.filters.category),
      options: Object.values(EMPLOYEE_TYPE)
    },
    subContractorId: {
      name: "subContractorId",
      label: t($ => $.employee.dashboard.filters.subContractor),
      options: [],
    },
    // rankHealthOhih: {
    //   name: "rankHealthOhih",
    //   label: "Rank Health Ohih",
    //   options: Object.values(RANK_HEALTH_OH_IH)
    // },
    // rankHealthType: {
    //   name: "rankHealthType",
    //   label: "Rank Health Type",
    //   options: Object.values(RANK_HEALTH_TYPE)
    // },
  });

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      subContractorId: {
        ...prevFormList.subContractorId,
        options: subtypes
      }
    }));
  }, [subtypes]);

  const onSubmitClicked = () => {
    form.setValue("reset", false);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.employeeDashboard,
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">{t($ => $.employee.dashboard.filters.employeeFilter)}</h4>
        <p className="text-muted-foreground text-sm">
          {t($ => $.employee.dashboard.filters.setEmployeeDashboardFilter)}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
              className={"grid grid-cols-1 gap-4"}>
          <div className={""}>
            <FormMultiSelect form={form} item={formList?.years}/>
          </div>
          <div className={""}>
            <FormMultiSelect form={form} item={formList?.category}/>
          </div>
          <div className={""}>
            <FormMultiSelect form={form} item={formList?.subContractorId}/>
          </div>
          {/*<div className={""}>*/}
          {/*  <FormMultiSelect form={form} item={formList?.rankHealthOhih}/>*/}
          {/*</div>*/}
          {/*<div className={""}>*/}
          {/*  <FormMultiSelect form={form} item={formList?.rankHealthType}/>*/}
          {/*</div>*/}
          <div className={"grid grid-cols-2 gap-2 mt-2"}>
            <Button variant={"destructive"} onClick={onResetClicked}>{t($ => $.shared.reset)}</Button>
            <Button>{t($ => $.shared.submit)}</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
export default ContainerFilter
import React from "react";
import { Button } from "@/components/ui/button";
import { defaultStore } from "@/stores/useAppStore";
import { FormDatePicker, FormMultiSelect, FormSelect } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation, AppTranslation } from "@/lib/i18n-typed";
import { REPORT_TYPE } from "@/constants/app-enum";
import { string_to_date } from "@/lib/my-utils";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  subTypes: any;
  vesselList?: any;
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter, subTypes, vesselList = [] }: Props) => {
  const { t } = useAppTranslation();

  const formList = {
    basis: {
      name: "basis",
      label: "Basis",
      options: [
        { value: "all", label: "All" },
        { value: "range", label: "Range" },
        { value: "default", label: "Year To Date (YTD)" }
      ]
    },
    date_start: {
      name: "date_start",
      label: "Start Date",
    },
    date_end: {
      name: "date_end",
      label: "End Date",
    },
    formTypes: {
      name: "formTypes",
      label: "Form Type",
      options: Object.values(REPORT_TYPE)
    },
    subtype: {
      name: "subtype",
      label: "Sub Type",
      options: subTypes || [],
      maxCount: 1
    },
    vesselId: {
      name: "vesselId",
      label: "Vessel",
      options: vesselList,
    },
  }

  const basis_type = form.watch("basis");
  const selectedFormTypes = form.watch("formTypes") || [];
  const isProjectSelected = selectedFormTypes.includes(REPORT_TYPE.project.value);
  const isMarineSelected = selectedFormTypes.includes(REPORT_TYPE.marine.value);

  const onSubmitClicked = () => {
    form.setValue("reset", false);

    if (!isProjectSelected) {
      form.setValue("subtype", []);
    }

    if (!isMarineSelected) {
      form.setValue("vesselId", []);
    }

    let body_ = form.getValues();
    const sub_types = form.getValues("subtype") || [];
    if (subTypes && Array.isArray(sub_types) && sub_types.length === subTypes.length) {
      body_.subtype = [];
    }
    // const vessel_ids = form.getValues("vesselId");
    // if(vessel_ids.length === vesselList.length) {
    //   body_.vesselId = [];
    // }

    onSubmit(body_);
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.hsePerformance,
      date_start: string_to_date(defaultStore.hsePerformance?.date_start),
      date_end: string_to_date(defaultStore.hsePerformance?.date_end)
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">HSE Performance Filter</h4>
        <p className="text-muted-foreground text-sm">
          Set the filter for HSE performance
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
          className={"grid grid-cols-1 gap-4"}>
          <div className={""}>
            <FormSelect form={form} item={formList?.basis} />
          </div>
          {basis_type === "range" &&
            <div className={"flex flex-col gap-4"}>
              <div className={""}>
                <FormDatePicker form={form} item={formList?.date_start} />
              </div>
              <div className={""}>
                <FormDatePicker form={form} item={formList?.date_end} />
              </div>
            </div>}

          <div className={""}>
            <FormMultiSelect form={form} item={formList?.formTypes} />
          </div>
          {isProjectSelected && (
            <div className={""}>
              <FormMultiSelect form={form} item={formList?.subtype} />
            </div>
          )}
          {isMarineSelected && (
            <div className={""}>
              <FormMultiSelect form={form} item={formList?.vesselId} />
            </div>
          )}

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
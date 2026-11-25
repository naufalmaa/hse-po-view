import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { addDays } from 'date-fns';
import { defaultStore } from "@/stores/useAppStore";
import { FormMultiSelect, FormDatePicker, FormSelect } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { REPORT_TYPE } from "@/constants/app-enum";
import { string_to_date } from "@/lib/my-utils";
import { useWorkLocations } from "@/service/work-location-api";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  subtypes: any[];
  vesselList?: any[];
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter, subtypes, vesselList = [] }: Props) => {
  const { t } = useAppTranslation();
  const selectedSubtypes = form.watch("subtypes");
  const singleProjectId = Array.isArray(selectedSubtypes) && selectedSubtypes.length === 1 ? selectedSubtypes[0] : undefined;
  const { data: workLocationsData } = useWorkLocations(singleProjectId);

  const workLocationOptions = useMemo(() => {
    if (!workLocationsData) return [];
    return workLocationsData.map((wl) => ({
      value: wl.id,
      label: wl.name,
    }));
  }, [workLocationsData]);

  const [formList, setFormList] = useState<Record<string, any>>({
    date_start: {
      name: "date_start",
      label: "From Date",
    },
    date_end: {
      name: "date_end",
      label: "To Date",
    },
    formTypes: {
      name: "formTypes",
      label: "Form Type",
      options: Object.values(REPORT_TYPE)
    },
    subtypes: {
      name: "subtypes",
      label: "Sub Type",
      options: []
    },
    workLocations: {
      name: "workLocations",
      label: "Work Location",
      options: []
    },
    vesselId: {
      name: "vesselId",
      label: "Vessel",
      options: vesselList,
    },
  });

  const formTypes_ = form.watch("formTypes");

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      subtypes: {
        ...prevFormList.subtypes,
        options: subtypes
      }
    }));
  }, [subtypes]);

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      workLocations: {
        ...prevFormList.workLocations,
        options: workLocationOptions
      }
    }));
  }, [workLocationOptions]);

  const onSubmitClicked = () => {
    form.setValue("reset", false);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const todayNow = new Date();
    const firstDayOfMonth = new Date(todayNow.getFullYear(), todayNow.getMonth(), 1);
    const default_ = defaultStore.dailyActivity;
    const resetData = {
      ...default_,
      date_start: firstDayOfMonth,
      date_end: todayNow,
      formTypes: default_?.formTypes?.[0] ?? REPORT_TYPE.project.value,
      subtypes: [],
      workLocations: [],
      vesselId: []
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">Daily Activity Filter</h4>
        <p className="text-muted-foreground text-sm">
          Set the filter for daily activity
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
          className={"grid grid-cols-1 gap-2"}>
          <div className={"grid grid-cols-2 gap-2"}>
            <FormDatePicker form={form} item={formList?.date_start} />
            <FormDatePicker form={form} item={formList?.date_end} />
          </div>
          <div className={""}>
            <FormSelect form={form} item={formList?.formTypes} />
          </div>
          {formTypes_ === REPORT_TYPE.project.value && (
            <>
              <div className={""}>
                <FormMultiSelect form={form} item={formList?.subtypes} />
              </div>
              {workLocationOptions.length > 0 && (
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.workLocations} />
                </div>
              )}
            </>
          )}
          {formTypes_ === REPORT_TYPE.marine.value &&
            <div className={""}>
              <FormMultiSelect form={form} item={formList?.vesselId} />
            </div>
          }
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
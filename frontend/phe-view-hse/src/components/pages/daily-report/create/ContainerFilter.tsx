import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { max, min } from "date-fns";
import { defaultStore } from "@/stores/useAppStore";
import { FormDatePicker, FormMultiSelect, FormSelect } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { REPORT_TYPE } from "@/constants/app-enum";
import { string_to_date } from "@/lib/my-utils";
import { AuthProps, isCrew } from "@/types/auth";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  subtypes: any[];
  vesselList?: any[];
  userRole: AuthProps | null;
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter, subtypes, vesselList = [], userRole }: Props) => {
  const { t } = useAppTranslation();

  const [formList, setFormList] = useState<Record<string, any>>({
    selectByRange: {
      name: "selectByRange",
      label: t($ => $.dailyReport.containerFilter.selectByRange),
      options: [
        { value: "true", label: t($ => $.dailyReport.containerFilter.yes) },
        { value: "false", label: t($ => $.dailyReport.containerFilter.no) },
      ]
    },
    date_start: {
      name: "date_start",
      label: t($ => $.dailyReport.containerFilter.dateStart),
    },
    date_end: {
      name: "date_end",
      label: t($ => $.dailyReport.containerFilter.dateEnd),
    },
    formTypes: {
      name: "formTypes",
      label: t($ => $.dailyReport.containerFilter.formType),
      options: Object.values(REPORT_TYPE)
    },
    subtypes: {
      name: "subtypes",
      label: t($ => $.dailyReport.containerFilter.subType),
      options: [],
      maxCount: 1
    },
    vesselId: {
      name: "vesselId",
      label: "Vessel",
      options: vesselList || [],
    },
    sort: {
      name: "sort",
      label: t($ => $.dailyReport.containerFilter.sort),
      options: [
        { value: "reportDate", label: t($ => $.dailyReport.containerFilter.reportDate) || "Tanggal Laporan" },
        { value: "reportedBy", label: "Dilaporkan Oleh" },
        { value: "instansi", label: t($ => $.dailyReport.containerFilter.instansi) || "Instansi" },
        { value: "formType", label: t($ => $.dailyReport.containerFilter.formTypeLabel) || "Tipe Laporan" },
        { value: "subtypeName", label: "Sub Tipe / Vessel" },
        { value: "vessel", label: "Vessel (Nama Kapal)" },
        { value: "createdAt", label: t($ => $.dailyReport.containerFilter.createdAt) || "Tanggal Dibuat" },
        { value: "updatedAt", label: t($ => $.dailyReport.containerFilter.updatedAt) || "Tanggal Diperbarui" },
      ]
    },
    order: {
      name: "order",
      label: t($ => $.dailyReport.containerFilter.order),
      options: [
        { value: "desc", label: `${t($ => $.dailyReport.containerFilter.descending) || "Descending"} (Terbaru)` },
        { value: "asc", label: `${t($ => $.dailyReport.containerFilter.ascending) || "Ascending"} (Terlama)` },
      ]
    }
  });

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
      vesselId: {
        ...prevFormList.vesselId,
        options: vesselList
      }
    }));
  }, [vesselList]);

  const selectByRange = form.watch("selectByRange")?.toLowerCase() === "true";
  const formTypes = form.watch("formTypes");

  const onSubmitClicked = () => {
    form.setValue("reset", false);
    let date_start = form.getValues("date_start");
    let date_end = form.getValues("date_end");
    form.setValue("date_start", min([date_start, date_end]));
    form.setValue("date_end", max([date_start, date_end]));
    onSubmit(form.getValues());
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.dailyReportList,
      sort: "reportDate",
      order: "desc",
      subtypes: [],
      vesselId: [],
      date_start: string_to_date(defaultStore.dailyReportList?.date_start),
      date_end: string_to_date(defaultStore.dailyReportList?.date_end)
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">{t($ => $.dailyReport.containerFilter.title)}</h4>
        <p className="text-muted-foreground text-sm">
          {t($ => $.dailyReport.containerFilter.description)}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
          className={"grid grid-cols-1 gap-4"}>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto" style={{ maxHeight: `calc(100vh - 500px)` }}>
            <div className={""}>
              <FormSelect form={form} item={formList?.selectByRange} />
            </div>
            {selectByRange &&
              <div className={""}>
                <FormDatePicker form={form} item={formList?.date_start} />
              </div>
            }
            {selectByRange &&
              <div className={""}>
                <FormDatePicker form={form} item={formList?.date_end} />
              </div>
            }

            {!isCrew(userRole) && <div className="flex flex-col gap-4">
              <div className={""}>
                <FormMultiSelect form={form} item={formList?.formTypes} />
              </div>
              {formTypes?.includes(REPORT_TYPE.project.value) &&
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.subtypes} />
                </div>}
              {formTypes?.includes(REPORT_TYPE.marine.value) &&
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.vesselId} />
                </div>}
            </div>}

            <div className={""}>
              <FormSelect form={form} item={formList?.sort} />
            </div>
            <div className={""}>
              <FormSelect form={form} item={formList?.order} />
            </div>
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
export default ContainerFilter
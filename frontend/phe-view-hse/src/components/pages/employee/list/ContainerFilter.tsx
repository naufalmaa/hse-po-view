import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { max, min } from "date-fns";
import { defaultStore } from "@/stores/useAppStore";
import { FormMultiSelect, FormSelect } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { string_to_date } from "@/lib/my-utils";
import { isCrewString } from "@/types/auth";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
  subtypes: any[];
  userRole: string;
  vesselList: any[];
  contractorList: any[];
  locationList?: any[];
  companiesData?: any[];
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter, subtypes, userRole, vesselList, contractorList, locationList = [], companiesData }: Props) => {
  const { t } = useAppTranslation();

  const [formList, setFormList] = useState<Record<string, any>>({
    selectByRange: {
      name: "selectByRange",
      label: t($ => $.employeeList.filterSelectByRange),
      options: [
        { value: "true", label: t($ => $.employeeList.filterOptions.yes) },
        { value: "false", label: t($ => $.employeeList.filterOptions.no) },
      ]
    },
    date_start: {
      name: "date_start",
      label: t($ => $.employeeList.filterDateStart),
    },
    date_end: {
      name: "date_end",
      label: t($ => $.employeeList.filterDateEnd),
    },
    category: {
      name: "category",
      label: t($ => $.employeeList.filterCategory),
      options: Object.values(EMPLOYEE_TYPE),
      maxCount: 1,
    },
    projectId: {
      name: "projectId",
      label: t($ => $.employeeList.filterProject),
      options: subtypes || [],
      maxCount: 1,
    },
    location: {
      name: "location",
      label: "Lokasi Kerja",
      placeholder: "Pilih Lokasi Kerja",
      options: locationList || [],
    },
    subContractorId: {
      name: "subContractorId",
      label: t($ => $.employeeList.filterSubContractor),
      options: contractorList || [],
      maxCount: 1,
    },
    vesselId: {
      name: "vesselId",
      label: t($ => $.employeeList.filterVessel),
      options: vesselList || [],
      maxCount: 1,
    },
    statusOnDuty: {
      name: "statusOnDuty",
      label: t($ => $.employeeList.filterStatusOnDuty),
      options: [
        { value: true, label: t($ => $.employeeList.filterOptions.onDuty) },
        { value: false, label: t($ => $.employeeList.filterOptions.offDuty) },
      ]
    },
    sortBy: {
      name: "sortBy",
      label: t($ => $.employeeList.filterSortBy),
      options: [
        { value: "category", label: t($ => $.employeeList.filterOptions.category) },
        { value: "employeeName", label: t($ => $.employeeList.filterOptions.employeeName) },
        { value: "position", label: t($ => $.employeeList.filterOptions.position) },
        { value: "statusOnDuty", label: t($ => $.employeeList.filterOptions.statusOnDuty) },
        { value: "createdAt", label: t($ => $.employeeList.filterOptions.createdAt) },
        { value: "updatedAt", label: t($ => $.employeeList.filterOptions.updatedAt) },
      ]
    },
    orderBy: {
      name: "orderBy",
      label: t($ => $.employeeList.filterSortOrder),
      options: [
        { value: "asc", label: t($ => $.employeeList.filterSortAscending) },
        { value: "desc", label: t($ => $.employeeList.filterSortDescending) },
      ]
    },
    ohihReview: {
      name: "ohihReview",
      label: "Kategori Risiko Kesehatan (OHIH)",
      options: [
        { value: "P1", label: "P1" },
        { value: "P2", label: "P2" },
        { value: "P3", label: "P3" },
        { value: "P4", label: "P4" },
        { value: "P5", label: "P5" },
        { value: "P6", label: "P6" },
        { value: "P7", label: "P7" },
      ],
      maxCount: 1,
    }
  });

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      projectId: {
        ...prevFormList.projectId,
        options: subtypes
      }
    }));
  }, [subtypes]);

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      location: {
        ...prevFormList.location,
        options: locationList || []
      }
    }));
  }, [locationList]);

  useEffect(() => {
    const selectedCompanyIds = form.watch('subContractorId') || [];
    const selectedCompanyId = selectedCompanyIds[0];
    const selectedCompany = companiesData?.find((c: any) => c.id === selectedCompanyId);

    const filteredVessels = (userRole === 'contractor' && selectedCompany?.vessels)
      ? selectedCompany.vessels.map((v: any) => ({
          value: v.id,
          label: v.vesselName || v.name
        }))
      : vesselList;

    setFormList(prevFormList => ({
      ...prevFormList,
      vesselId: {
        ...prevFormList.vesselId,
        options: filteredVessels || []
      }
    }));
  }, [vesselList, companiesData, form.watch('subContractorId'), userRole]);

  useEffect(() => {
    setFormList(prevFormList => ({
      ...prevFormList,
      subContractorId: {
        ...prevFormList.subContractorId,
        options: contractorList
      }
    }));
  }, [contractorList]);

  useEffect(() => {
    const selectedCompanyIds = form.watch('subContractorId') || [];
    const selectedCompanyId = selectedCompanyIds[0];
    const selectedCompany = companiesData?.find((c: any) => c.id === selectedCompanyId);

    setFormList(prevFormList => ({
      ...prevFormList,
      category: {
        ...prevFormList.category,
        options: (userRole === 'contractor' && selectedCompany?.category)
          ? Object.values(EMPLOYEE_TYPE).filter((opt: any) => opt.value === selectedCompany.category.toLowerCase())
          : Object.values(EMPLOYEE_TYPE)
      }
    }));
  }, [companiesData, form.watch('subContractorId'), userRole]);

  const onSubmitClicked = () => {
    form.setValue("reset", false);
    let date_start = form.getValues("date_start");
    let date_end = form.getValues("date_end");
    form.setValue("date_start", min([date_start, date_end]));
    form.setValue("date_end", max([date_start, date_end]));

    const cats = form.getValues("category") || [];
    if (cats.length === 1 && cats[0] === EMPLOYEE_TYPE.marine.value) {
      form.setValue("projectId", []);
    } else if (cats.length > 0 && !cats.includes(EMPLOYEE_TYPE.marine.value)) {
      form.setValue("vesselId", []);
    }

    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.employeeList,
      date_start: string_to_date(defaultStore.employeeList?.date_start),
      date_end: string_to_date(defaultStore.employeeList?.date_end)
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  const selectedCategories = form.watch("category") || [];
  const isOnlyMarine = selectedCategories.length === 1 && selectedCategories[0] === EMPLOYEE_TYPE.marine.value;
  const isOnlyNonMarine = selectedCategories.length > 0 && !selectedCategories.includes(EMPLOYEE_TYPE.marine.value);

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">{t($ => $.employeeList.filterTitle)}</h4>
        <p className="text-muted-foreground text-sm">
          {t($ => $.employeeList.filterDescription)}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
          className={"grid grid-cols-1 gap-4"}>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto" style={{ maxHeight: `calc(100vh - 500px)` }}>
            {!isCrewString(userRole) &&
              <div className="flex flex-col gap-4">
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.category} />
                </div>
                {!isOnlyMarine && (
                  <div className={""}>
                    <FormMultiSelect form={form} item={formList?.projectId} />
                  </div>
                )}
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.subContractorId} />
                </div>
                {!isOnlyNonMarine && (
                  <div className={""}>
                    <FormMultiSelect form={form} item={formList?.vesselId} />
                  </div>
                )}
                <div className={""}>
                  <FormMultiSelect form={form} item={formList?.location} />
                </div>
              </div>}
            <div className={""}>
              <FormMultiSelect form={form} item={formList?.ohihReview} />
            </div>
            <div className={""}>
              <FormMultiSelect form={form} item={formList?.statusOnDuty} />
            </div>
            <div className={""}>
              <FormSelect form={form} item={formList?.sortBy} />
            </div>
            <div className={""}>
              <FormSelect form={form} item={formList?.orderBy} />
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
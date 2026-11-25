import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Company } from '@/service/employee/smart-card'
import { useAppTranslation } from '@/lib/i18n-typed';
import { useAuth } from '@/hooks/use-auth';
import { EMPLOYEE_TYPE } from '@/constants/app-enum';
import { Form } from '@/components/ui/form';
import { ControlForm } from '@/components/custom/forms';
import { defaultStore } from '@/stores/useAppStore';
import { string_to_date } from '@/lib/my-utils';

interface FilterEmployeeProps {
  form: any;
  companiesData?: Company[];
  projectsData?: any[];
  vesselsData?: any[];
  isLoading: boolean;
  onSubmit: any;
}

export const FilterEmployee: React.FC<FilterEmployeeProps> = ({
  form,
  companiesData,
  projectsData,
  vesselsData,
  isLoading,
  onSubmit,
}) => {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const user = auth?.user?.user;
  const isContractorUser = user?.role === 'contractor';

  const selectedCompanyId = form.watch('company');
  const selectedCompany = companiesData?.find((c: any) => c.id === selectedCompanyId) as any;

  // Function to calculate date ranges
  const calculateDateRange = (range: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case "thisWeek":
        // Get first day of week (Monday)
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + diffToMonday);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return null;
    }

    return {
      startDate: startDate,
      endDate: endDate
    };
  };

  // Watch the dateRange value to conditionally show date fields and auto-set dates
  const dateRangeValue = form.watch("dateRange");

  // Effect to auto-set dates when dateRange changes
  useEffect(() => {
    if (dateRangeValue && dateRangeValue !== "all") {
      const dateRange = calculateDateRange(dateRangeValue);
      if (dateRange) {
        form.setValue("date_start", dateRange.startDate);
        form.setValue("date_end", dateRange.endDate);
      }
    }
  }, [dateRangeValue, form]);

  // Create form list with dynamic company options
  const formList = {
    dateRange: {
      type: "select",
      name: "dateRange",
      label: t($ => $.smartCard.filters.dateRange),
      options: [
        { value: "all", label: t($ => $.smartCard.filters.allDate) },
        { value: "thisWeek", label: t($ => $.smartCard.filters.thisWeek) },
        { value: "thisMonth", label: t($ => $.smartCard.filters.thisMonth) },
        { value: "lastMonth", label: t($ => $.smartCard.filters.lastMonth) },
      ]
    },
    date_start: {
      type: "date",
      name: "date_start",
      label: t($ => $.smartCard.filters.dateStart),
    },
    date_end: {
      type: "date",
      name: "date_end",
      label: t($ => $.smartCard.filters.dateEnd),
    },
    category: {
      type: "select",
      name: "category",
      label: t($ => $.smartCard.filters.categoryLabel),
      options: isContractorUser && selectedCompany?.category
        ? Object.values(EMPLOYEE_TYPE).filter((opt: any) => opt.value === selectedCompany.category.toLowerCase())
        : [
            { value: "all", label: t($ => $.smartCard.filters.allCategory) },
            ...Object.values(EMPLOYEE_TYPE)
          ]
    },
    projectId: {
      type: "select",
      name: "projectId",
      label: t($ => $.employeeList.filterProject || "Project"),
      options: [
        { value: "all", label: t($ => $.smartCard.filters.allProjects) },
        ...(projectsData?.map((p: any) => ({
          value: p.value,
          label: p.label
        })) || []),
      ]
    },
    vesselId: {
      type: "select",
      name: "vesselId",
      label: t($ => $.employeeList.filterVessel || "Vessel"),
      options: [
        { value: "all", label: t($ => $.smartCard.filters.allVessel) },
        ...(isContractorUser && selectedCompany?.vessels
          ? selectedCompany.vessels.map((v: any) => ({
              value: v.id,
              label: v.vesselName || v.name
            }))
          : (vesselsData?.map((v: any) => ({
              value: v.id,
              label: v.name
            })) || []))
      ]
    },
    company: {
      type: "select",
      name: "company",
      label: t($ => $.smartCard.filters.company),
      options: [
        ...(!isContractorUser ? [{ value: "all", label: t($ => $.smartCard.filters.allCompany) }] : []),
        ...(companiesData?.map((company: Company) => ({
          value: company.id,
          label: company.name
        })) || []),
      ],
    },
    sortBy: {
      type: "select",
      name: "sortBy",
      label: t($ => $.smartCard.filters.sortBy),
      options: [
        { value: "employeeName", label: t($ => $.smartCard.filters.employeeName) },
        { value: "companyName", label: t($ => $.smartCard.filters.companyName) },
        { value: "position", label: t($ => $.smartCard.filters.position) },
        { value: "category", label: t($ => $.smartCard.filters.category) },
        { value: "totalSubmissions", label: t($ => $.smartCard.table.totalSubmission || "Total Submission") },
        { value: "rate", label: t($ => $.smartCard.table.rate || "Rate") },
      ]
    },
    orderBy: {
      type: "select",
      name: "orderBy",
      label: t($ => $.smartCard.filters.order),
      options: [
        { value: "asc", label: t($ => $.smartCard.filters.ascending) },
        { value: "desc", label: t($ => $.smartCard.filters.descending) },
      ]
    },
    limit: {
      type: "select",
      name: "limit",
      label: t($ => $.smartCard.filters.perPage),
      options: [
        { value: "10", label: "10" },
        { value: "20", label: "20" },
        { value: "30", label: "30" },
        { value: "40", label: "40" },
        { value: "50", label: "50" },
      ]
    }
  };

  const onSubmitClicked = () => {
    onSubmit(form.getValues());
  }

  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.smartCard,
      date_start: string_to_date(defaultStore.smartCard?.date_start),
      date_end: string_to_date(defaultStore.smartCard?.date_end),
      projectId: "all",
      vesselId: "all",
    };
    form.reset(resetData);
    onSubmit(form.getValues());
  }
  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">{t($ => $.smartCard.filters.title)}</h4>
        <p className="text-muted-foreground text-sm">
          {t($ => $.smartCard.filters.description)}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)} className={"grid grid-cols-1 gap-4"}>
          <div>
            <ControlForm form={form} item={formList?.dateRange} />
          </div>

          {/* Conditionally render date fields only when dateRange is not 'all' */}
          {dateRangeValue !== "all" && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <ControlForm form={form} item={formList?.date_start} />
              <ControlForm form={form} item={formList?.date_end} />
            </div>
          )}

          {/* Category Filter */}
          <div>
            <ControlForm form={form} item={formList?.category} />
          </div>

          {/* Project Filter */}
          {!(isContractorUser && selectedCompany?.category?.toLowerCase() === 'marine') && 
           (form.watch("category") === "all" || form.watch("category") === "project") && (
            <div>
              <ControlForm form={form} item={formList?.projectId} />
            </div>
          )}

          {/* Vessel Filter */}
          {isContractorUser 
            ? (selectedCompany?.vessels && selectedCompany.vessels.length > 0 && (
                <div>
                  <ControlForm form={form} item={formList?.vesselId} />
                </div>
              ))
            : ((form.watch("category") === "all" || form.watch("category") === "marine") && (
                <div>
                  <ControlForm form={form} item={formList?.vesselId} />
                </div>
              ))
          }

          <div>
            <ControlForm form={form} item={formList?.company} />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <ControlForm form={form} item={formList?.sortBy} />
            <ControlForm form={form} item={formList?.orderBy} />
          </div>

          <div className={"grid grid-cols-2 gap-2 mt-2"}>
            <Button variant={"destructive"} onClick={onResetClicked}>{t($ => $.shared.reset)}</Button>
            <Button>{t($ => $.shared.submit)}</Button>
          </div>
        </form>
      </Form>

    </div>
  );
};
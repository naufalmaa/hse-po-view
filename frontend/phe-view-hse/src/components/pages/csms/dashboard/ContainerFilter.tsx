import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { FormMultiSelect, FormSelect } from "@/components/custom/forms";
import { useContractorGet } from "@/service/contractor-api";
import { useEffect, useState } from "react";
import { defaultStore } from "@/stores/useAppStore";

interface ContainerFilterProps {
  form: ReturnType<typeof useForm>;
  onSubmit: (data: any) => void;
  setOpenFilter: (open: boolean) => void;
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter }: ContainerFilterProps) => {
  const { t } = useAppTranslation();
  const [contractorOptions, setContractorOptions] = useState<{ value: string; label: string }[]>([]);

  const contractorListQuery = useContractorGet();

  useEffect(() => {
    if (contractorListQuery.data) {
      const options = contractorListQuery.data.map((item: any) => ({
        value: item.id,
        label: item.name
      }));
      setContractorOptions(options);
    }
  }, [contractorListQuery.data]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => ({
    value: (currentYear + i).toString(),
    label: (currentYear + i).toString()
  }));

  // Define limit options
  const limitOptions = [10, 20, 30, 40, 50].map(value => ({
    value: value.toString(),
    label: value.toString()
  }));

  const onSubmitClicked = () => {
    let year = form.getValues("year");
    if (year.length === yearOptions.length) {
      year = [];
    } else {
      // Convert year strings to integers
      year = year.map((y: string) => parseInt(y, 10));
    }

    let sub_contractorId = form.getValues("contractorId");
    if (sub_contractorId.length === contractorOptions.length) {
      sub_contractorId = [];
    }

    // Get limit value and convert to integer
    let limit = form.getValues("limit");
    limit = limit ? parseInt(limit, 10) : 10;

    onSubmit({ year: year, contractorId: sub_contractorId, limit: limit });
    setOpenFilter(false);
  }

  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.csmsDashboard,
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitClicked)} className="space-y-4">
        <FormMultiSelect
          form={form}
          item={{
            name: "year",
            label: t($ => $.csms.dashboard.filter.year),
            placeholder: t($ => $.csms.dashboard.filter.selectYear),
            maxCount: 1,
            options: yearOptions
          }}
        />

        <FormMultiSelect
          form={form}
          item={{
            name: "contractorId",
            label: t($ => $.csms.dashboard.filter.contractor),
            placeholder: t($ => $.csms.dashboard.filter.selectContractor),
            maxCount: 1,
            options: contractorOptions
          }}
        />

        <FormSelect
          form={form}
          item={{
            name: "limit",
            label: t($ => $.csms.dashboard.filter.limit),
            placeholder: t($ => $.csms.dashboard.filter.selectLimit),
            options: limitOptions
          }}
        />

        <div className={"grid grid-cols-2 gap-2 mt-2"}>
          <Button
            type="button"
            variant="destructive"
            onClick={onResetClicked}
          >
            {t($ => $.shared.reset)}
          </Button>
          <Button type="submit" variant={"default"}>{t($ => $.shared.submit)}</Button>
        </div>
      </form>
    </Form>
  );
};

export default ContainerFilter;
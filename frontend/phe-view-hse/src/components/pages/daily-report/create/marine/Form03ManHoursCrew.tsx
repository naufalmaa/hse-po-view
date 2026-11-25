import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { marineFormList } from "../lib/marine-template";
import { Form } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
// Added imports for employee list functionality
import { useEmployeeList } from "@/service/employee/employee-list";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTable, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Button } from "@/components/ui/button";
import { RefreshCcwIcon } from "lucide-react";
import { APP_CONFIG } from "@/constants/config";
import { useReportDutyList } from "@/service/report";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: Record<string, any>,
  loading: boolean,
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  showAssetFiles?: boolean,
  parentForm?: any,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
  reportId: string
}

const Form03ManHoursCrew = ({
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading,
  formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentForm, showSaveButton = true, componentSaveButton, reportId
}: Props) => {
  const { t } = useAppTranslation();
  const formData = marineFormList?.manHours;
  const formItems = {
    pobContractor: {
      type: "text",
      name: "pobContractor",
      label: "POB Contractor",
      shortLabel: "POB Contractor",
      placeholder: "",
    },
    hoursPobContractor: {
      type: "number",
      name: "hoursPobContractor",
      label: "Hours per Day Contractor",
      shortLabel: "Daily Mandays",
      placeholder: "",
    }
  }
  //formData?.form;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  // Employee list state and mutation
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 10 });
  const employeeListMutation = useEmployeeList();

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({ ...formData?.defaultValue, ...defaultValues });
    }
  }, [defaultValues, parentForm]);

  const {
    data: reportDutyData,
    isLoading: isReportDutyLoading,
    error: reportDutyError,
    refetch: refetchReportDuty
  } = useReportDutyList({
    reportId: reportId,
    category: 'project',
    page: 0,
    limit: 100,
    options: {
      enabled: false
    }
  });

  useEffect(() => {
    syncDutyStatusList()
  }, []);

  const syncDutyStatusList = async () => {
    try {
      const result: Record<string, any> = await refetchReportDuty();
      const personnel = result?.data?.data ?? [];
      const pobPheOses = personnel.filter((item: any) => item?.subContractorId === APP_CONFIG.id.pheOsesId);
      const pobContractor = personnel.length - pobPheOses.length;
      form.setValue("pobContractor", pobContractor)
      setEmployeeData(result?.data ?? { data: [], meta: {} })
      showNotifSuccess({ message: result?.data?.message || "Sync successful" });
    } catch (error: any) {
      console.error("Error syncing overstay list", error);
      showNotifError({ message: error?.message || "Error syncing overstay list" });
    }
  }

  // Handle pagination change
  const handlePaginationChange = (newPagination: { page: number; limit: number }) => {
    setPagination({
      page: newPagination.page - 1, // Convert to 0-based index
      limit: newPagination.limit
    });
  };

  // Define table columns for employee list
  const columnRowNumber = createRowNumberColumn({
    accessorKey: "rowNum",
    id: "rowNum",
  });

  const columnName = {
    accessorKey: "employeeName",
    header: t($ => $.employeeList.table.name),
    enableSorting: false,
    size: 200,
    cell: ({ cell }: any) => {
      const name = cell.getValue() ?? "";
      return <div className={"text-sm font-medium"}>{name}</div>;
    }
  };

  const columSubContractor = {
    accessorKey: "subContractorName",
    header: t($ => $.employeeList.table.subContractorName),
    enableSorting: true,
    size: 150,
    minSize: 150,
    cell: ({ cell }: any) => {
      return <div className={""}>{cell.getValue()}</div>
    }
  };

  // Create table with only the required columns
  const { table } = useDataTable({
    data: employeeData?.data || [],
    columns: [columnRowNumber, columnName, columSubContractor],
    pageCount: -1,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  const onSubmitClicked_ = () => {
    const body = createFormData({ formKey, data: form.getValues(), supportingFiles: {} });
    onSubmitClicked(body);
  }

  return (
    <div className="flex flex-col gap-4">
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
        disabled={loading} showSaveButton={showSaveButton}>{componentSaveButton}</FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <div>{
          reportId === "" ? null : <Button variant={"outline"} onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            syncDutyStatusList();
          }}><RefreshCcwIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.syncPersonnel)}</Button>
        }
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <div className={"flex flex-col gap-4 p-1"}>
              <div className={"grid sm:grid-cols-2 grid-cols-1 gap-4"}>
                <ControlForm form={form} item={formItems?.pobContractor} disabled={true} className="bg-card" />
                {/* <ControlForm form={form} item={formItems?.hoursPobContractor} disabled={loading}/> */}
              </div>
            </div>
          </form>
        </Form>

        {/* Employee List Section */}
        <div className="mt-0">
          <h3 className="text-lg font-semibold mb-3">{t($ => $.employeeList.pageTitle)}</h3>
          {employeeListMutation.isPending ? (
            <div className="p-4 text-center">{t($ => $.employeeList.loading)}</div>
          ) : employeeListMutation.isError ? (
            <div className="p-4 text-center text-red-500">{t($ => $.employeeList.errorLoadingEmployees)}</div>
          ) : (
            <div className="rounded-lg">
              <DataTable
                table={table}
                totalRowCount={employeeData?.meta?.total ?? 0}
                className="border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default Form03ManHoursCrew
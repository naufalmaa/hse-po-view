import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "../lib/project-template";
import { Form, FormLabel } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import TableSmartCardWorker from "../components/TableSmartCardWorker";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
import { Separator } from "@/components/ui/separator";
import FormSupportedFiles from "./FormSupportedFiles";
import { Button } from "@/components/ui/button";
import { RefreshCcwIcon } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useReportCategory } from "@/service/report";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { MultiSelect } from "@/components/custom/components/MultiSelect";

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
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
  reportDate?: string,
  projectCategory: string
};

const Form09SmartCard = ({
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading,
  formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentForm, showUploadSupportingFiles = true, showSaveButton = true,
  componentSaveButton, reportDate = "", projectCategory = 'project'
}: Props) => {
  const { t } = useAppTranslation();
  const formData = formList?.smartCard;
  const formItems = formData?.form;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  // Initialize originalNonParticipants when form is ready
  useEffect(() => {
    if (parentForm && !defaultValues) {
      // When using parentForm, initialize originalNonParticipants with form's current value
      const currentNonParticipants = form.getValues()?.nonParticipants ?? [];
      setOriginalNonParticipants(currentNonParticipants);
    }
  }, [parentForm]);

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({ ...formData?.defaultValue, ...defaultValues });
      // Also update originalNonParticipants when form is reset
      const nonParticipants = defaultValues?.nonParticipants ?? [];
      setOriginalNonParticipants(nonParticipants);
    }
  }, [defaultValues, parentForm]);

  const [companies, setCompanies] = useState<Array<{ value: string, label: string }>>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [originalNonParticipants, setOriginalNonParticipants] = useState<any[]>([]);

  const {
    data: reportCategoryData,
    isLoading: isReportCategoryLoading,
    error: reportCategoryError,
    refetch: refetchReportCategory
  } = useReportCategory({
    date: reportDate,
    category: projectCategory,
    page: 0,
    limit: 100,
    options: {
      enabled: false // Don't auto-fetch, only fetch when syncSmartCard is called
    }
  });

  const onSubmitClicked_ = () => {
    const body = createFormData({ formKey, data: form.getValues(), supportingFiles: [] });
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({ formKey, data: { id: form.getValues().id, reportId: form.getValues().reportId }, supportingFiles: items });
    onSubmitClicked(body);
  }

  const syncSmartCard = async () => {
    try {
      // Call the API using the hook's refetch function
      const result: Record<string, any> = await refetchReportCategory();
      if (result?.data) {
        const response: Record<string, any> = result?.data;
        form.setValue("description", response?.data?.description ?? "");
        form.setValue("unsafeAction", response?.data?.unsafeAction ?? 0);
        form.setValue("unsafeCondition", response?.data?.unsafeCondition ?? 0);
        form.setValue("nearMiss", response?.data?.nearMiss ?? 0);
        form.setValue("processSafety", response?.data?.processSafety ?? 0);

        // Set the nonParticipants data
        const withoutObservations = response?.data?.withoutObservations ?? [];
        form.setValue("nonParticipants", withoutObservations);
        setOriginalNonParticipants(withoutObservations); // Store original data

        // Create unique companies array from withoutObservations
        const uniqueCompanies = Array.from(
          new Set(withoutObservations.map((item: any) => item.company))
        ).map(company => ({
          value: company as string,
          label: company as string
        })).filter(company => company.value); // Filter out empty values

        setCompanies(uniqueCompanies);
      }
      showNotifSuccess({ message: result?.data?.message || "Sync successful" });
    } catch (error: any) {
      console.error("Error syncing smart card", error);
      showNotifError({ message: error?.message || "Sync failed" });
    }
  };

  // Filter nonParticipants data based on selected companies
  const filteredNonParticipants = useMemo(() => {
    // Use form's current nonParticipants value if originalNonParticipants is empty
    let nonParticipants = (originalNonParticipants.length > 0) 
      ? originalNonParticipants 
      : (form.getValues()?.nonParticipants ?? []);
      
    if (selectedCompanies.length === 0) {
      // No filter applied, use all participants
    } else {
      nonParticipants = nonParticipants.filter((item: any) => selectedCompanies.includes(item.company));
    }

    form.setValue("nonParticipants", nonParticipants);
    return (nonParticipants);
  }, [originalNonParticipants, selectedCompanies]);

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
        disabled={loading} showSaveButton={showSaveButton}>
        <div className="flex flex-row gap-4">
          <Button variant={"outline"} onClick={syncSmartCard} disabled={loading}>
            <RefreshCcwIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.syncSmartCard)}
          </Button>
          {componentSaveButton}
        </div></FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <div>
              <ControlForm form={form} item={formItems?.description} disabled={loading} />
            </div>
            <div className={"grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.unsafeAction} disabled={loading} />
              <ControlForm form={form} item={formItems?.unsafeCondition} disabled={loading} />
              <ControlForm form={form} item={formItems?.nearMiss} disabled={loading} />
              <ControlForm form={form} item={formItems?.processSafety} disabled={loading} />
            </div>
            <div>
              <FormLabel className={""}>{formItems?.nonParticipants?.label}</FormLabel>

              {companies.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <FormLabel className="font-normal">Filter by Company</FormLabel>
                  <MultiSelect
                    options={companies}
                    onValueChange={setSelectedCompanies}
                    value={selectedCompanies}
                    placeholder="Select companies"
                    maxCount={2}
                    showClear={true}
                    showItemClear={false}
                    className="w-full"
                  />
                </div>
              )}
              <TableSmartCardWorker data={filteredNonParticipants}
                onDataUpdated={(data: Record<any, any>[]) => {
                  form.setValue("nonParticipants", data);
                }} />
            </div>

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
          </form>
        </Form>

        {showUploadSupportingFiles && <div className={"flex flex-col gap-2"}>
          <Separator />

          <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
            onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
            onSubmitAssets={onSubmitAssetsClicked_}
          />
        </div>}
      </div>
    </div>
  )
}
export default Form09SmartCard
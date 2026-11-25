import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "../lib/project-template";
import { Form, FormLabel } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import { useEffect, useState } from "react";
import FormTitle from "../components/FormTitle";
import { cn } from "@/lib/utils";
import TableDailyPersonnal from "../components/TableDailyPersonnal";
import TableInspection from "../components/TableInspection";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
import { Separator } from "@/components/ui/separator";
import FormSupportedFiles from "./FormSupportedFiles";
import { Button } from "@/components/ui/button";
import { RefreshCcwIcon, CopyIcon } from "lucide-react";
import { useReportDutyList, useReportWeather } from "@/service/report";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { separateMarineRegions } from "@/lib/lib-marine";
import { getWeatherDescription } from "@/lib/lib-open-meteo";
import { FiUserPlus } from "react-icons/fi";

type Props = {
  reportId: string;
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: Record<string, any>,
  loading: boolean,
  hsseIssues: any[],
  supportingFiles: any[],
  formKey: string;
  defaultAssetValues?: Record<string, any>,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  showAssetFiles?: boolean,
  parentForm?: any,
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  componentSaveButton?: React.ReactNode,
  reportDate: string
};

const Form11DailyHighlight = ({
  reportId, formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading, hsseIssues, supportingFiles,
  formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentForm, showUploadSupportingFiles = true, showSaveButton = true,
  componentSaveButton, reportDate = ""
}: Props) => {
  const { t } = useAppTranslation();
  const formData = formList?.dailyHighlights;
  const formItems = formData?.form;
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  const weatherQuery = useReportWeather(reportDate, { enabled: false });
  const [weatherData, setWeatherData] = useState<any>(null);
  const [openPopover, setOpenPopover] = useState(false);

  const syncWeather = async () => {
    try {
      const response: Record<string, any> = await weatherQuery.refetch();

      const status = response?.data?.success ?? false;
      if (status === false) {
        const message = response?.error?.response?.data?.message || t($ => $.dailyReport.marine.emlFileErrors.weatherFetchError);
        showNotifError({ message: message })
        return
      }

      const data = response?.data?.data;
      // Use the new function to separate regions
      const regions = separateMarineRegions(data?.regionWeather, data?.regionSealevel);

      // Process weather data for display
      const processedWeatherData = {
        sbu: {
          windSpeed: regions.sbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "",
          seaLevel: regions.sbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "",
          skyCondition: regions.sbu.weather?.hourly?.weather_code.at(-1)
            ? getWeatherDescription(regions.sbu.weather?.hourly?.weather_code.at(-1)).text
            : ""
        },
        nbu: {
          windSpeed: regions.nbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "",
          seaLevel: regions.nbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "",
          skyCondition: regions.nbu.weather?.hourly?.weather_code.at(-1)
            ? getWeatherDescription(regions.nbu.weather?.hourly?.weather_code.at(-1)).text
            : ""
        },
        cbu: {
          windSpeed: regions.cbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "",
          seaLevel: regions.cbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "",
          skyCondition: regions.cbu.weather?.hourly?.weather_code.at(-1)
            ? getWeatherDescription(regions.cbu.weather?.hourly?.weather_code.at(-1)).text
            : ""
        }
      };

      setWeatherData(processedWeatherData);
      setOpenPopover(true);
      showNotifSuccess({ message: t($ => $.dailyReport.marine.success.weatherSynced) });
    } catch (error) {
      console.error("Error syncing weather:", error);
      showNotifError({ message: t($ => $.dailyReport.marine.emlFileErrors.weatherFetchError) });
    }
  }

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues && !parentForm) {
      form.reset({ ...formData?.defaultValue, ...defaultValues });
    }
  }, [defaultValues, parentForm]);

  const onSubmitClicked_ = () => {
    const body = createFormData({ formKey, data: form.getValues(), supportingFiles: [] });
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    const body = createFormData({ formKey, data: { id: form.getValues().id, reportId: form.getValues().reportId }, supportingFiles: items });
    onSubmitClicked(body);
  }

  const fillWeatherField = (region: string) => {
    if (!weatherData) return;

    const regionData = weatherData[region.toLowerCase()];
    if (!regionData) return;

    const weatherText = `${region} - Wind Speed (Knot): ${regionData.windSpeed}, Sky Condition: ${regionData.skyCondition}, Sea Level (m): ${regionData.seaLevel}`;

    // Set the weather text to the form field
    form.setValue("weather", weatherText);

    // Show success notification
    showNotifSuccess({ message: t($ => $.dailyReport.weatherCopiedToForm) });

    // Close the popover
    setOpenPopover(false);
  };

  const {
    data: reportDutyData,
    isLoading: isReportDutyLoading,
    error: reportDutyError,
    refetch: refetchReportDuty
  } = useReportDutyList({
    reportId: reportId,
    category: 'project',
    page: 0,
    limit: 500,
    options: {
      enabled: false
    }
  });

  const syncDutyStatusList = async () => {
    try {
      const result: Record<string, any> = await refetchReportDuty();
      const personnel = result?.data?.data ?? [];
      const overstay = personnel
        .filter((item: any) => Number(item?.dob) >= 21)
        .map((item: any) => ({
          ...item,
          name: item?.employeeName || item?.name,
          employeeName: item?.employeeName || item?.name,
          company: item?.subContractorName || item?.company,
          subContractorName: item?.subContractorName || item?.company,
          dob: item?.dob,
        }));
      form.setValue("overstayPersonnel", overstay);
      showNotifSuccess({ message: result?.data?.message || "Sync successful" });
    } catch (error: any) {
      console.error("Error syncing overstay list", error);
      showNotifError({ message: error?.message || "Error syncing overstay list" });
    }
  }

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
        disabled={loading} showSaveButton={showSaveButton}>
        <div className="flex flex-row gap-4">
          <Popover open={openPopover} onOpenChange={setOpenPopover}>
            <PopoverTrigger asChild>
              <Button variant={"outline"} onClick={syncWeather} disabled={loading}>
                <RefreshCcwIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.syncWeather)}
              </Button>
            </PopoverTrigger>
            {weatherData && (
              <PopoverContent className="w-96">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">{t($ => $.dailyReport.marine.syncWeather)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t($ => $.dailyReport.marine.success.weatherSynced)}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {['SBU', 'NBU', 'CBU'].map((region) => {
                      const regionData = weatherData[region.toLowerCase()];
                      return (
                        <div key={region} className="grid grid-cols-12 items-start gap-2 p-2 border rounded-md">
                          <div className="font-bold col-span-2 self-center">{region}</div>
                          <div className="col-span-8 space-y-1">
                            <div className="text-sm">
                              <span className="font-medium">Wind:</span> {regionData.windSpeed}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Sky:</span> {regionData.skyCondition}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Sea:</span> {regionData.seaLevel}
                            </div>
                          </div>
                          <div className="col-span-2 self-center flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => fillWeatherField(region)}
                              title={t($ => $.dailyReport.copyToWeatherField)}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground text-right">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            )}
          </Popover>
          {componentSaveButton}
        </div>
      </FormTitle>
      <div className={"flex flex-col gap-4 p-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <ControlForm form={form} item={formItems?.dailyActivities} disabled={loading} />
            <ControlForm form={form} item={formItems?.dailyNextPlan} disabled={loading} />
            <ControlForm form={form} item={formItems?.weather} disabled={loading} />

            <div>
              <FormLabel className={""}>{formItems?.overstayPersonnel?.label}</FormLabel>
              <TableDailyPersonnal data={form.getValues()?.overstayPersonnel ?? []}
                onDataUpdated={(data: Record<any, any>[]) => {
                  form.setValue("overstayPersonnel", data);
                }}
                tableComponent={
                  reportId === "" ? null : <Button variant={"outline"} onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    syncDutyStatusList();
                  }}><RefreshCcwIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.syncPersonnel)}</Button>
                }
              />
            </div>

            <div>
              <FormLabel className={"mb-2"}>{formItems?.hsseIssues?.label}</FormLabel>
              <TableInspection data={hsseIssues} disableAction={true} supportingFiles={supportingFiles} />
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
export default Form11DailyHighlight
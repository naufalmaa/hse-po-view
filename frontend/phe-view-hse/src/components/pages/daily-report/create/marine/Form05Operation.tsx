import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { marineFormList } from "../lib/marine-template";
import { Form } from "@/components/ui/form";
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { Separator } from "@/components/ui/separator";
import FormSupportedFiles from "@/components/pages/daily-report/create/project/FormSupportedFiles";
import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { createFormData } from "@/components/pages/daily-report/create/lib/utils";
import { Button } from "@/components/ui/button";
import { useReportWeather } from "@/service/report";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { RefreshCcwIcon, FileTextIcon } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";

// Added import for eml-parse-js library
import { parseEml, readEml } from 'eml-parse-js';
import { convertListJsonVesselToActivityText, extractMarineTableEMl, separateMarineRegions } from "@/lib/lib-marine";
import { getWeatherDescription } from "@/lib/lib-open-meteo";
// Added import for Tabs components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDailyReportReadFile } from "@/service/daily-report-api";

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
  onDeleteAssets: (item: any) => void;
  showAssetFiles?: boolean,
  parentFormSbu?: any,
  parentFormNbu?: any,
  parentFormCbu?: any,
  showUploadSupportingFiles?: boolean,
  showSaveButton?: boolean,
  reportDate: string,
  componentSaveButton?: React.ReactNode,
};

const Form05Operation = ({
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading,
  formKey, defaultAssetValues, onEditAssets, onDeleteAssets, showAssetFiles = true,
  parentFormSbu, parentFormNbu, parentFormCbu, showUploadSupportingFiles = true, showSaveButton = true,
  reportDate = "", componentSaveButton
}: Props) => {
  const { t } = useAppTranslation();
  const formData = marineFormList?.operation;
  const formItems = formData?.form;
  
  // Hook for reading .msg files
  const { mutateAsync: readFileAsync } = useDailyReportReadFile();
  
  const form_sbu = parentFormSbu || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue
  });

  const form_nbu = parentFormNbu || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue
  });

  const form_cbu = parentFormCbu || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue
  });

  // State for active tab
  const [activeTab, setActiveTab] = useState("sbu");

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      let sbu_ = defaultValues.find((item: any) => item.region === "SBU");
      let nbu_ = defaultValues.find((item: any) => item.region === "NBU");
      let cbu_ = defaultValues.find((item: any) => item.region === "CBU");

      if (!sbu_) {
        sbu_ = formData?.defaultValue;
        sbu_.region = "SBU";
      }
      if (!nbu_) {
        nbu_ = formData?.defaultValue;
        nbu_.region = "NBU";
      }
      if (!cbu_) {
        cbu_ = formData?.defaultValue;
        cbu_.region = "CBU";
      }

      form_sbu.reset(sbu_);
      form_nbu.reset(nbu_);
      form_cbu.reset(cbu_);
    }
  }, [defaultValues]);

  const weatherQuery = useReportWeather(reportDate, { enabled: false });

  const isLoading = () => {
    return loading
      || weatherQuery.isFetching;
  }


  const syncWeather = async () => {
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

    // Sync SBU
    if (regions.sbu.weather) {
      form_sbu.setValue("windSpeed", regions.sbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "");
      const weatherCode = regions.sbu.weather?.hourly?.weather_code.at(-1) ?? "";
      const weatherDescription = weatherCode ? getWeatherDescription(weatherCode).text : "";
      form_sbu.setValue("skyCondition", weatherDescription);
    }
    if (regions.sbu.seaLevel) {
      form_sbu.setValue("seaLevel", regions.sbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "");
    }

    // Sync NBU
    if (regions.nbu.weather) {
      form_nbu.setValue("windSpeed", regions.nbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "");
      const weatherCode = regions.nbu.weather?.hourly?.weather_code.at(-1) ?? "";
      const weatherDescription = weatherCode ? getWeatherDescription(weatherCode).text : "";
      form_nbu.setValue("skyCondition", weatherDescription);
    }
    if (regions.nbu.seaLevel) {
      form_nbu.setValue("seaLevel", regions.nbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "");
    }

    // Sync CBU
    if (regions.cbu.weather) {
      form_cbu.setValue("windSpeed", regions.cbu.weather?.hourly?.wind_speed_10m.at(-1) ?? "");
      const weatherCode = regions.cbu.weather?.hourly?.weather_code.at(-1) ?? "";
      const weatherDescription = weatherCode ? getWeatherDescription(weatherCode).text : "";
      form_cbu.setValue("skyCondition", weatherDescription);
    }
    if (regions.cbu.seaLevel) {
      form_cbu.setValue("seaLevel", regions.cbu.seaLevel?.hourly?.sea_level_height_msl.at(-1) ?? "");
    }

    showNotifSuccess({ message: t($ => $.dailyReport.marine.success.weatherSynced) });
  }

  const formDataAssets = formList?.supportingFiles;
  const formAssets = useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formDataAssets?.defaultValue,
  });

  const onSubmitClicked_ = () => {
    let body = createFormData({
      formKey,
      data: {},
      supportingFiles: formAssets.getValues()
    });

    const files_ = body?.["data"]?.["files"] ?? [];
    body["data"] = { data: [form_sbu.getValues(), form_nbu.getValues(), form_cbu.getValues()], files: files_ };
    onSubmitClicked(body);
  }

  const onSubmitAssetsClicked_ = (items: Record<string, any>) => {
    // const body = createFormData({formKey, data: {id: form.getValues().id, reportId: form.getValues().reportId}, supportingFiles: items});
    // onSubmitClicked(body);
  }

  // Reference for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for tracking EML file processing
  const [isProcessingEml, setIsProcessingEml] = useState(false);

  // Function to handle EML file selection
  const handleEmlFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Function to process the selected EML or MSG file
  const handleEmlFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Set processing state to true
      setIsProcessingEml(true);

      // Check if the file is an EML or MSG file
      if (!file.name.toLowerCase().endsWith('.eml') && !file.name.toLowerCase().endsWith('.msg')) {
        showNotifError({ message: t($ => $.dailyReport.marine.emlFileErrors.invalidFile) });
        setIsProcessingEml(false);
        return;
      }

      // Process .msg files using the new API
      if (file.name.toLowerCase().endsWith('.msg')) {
        
        try {
          const result = await readFileAsync({ file });
          
          if (result.success) {
            // Extract HTML content from the parsed MSG
            const emailHtml = result.data.body || '';
            const subject = result.data.header?.subject || "Untitled Email";
            
            showNotifSuccess({ message: t($ => $.dailyReport.marine.success.emlLoaded, { subject }) });
            
            // Process the email content similar to EML files
            const sbuJson = extractMarineTableEMl(emailHtml, "SOUTH AREA");
            const nbuJson = extractMarineTableEMl(emailHtml, "NORTH AREA");
            const cbuJson = extractMarineTableEMl(emailHtml, "CENTRAL AREA");

            const text_sbu = convertListJsonVesselToActivityText(sbuJson);
            const text_nbu = convertListJsonVesselToActivityText(nbuJson);
            const text_cbu = convertListJsonVesselToActivityText(cbuJson);
            
            form_sbu.setValue("currentHiPoActivity", text_sbu ?? "");
            form_sbu.setValue("forecastHiPoActivity", text_sbu ?? "");
            form_nbu.setValue("currentHiPoActivity", text_nbu ?? "");
            form_nbu.setValue("forecastHiPoActivity", text_nbu ?? "");
            form_cbu.setValue("currentHiPoActivity", text_cbu ?? "");
            form_cbu.setValue("forecastHiPoActivity", text_cbu ?? "");
          } else {
            throw new Error(result.message || t($ => $.dailyReport.marine.emlFileErrors.parseError));
          }
        } catch (error) {
          console.error("Error processing MSG file:", error);
          showNotifError({ message: error instanceof Error ? error.message : t($ => $.dailyReport.marine.emlFileErrors.parseError) });
        } finally {
          setIsProcessingEml(false);
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        // Process .eml files with existing logic
        // Read the file content
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const emlContent = e.target?.result as string;

            // Parse the EML content
            const parsedEml = parseEml(emlContent);

            // Check if parsing resulted in an error
            if (parsedEml instanceof Error) {
              throw parsedEml;
            }

            // Read the parsed EML content with explicit typing
            const emailObject = readEml(parsedEml);

            // Check if reading resulted in an error
            if (emailObject instanceof Error) {
              throw emailObject;
            }

            // Type guard to ensure emailObject is ReadedEmlJson and not a string
            if (typeof emailObject === 'string') {
              throw new Error(t($ => $.dailyReport.marine.emlFileErrors.invalidFormat));
            }

            // Show success notification with email subject
            const subject = emailObject.subject || "Untitled Email";
            showNotifSuccess({ message: t($ => $.dailyReport.marine.success.emlLoaded, { subject }) });

            // Here you could process the email data further as needed
            // For example, populate form fields with email content
            const emailHtml = emailObject.html || '';
            const sbuJson = extractMarineTableEMl(emailHtml, "SOUTH AREA");
            const nbuJson = extractMarineTableEMl(emailHtml, "NORTH AREA");
            const cbuJson = extractMarineTableEMl(emailHtml, "CENTRAL AREA");

            const text_sbu = convertListJsonVesselToActivityText(sbuJson);
            const text_nbu = convertListJsonVesselToActivityText(nbuJson);
            const text_cbu = convertListJsonVesselToActivityText(cbuJson);
            
            form_sbu.setValue("currentHiPoActivity", text_sbu ?? "");
            form_sbu.setValue("forecastHiPoActivity", text_sbu ?? "");
            form_nbu.setValue("currentHiPoActivity", text_nbu ?? "");
            form_nbu.setValue("forecastHiPoActivity", text_nbu ?? "");
            form_cbu.setValue("currentHiPoActivity", text_cbu ?? "");
            form_cbu.setValue("forecastHiPoActivity", text_cbu ?? "");


            // Reset the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (error) {
            console.error("Error parsing EML file:", error);
            showNotifError({ message: t($ => $.dailyReport.marine.emlFileErrors.parseError) });
          } finally {
            // Always set processing state to false when done
            setIsProcessingEml(false);
          }
        };

        reader.onerror = () => {
          showNotifError({ message: t($ => $.dailyReport.marine.emlFileErrors.readError) });
          setIsProcessingEml(false);
        };

        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      showNotifError({ message: t($ => $.dailyReport.marine.emlFileErrors.processingError) });
      setIsProcessingEml(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input for EML files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleEmlFileChange}
        accept=".eml,.msg"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div>
        <FormTitle form={form_sbu} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
          disabled={isLoading()} showSaveButton={showSaveButton}>
          <Button variant={"outline"} onClick={syncWeather} disabled={isLoading()}><RefreshCcwIcon /> {t($ => $.dailyReport.marine.syncWeather)}</Button>
          {/* Added EML file load button */}
          <Button variant={"outline"} onClick={handleEmlFileSelect} disabled={isLoading() || isProcessingEml}>
            {isProcessingEml ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                <span>{t($ => $.dailyReport.marine.processing)}</span>
              </>
            ) : (
              <>
                <FileTextIcon className="mr-2 h-4 w-4" /> {t($ => $.dailyReport.marine.loadMailFile)}
              </>
            )}
          </Button>
          {componentSaveButton}
        </FormTitle>

        {/* Tabs implementation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sbu">{form_sbu.getValues().region}</TabsTrigger>
            <TabsTrigger value="nbu">{form_nbu.getValues().region}</TabsTrigger>
            <TabsTrigger value="cbu">{form_cbu.getValues().region}</TabsTrigger>
          </TabsList>

          <TabsContent value="sbu">
            <Form {...form_sbu}>
              <form onSubmit={form_sbu.handleSubmit(onSubmitClicked)} className={cn(className, "")} onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}>
                <div className={"flex flex-col gap-4 p-4"}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_sbu} item={formItems?.currentHiPoActivity} disabled={loading} />
                    <ControlForm form={form_sbu} item={formItems?.forecastHiPoActivity} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_sbu} item={formItems?.windSpeed} disabled={loading} />
                    <ControlForm form={form_sbu} item={formItems?.seaLevel} disabled={loading} />
                    <ControlForm form={form_sbu} item={formItems?.skyCondition} disabled={loading} />
                    <ControlForm form={form_sbu} item={formItems?.pitchingRolling} disabled={loading} />
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="nbu">
            <Form {...form_nbu}>
              <form className={cn(className, "")} onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}>
                <div className={"flex flex-col gap-4 p-4"}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_nbu} item={formItems?.currentHiPoActivity} disabled={loading} />
                    <ControlForm form={form_nbu} item={formItems?.forecastHiPoActivity} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_nbu} item={formItems?.windSpeed} disabled={loading} />
                    <ControlForm form={form_nbu} item={formItems?.seaLevel} disabled={loading} />
                    <ControlForm form={form_nbu} item={formItems?.skyCondition} disabled={loading} />
                    <ControlForm form={form_nbu} item={formItems?.pitchingRolling} disabled={loading} />
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="cbu">
            <Form {...form_cbu}>
              <form className={cn(className, "")} onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}>
                <div className={"flex flex-col gap-4 p-4"}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_cbu} item={formItems?.currentHiPoActivity} disabled={loading} />
                    <ControlForm form={form_cbu} item={formItems?.forecastHiPoActivity} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ControlForm form={form_cbu} item={formItems?.windSpeed} disabled={loading} />
                    <ControlForm form={form_cbu} item={formItems?.seaLevel} disabled={loading} />
                    <ControlForm form={form_cbu} item={formItems?.skyCondition} disabled={loading} />
                    <ControlForm form={form_cbu} item={formItems?.pitchingRolling} disabled={loading} />
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>

      {showUploadSupportingFiles && <div className={"flex flex-col gap-2"}>
        <Separator />

        <FormSupportedFiles defaultValues={defaultAssetValues} onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets} showAssetFiles={showAssetFiles}
          onSubmitAssets={onSubmitAssetsClicked_}
        />
      </div>}
    </div>
  )
}
export default Form05Operation
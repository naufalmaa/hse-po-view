import Form01Identity from "./Form01Identity";
import { TabListReportProps } from "./lib/constants";
import { formList, tabListProjectReport } from "./lib/project-template";
import { marineFormList } from "./lib/marine-template";
import { useEffect, useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { Button } from "@/components/ui/button";
import { createBodyParam as identityCreateBodyParam } from "./Form01Identity";
import Form02Lagging from "./project/Form02Lagging";
import Form03ManHours from "./project/Form03ManHours";
// import Form04Meeting from "./project/Form04Meeting";
import Form05Drill from "./project/Form05Drill";
import Form06Training from "./project/Form06Training";
import FormInspection from "./marine/FormInspection";
import Form09SmartCard from "./project/Form09SmartCard";
import Form10PermitToWork from "./project/Form10PermitToWork";
import Form11DailyHighlight from "./project/Form11DailyHighlight";
import { Input } from "@/components/ui/input";
import { RiFileExcel2Line, RiCloseLine } from "react-icons/ri";
import { Loader2 } from "lucide-react";
import { IoSaveOutline } from "react-icons/io5";
import Step02ProjectTab from "./Step02ProjectTab";
import { Separator } from "@/components/ui/separator";

type Props = {
  loading: boolean,
  data: Record<string, any> | null,
  formClassName: string,
  onDataUpdated: (body: Record<any, any>) => void,
  subTypes: any[],
  userRole: string,
  fileInputRef: any,
  handleImportFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>,
  loadingImport: boolean,
  importedData: Record<string, any> | null,
  setImportedData: React.Dispatch<React.SetStateAction<Record<string, any> | null>>
}

const FormProjectFromFile = ({
  data, loading, formClassName, onDataUpdated, subTypes, userRole,
  fileInputRef, handleImportFileChange, loadingImport,
  importedData, setImportedData
}: Props) => {
  const [stepPosition, setStepPosition] = useState<string>("identity");
  const { uploadFile, preUseInspection, meeting, permitToWork, manHours, ...tabList }: TabListReportProps = { ...tabListProjectReport }

  const formIdentity = useForm<any>({
    resolver: zodResolver(z.object(formList?.identity?.schema)),
    defaultValues: formList?.identity?.defaultValue,
  });

  const formLagging = useForm<any>({
    resolver: zodResolver(z.object(formList?.laggingIndicator?.schema)),
    defaultValues: formList?.laggingIndicator?.defaultValue,
  });

  // const formManHours = useForm<any>({
  //   resolver: zodResolver(z.object(formList?.manHours?.schema)),
  //   defaultValues: formList?.manHours?.defaultValue,
  // });

  const formMeeting = useForm<any>({
    resolver: zodResolver(z.object(formList?.meeting?.schema)),
    defaultValues: formList?.meeting?.defaultValue,
  });

  const formDrill = useForm<any>({
    resolver: zodResolver(z.object(formList?.drill?.schema)),
    defaultValues: formList?.drill?.defaultValue,
  });

  const formTraining = useForm<any>({
    resolver: zodResolver(z.object(formList?.training?.schema)),
    defaultValues: formList?.training?.defaultValue,
  });

  const formInspection = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.inspection?.schema)),
    defaultValues: marineFormList?.inspection?.defaultValue,
  });

  const formSmartCard = useForm<any>({
    resolver: zodResolver(z.object(formList?.smartCard?.schema)),
    defaultValues: formList?.smartCard?.defaultValue,
  });

  const formPermitToWork = useForm<any>({
    resolver: zodResolver(z.object(formList?.permitToWork?.schema)),
    defaultValues: formList?.permitToWork?.defaultValue,
  });

  const formDailyHighlights = useForm<any>({
    resolver: zodResolver(z.object(formList?.dailyHighlights?.schema)),
    defaultValues: formList?.dailyHighlights?.defaultValue,
  });

  // Add this effect to update form values when data changes
  useEffect(() => {
    if (data?.identity) {
      formIdentity.reset({ ...data.identity, reportDate: new Date(data?.identity?.reportDate) });
    }
    if (data?.lagging) {
      formLagging.reset({ ...formList?.laggingIndicator?.defaultValue, ...data.lagging });
    }
    // if (data?.manhours) {
    //   formManHours.reset({ ...formList?.manHours?.defaultValue, ...data.manhours });
    // }
    if (data?.meeting) {
      formMeeting.reset({ ...formList?.meeting?.defaultValue, ...data.meeting });
    }
    if (data?.drill) {
      formDrill.reset({ ...formList?.drill?.defaultValue, ...data.drill });
    }
    if (data?.training) {
      formTraining.reset({ ...formList?.training?.defaultValue, ...data.training });
    }
    if (data?.inspection) {
      formInspection.reset({ ...marineFormList?.inspection?.defaultValue, ...data.inspection });
    }
    if (data?.smartCard) {
      formSmartCard.reset({ ...formList?.smartCard?.defaultValue, ...data.smartCard });
    }
    if (data?.permitToWork) {
      formPermitToWork.reset({ ...formList?.permitToWork?.defaultValue, ...data.permitToWork });
    }
    if (data?.dailyHighlights) {
      formDailyHighlights.reset({ ...formList?.dailyHighlights?.defaultValue, ...data.dailyHighlights });
    }
  }, [data]);

  const onDataUpdated_ = () => {
    let identity_ = identityCreateBodyParam(formIdentity.getValues());

    // update inspection
    let inspection_ = formInspection.getValues();
    let inspections = [];
    if (inspection_?.finding !== "") {
      const inspection_type = inspection_?.finding?.toLowerCase()?.includes("pre used") ? "pre_use" : "field";
      const deadline = date_to_string(inspection_?.deadline ?? new Date(), APP_CONFIG.dayFormat);
      inspections.push({ ...inspection_, type: inspection_type, deadline: deadline });
    }
    const result = {
      ...identity_,
      lagging: formLagging.getValues(),
      // manhours: formManHours.getValues(),
      // meeting: formMeeting.getValues(),
      drill: formDrill.getValues(),
      training: formTraining.getValues(),
      inspections: inspections,
      smartCard: formSmartCard.getValues(),
      permit: formPermitToWork.getValues(),
      highlight: formDailyHighlights.getValues(),
    }
    onDataUpdated(result);
  }

  return (
    <div className={"flex flex-col gap-0"}>
      <div className={"grid sm:grid-cols-[300px_1fr] grid-cols-1 gap-4 px-0 pr-2 "}>
        <div></div>
        <div className={"flex flex-col gap-1 py-2"}>
          <div className={"text-xs text-muted-foreground"}>Complete the following fields or Upload excel</div>
          <div className={"flex flex-row gap-2 w-full"}>
            <div className="relative w-full">
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleImportFileChange}
                className="hidden"
              />

              {importedData?.fileName ? (
                <div className="flex items-center h-8 px-0 py-1 text-sm gap-2">
                  <span className="truncate max-w-xs bg-secondary p-1 rounded-xl">
                    {importedData.fileName}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className={"text-blue-500 bg-secondary px-2 rounded-xl h-7"}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  className={""}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RiFileExcel2Line /> Upload Excel Form
                </Button>
              )}
            </div>
            {importedData && <div>
              {loadingImport ?
                <div className={"flex flex-col justify-center items-center"}>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </div>
                :
                <div className={"flex flex-row gap-2"}>
                  <Button onClick={onDataUpdated_}><IoSaveOutline /> Save All</Button>
                  <Button variant={"outline"}
                    className={"border-destructive text-destructive hover:bg-destructive hover:text-background"}
                    onClick={() => {
                      setImportedData(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  ><RiCloseLine /> Cancel</Button>
                </div>
              }
            </div>}
          </div>
        </div>
      </div>

      <Separator className="" />
      <div className="grid lg:grid-cols-[300px_1fr] grid-cols-1 gap-0">
        <div className="border-r border-border bg-muted/30 p-4">
          <Step02ProjectTab tabList={tabList} stepPosition={stepPosition} setStepPosition={setStepPosition} />
        </div>

        <div className={"flex flex-col gap-4 p-4"}>
          <div style={{ display: stepPosition === tabList["identity"].value ? 'block' : 'none' }}>
            <Form01Identity
              parentForm={formIdentity}
              formTitle={tabList["identity"].label}
              formDescription={tabList["identity"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.identity}
              loading={loading}
              disableEditing={true}
              subTypes={subTypes}
              userRole={userRole}
              showSaveButton={false}
            />
          </div>

          <div style={{ display: stepPosition === tabList["laggingIndicator"].value ? 'block' : 'none' }}>
            <Form02Lagging
              parentForm={formLagging}
              formKey="lagging"
              formTitle={tabList["laggingIndicator"].label}
              formDescription={tabList["laggingIndicator"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.lagging}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
            />
          </div>

          {/* <div style={{ display: stepPosition === tabList["manHours"].value ? 'block' : 'none' }}>
            <Form03ManHours
              reportId={data?.id || ""}
              parentForm={formManHours}
              formKey="manhours"
              formTitle={tabList["manHours"].label}
              formDescription={tabList["manHours"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.manhours}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
            />
          </div> */}

          {/* <div style={{display: stepPosition === tabList["meeting"].value ? 'block' : 'none'}}>
            <Form04Meeting
              parentForm={formMeeting}
              formKey="meeting"
              formTitle={tabList["meeting"].label}
              formDescription={tabList["meeting"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.meeting}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
            />
          </div> */}

          <div style={{ display: stepPosition === tabList["drill"].value ? 'block' : 'none' }}>
            <Form05Drill
              parentForm={formDrill}
              formKey="drill"
              formTitle={tabList["drill"].label}
              formDescription={tabList["drill"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.drill}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
            />
          </div>

          <div style={{ display: stepPosition === tabList["training"].value ? 'block' : 'none' }}>
            <Form06Training
              parentForm={formTraining}
              formKey="training"
              formTitle={tabList["training"].label}
              formDescription={tabList["training"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.training}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
            />
          </div>

          <div style={{ display: stepPosition === tabList["inspection"].value ? 'block' : 'none' }}>
            <FormInspection
              parentForm={formTraining}
              formKey="inspection"
              formTitle={tabList["inspection"].label}
              formDescription={tabList["inspection"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={[data?.inspection]}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              onSubmitAssetsClicked={() => {
              }}
              onSectionDelete={() => {
              }}
              supportingFiles={[]}
              showAssetFiles={false}
              showSaveButton={false}
              enableEdit={false}
            />
          </div>

          <div style={{ display: stepPosition === tabList["smartCard"].value ? 'block' : 'none' }}>
            <Form09SmartCard
              parentForm={formSmartCard}
              formKey="smartCard"
              formTitle={tabList["smartCard"].label}
              formDescription={tabList["smartCard"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.smartCard}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
              projectCategory="project"
              reportDate={formIdentity.getValues().reportDate}
            />
          </div>

          {/* <div style={{display: stepPosition === tabList["permitToWork"].value ? 'block' : 'none'}}>
            <Form10PermitToWork
              parentForm={formPermitToWork}
              formKey="permit"
              formTitle={tabList["permitToWork"].label}
              formDescription={tabList["permitToWork"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.permitToWork}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showSaveButton={false}
            />
          </div> */}

          <div style={{ display: stepPosition === tabList["dailyHighlights"].value ? 'block' : 'none' }}>
            <Form11DailyHighlight
              reportId={data?.id || ""}
              reportDate={formIdentity.getValues().reportDate}
              parentForm={formDailyHighlights}
              formKey="highlight"
              formTitle={tabList["dailyHighlights"].label}
              formDescription={tabList["dailyHighlights"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.dailyHighlights}
              loading={loading}
              onEditAssets={() => {
              }}
              onDeleteAssets={() => {
              }}
              defaultAssetValues={[]}
              showAssetFiles={false}
              showUploadSupportingFiles={false}
              showSaveButton={false}
              hsseIssues={[]}
              supportingFiles={[]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
export default FormProjectFromFile
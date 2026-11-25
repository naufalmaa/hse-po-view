import Form01Identity from "./Form01Identity";
import { TabListReportProps } from "./lib/constants";
import { formList } from "./lib/project-template";
import { marineFormList, tabListMarineReport } from "./lib/marine-template";
import { useEffect, useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createBodyParam as identityCreateBodyParam } from "./Form01Identity";
import Form02Lagging from "./marine/Form02Lagging";
import Form09SmartCard from "./marine/Form09SmartCard";
import Form05Operation from "./marine/Form05Operation";
import { Input } from "@/components/ui/input";
import { RiFileExcel2Line, RiCloseLine } from "react-icons/ri";
import { Loader2 } from "lucide-react";
import { IoSaveOutline } from "react-icons/io5";
import { Separator } from "@/components/ui/separator";
import Step02MarineTab from "./Step02MarineTab";

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

const FormMarineFromFile = ({
  data, loading, formClassName, onDataUpdated, subTypes, userRole,
  fileInputRef, handleImportFileChange, loadingImport,
  importedData, setImportedData
}: Props) => {
  const [stepPosition, setStepPosition] = useState<string>("identity");
  const {
    uploadFile,
    preUseInspection,
    manHours,
    meeting,
    drill,
    training,
    inspection,
    permitToWork,
    vesselUnderPnO,
    
    ...tabList
  }: TabListReportProps = { ...tabListMarineReport };

  const formIdentity = useForm<any>({
    resolver: zodResolver(z.object(formList?.identity?.schema)),
    defaultValues: formList?.identity?.defaultValue,
  });

  const formLagging = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.laggingIndicator?.schema)),
    defaultValues: formList?.laggingIndicator?.defaultValue,
  });

  const formMeeting = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.meeting?.schema)),
    defaultValues: marineFormList?.meeting?.defaultValue,
  });
  const formSmartCard = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.smartCard?.schema)),
    defaultValues: formList?.smartCard?.defaultValue,
  });
  const formOperationSbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });
  const formOperationNbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });
  const formOperationCbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });

  // Add this effect to update form values when data changes
  useEffect(() => {
    if (data?.identity) {
      formIdentity.reset({ ...data.identity, reportDate: new Date(data?.identity?.reportDate) });
    }
    if (data?.lagging) {
      formLagging.reset({ ...marineFormList?.laggingIndicator?.defaultValue, ...data.lagging });
    }
    if (data?.meeting) {
      formMeeting.reset({ ...marineFormList?.meeting?.defaultValue, ...data.meeting });
    }
    if (data?.smartCard) {
      formSmartCard.reset({ ...marineFormList?.smartCard?.defaultValue, ...data.smartCard });
    }
    if (data?.operation) {
      formOperationSbu.reset(data.operation.filter((item: any) => item.region === "SBU")?.[0] ?? marineFormList?.operation?.defaultValue);
      formOperationNbu.reset(data.operation.filter((item: any) => item.region === "NBU")?.[0] ?? marineFormList?.operation?.defaultValue);
      formOperationCbu.reset(data.operation.filter((item: any) => item.region === "CBU")?.[0] ?? marineFormList?.operation?.defaultValue);
    }
  }, [data]);

  const onDataUpdated_ = () => {
    let identity_ = identityCreateBodyParam(formIdentity.getValues());

    const result = {
      ...identity_,
      lagging: formLagging.getValues(),
      meeting: formMeeting.getValues(),
      smartCard: formSmartCard.getValues(),
      operations: [formOperationSbu.getValues(), formOperationNbu.getValues(), formOperationCbu.getValues()],
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
          <Step02MarineTab stepPosition={stepPosition} setStepPosition={setStepPosition} userRole={""}/>
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
            />
          </div>

          <div style={{ display: stepPosition === tabList["operation"].value ? 'block' : 'none' }}>
            <Form05Operation
              reportDate={formIdentity.getValues().reportDate}
              parentFormSbu={formOperationSbu}
              parentFormNbu={formOperationNbu}
              parentFormCbu={formOperationCbu}
              formKey="operation"
              formTitle={tabList["operation"].label}
              formDescription={tabList["operation"].desc}
              onSubmitClicked={onDataUpdated}
              className={formClassName}
              defaultValues={data?.operation}
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
        </div>
      </div>
    </div >
  )
}
export default FormMarineFromFile
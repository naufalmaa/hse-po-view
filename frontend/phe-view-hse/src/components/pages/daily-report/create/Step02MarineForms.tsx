import * as React from "react";
import { tabListMarineReport } from "./lib/marine-template";

import Form02Lagging from "./project/Form02Lagging";
import Form03ManHours from "./marine/Form03ManHours";
import Form09SmartCard from "./project/Form09SmartCard";
import Form05Operation from "./marine/Form05Operation";
import FormMeeting from "./marine/FormMeeting";
import FormDrill from "./marine/FormDrill";
import FormTraining from "./marine/FormTraining";
import FormMarineInspection from "./marine/FormMarineInspection";
import Form12UploadFile from "./Form12UploadFile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { marineFormList } from "@/components/pages/daily-report/create/lib/marine-template";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { LuSave } from "react-icons/lu";
import { isCrewString } from "@/types/auth";
import Form03ManHoursCrew from "./marine/Form03ManHoursCrew";

type Props = {
  onBackClick?: () => void;
  onSubmitClicked: (objKey: string, obj: Record<any, any>) => void;
  className?: string
  data?: Record<string, any>;
  stepPosition: string,
  loading: boolean,
  vesselList: any,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  onSectionDelete: (type: string, id: string) => void,
  userRole: string
}

export const Step02MarineForms = ({
  onBackClick, onSubmitClicked, className, data,
  stepPosition, loading, vesselList, onEditAssets, onDeleteAssets, onSectionDelete,
  userRole
}: Props) => {
  const { identity, manHours, ...tabList } = tabListMarineReport;

  const formLagging = useForm<any>({
    resolver: zodResolver(z.object(formList?.laggingIndicator?.schema)),
    defaultValues: formList?.laggingIndicator?.defaultValue,
  });
  // const formManHours = useForm<any>({
  //   resolver: zodResolver(z.object(formList?.manHours?.schema)),
  //   defaultValues: formList?.manHours?.defaultValue,
  // });
  const formSmartCard = useForm<any>({
    resolver: zodResolver(z.object(formList?.smartCard?.schema)),
    defaultValues: formList?.smartCard?.defaultValue,
  });

  const operationFormSbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });
  const operationFormNbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });
  const operationFormCbu = useForm<any>({
    resolver: zodResolver(z.object(marineFormList?.operation?.schema)),
    defaultValues: marineFormList?.operation?.defaultValue,
  });

  useEffect(() => {
    if (data?.lagging) {
      formLagging.reset({ ...formList?.laggingIndicator?.defaultValue, ...data.lagging });
    }
    // if (data?.manhours) {
    //   formManHours.reset({ ...formList?.manHours?.defaultValue, ...data.manhours });
    // }
    if (data?.smartCard) {
      formSmartCard.reset({ ...formList?.smartCard?.defaultValue, ...data.smartCard });
    }
  }, [data]);

  const onDataUpdated_ = useCallback(() => {
    const operations = {
      data: [
        operationFormSbu.getValues(),
        operationFormNbu.getValues(),
        operationFormCbu.getValues(),
      ],
    };
    const result = {
      lagging: formLagging.getValues(),
      // manhours: formManHours.getValues(),
      smartCard: formSmartCard.getValues(),
      operations: operations,
    }

    onSubmitClicked("completed", result);
  }, []);

  const CreateSaveButton = React.memo(() => {
    return (
      <div className="flex flex-row flex-shrink-0 gap-2">
        <Button
          disabled={loading}
          onClick={(e) => {
            e.preventDefault();
            onDataUpdated_();
          }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <LuSave className="mr-2 h-4 w-4" />
              Save All
            </>
          )}
        </Button>
      </div>
    )
  })

  const saveButton = useMemo(() => <CreateSaveButton />, []);

  if (/*isContractorString(userRole) ||*/ isCrewString(userRole)) {
    return (
      <div className={"flex flex-col gap-4"}>
        {/* <div className={"bg-secondary p-2 rounded-lg"}>
          <Form03ManHoursCrew
            reportId={data?.id || ""}
            formKey="manhours"
            formTitle={tabList["manHours"].label} formDescription={tabList["manHours"].desc}
            onSubmitClicked={(body: any) => {
              let body_ = {
                key: "manhours",
                data: {
                  pobContractor: body?.data?.pobContractor ?? 0,
                  hoursPobContractor: 14
                }
              }
              onSubmitClicked("all", body_)
            }}
            className={className}
            defaultValues={data?.manhours} loading={loading}
            onEditAssets={() => { }}
            onDeleteAssets={() => { }}
            defaultAssetValues={[]}
            showSaveButton={true}
          // componentSaveButton={saveButton}
          />
        </div> */}

        <div className={"bg-secondary p-2 rounded-lg"}>
          <FormMeeting formTitle={tabList["meeting"].label} formDescription={tabList["meeting"].desc}
            onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
            className={className}
            defaultValues={data?.meeting} loading={loading}
            onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={data?.supportingFiles?.filter((item: any) => item?.meetingId !== null) ?? []}
            formKey="meeting"
            defaultAssetValues={[]}
            onEditAssets={() => { }}
            onSubmitAssetsClicked={(body) => { }}
            showAssetFiles={false}
          />
        </div>
        <div className={"bg-secondary p-2 rounded-lg"}>
          <FormDrill formTitle={tabList["drill"].label} formDescription={tabList["drill"].desc}
            onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
            className={className}
            defaultValues={data?.drill} loading={loading}
            onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={data?.supportingFiles?.filter((item: any) => item?.drillId !== null) ?? []}
            category={"marine"}
          />
        </div>
        <div className={"bg-secondary p-2 rounded-lg"}>
          <FormTraining formTitle={tabList["training"].label} formDescription={tabList["training"].desc}
            onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
            className={className}
            defaultValues={data?.training} loading={loading}
            onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={data?.supportingFiles?.filter((item: any) => item?.trainingId !== null) ?? []}
            formKey="training"
            defaultAssetValues={[]}
            onEditAssets={() => { }}
            onSubmitAssetsClicked={(body) => { }}
            showAssetFiles={false}
            category="marine"
          />
        </div>
        <div className={"bg-secondary p-2 rounded-lg"}>
          <FormMarineInspection formTitle={tabList["inspection"].label} formDescription={tabList["inspection"].desc}
            onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
            className={className}
            defaultValues={data?.inspections?.filter((item: any) => item?.type === 'field') ?? []}
            loading={loading} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={data?.supportingFiles?.filter((item: any) => item?.inspectionId !== null) ?? []}
            formKey="inspection"
            defaultAssetValues={[]}
            onEditAssets={() => { }}
            onSubmitAssetsClicked={(body) => { }}
            showAssetFiles={false}
          />
        </div>
        {/* <div className={"bg-secondary p-2 rounded-lg"}>
          <FormPermitToWork formTitle={tabList["permitToWork"].label} formDescription={tabList["permitToWork"].desc}
            onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
            className={className}
            defaultValues={data?.permit} loading={loading}
            onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
            supportingFiles={data?.supportingFiles?.filter((item: any) => item?.permitId !== null) ?? []}
          />
        </div> */}

        <div className={"bg-secondary p-2 rounded-lg"}>
          <Form12UploadFile
            formKey={"supportingFiles"}
            formTitle={tabList?.["uploadFile"]?.label}
            formDescription={tabList?.["uploadFile"]?.desc}
            onSubmitClicked={(body) => onSubmitClicked("supportingFiles", body)}
            className={className}
            defaultValues={data?.supportingFiles}
            loading={loading}
            disableEditing={loading}
            onEditAssets={onEditAssets}
            onDeleteAssets={onDeleteAssets}
            showSaveButton={false}
            showAssetFiles={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={"flex flex-col gap-4"}>
      {stepPosition === tabList?.["laggingIndicator"]?.value &&
        <Form02Lagging
          parentForm={formLagging}
          formKey="lagging"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.lagging} loading={loading}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "lagging") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
        />}
      {/* {stepPosition === tabList?.["manHours"]?.value &&
        <Form03ManHours
          parentForm={formManHours}
          formKey="manhours"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.manhours} loading={loading}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "manhours") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
        />} */}
      {stepPosition === tabList?.["meeting"]?.value &&
        <FormMeeting
          formKey="meeting"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.meeting} loading={loading}
          onSectionDelete={onSectionDelete}
          onDeleteAssets={onDeleteAssets}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.meetingId !== null) ?? []}
          onEditAssets={onEditAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "meeting") ?? []}
          onSubmitAssetsClicked={(body) => onSubmitClicked("supportingFilesV1", body)}
          showSaveButton={false}
        />}
      {stepPosition === tabList?.["inspection"]?.value &&
        <FormMarineInspection formTitle={tabList["inspection"].label} formDescription={tabList["inspection"].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.inspections?.filter((item: any) => item?.type === 'field') ?? []}
          loading={loading} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.inspectionId !== null) ?? []}
          formKey="inspection"
          defaultAssetValues={[]}
          onEditAssets={() => { }}
          onSubmitAssetsClicked={(body) => { }}
          showAssetFiles={false}
        />}
      {stepPosition === tabList?.["smartCard"]?.value &&
        <Form09SmartCard
          parentForm={formSmartCard}
          formKey="smartCard"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.smartCard} loading={loading}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "smartCard") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
          reportDate={data?.reportDate}
          projectCategory="marine"
        />}
      {stepPosition === tabList?.["operation"]?.value &&
        <Form05Operation
          formKey="operations"
          reportDate={data?.reportDate}
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.operations} loading={loading}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "operations") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
          parentFormSbu={operationFormSbu}
          parentFormNbu={operationFormNbu}
          parentFormCbu={operationFormCbu}
        />
      }
      {/* {stepPosition === tabList?.["vesselUnderPnO"]?.value &&
        <Form11VesselUnderPnO
          parentForm={formVesselUnderPo}
          formKey="vesselsUnderPo"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.vesselsUnderPOSummary}
          vesselValues={data?.vesselsUnderPO}
          loading={loading}
          vesselList={vesselList}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "vesselsUnderPo") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
        />
      } */}

      {stepPosition === tabList["uploadFile"].value &&
        <Form12UploadFile
          formKey={"supportingFiles"}
          formTitle={tabList?.[stepPosition]?.label}
          formDescription={tabList?.[stepPosition]?.desc}
          onSubmitClicked={(body) => onSubmitClicked("supportingFiles", body)}
          className={className}
          defaultValues={data?.supportingFiles}
          loading={loading}
          disableEditing={loading}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          showSaveButton={false}
          showAssetFiles={true}
          componentSaveButton={saveButton}
        />
      }
    </div>
  )
}
import Form02Lagging from "./project/Form02Lagging";
import Form03ManHours from "./project/Form03ManHours";
import FormMeeting from "./project/FormMeeting";
import FormInspection from "./marine/FormInspection";
import FormPreInspection from "./marine/FormPreInspection";
import Form09SmartCard from "./project/Form09SmartCard";
import Form10PermitToWork from "./project/Form10PermitToWork";
import Form11DailyHighlight from "./project/Form11DailyHighlight";
import Form12UploadFile from "./Form12UploadFile";
import * as React from "react";
import { formList, tabListProjectReport } from "./lib/project-template";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { LuSave } from "react-icons/lu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useCallback, useMemo } from "react";
import FormDrill from "./marine/FormDrill";
import FormTraining from "./marine/FormTraining";

type Props = {
  onBackClick?: () => void;
  onSubmitClicked: (objKey: string, obj: Record<any, any>) => void;
  className?: string
  data?: Record<string, any>;
  stepPosition: string,
  loading: boolean,
  onEditAssets: (item: any) => void,
  onDeleteAssets: (item: any) => void,
  onSectionDelete: (type: string, id: string) => void
}

const Step02ProjectForms = ({
  onBackClick, onSubmitClicked, className, data,
  stepPosition, loading, onEditAssets, onDeleteAssets, onSectionDelete
}: Props) => {
  const { identity, ...tabList } = tabListProjectReport;

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

  const formDailyHighlights = useForm<any>({
    resolver: zodResolver(z.object(formList?.dailyHighlights?.schema)),
    defaultValues: formList?.dailyHighlights?.defaultValue,
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
    if (data?.highlight) {
      formDailyHighlights.reset({ ...formList?.dailyHighlights?.defaultValue, ...data.highlight });
    }

  }, [data]);

  const onDataUpdated_ = useCallback(() => {
    const result = {
      lagging: formLagging.getValues(),
      // manhours: formManHours.getValues(),
      smartCard: formSmartCard.getValues(),
      highlight: formDailyHighlights.getValues(),
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

  return (
    <div className={"flex flex-col gap-4"}>
      {(stepPosition === tabList["laggingIndicator"].value) &&
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
        />
      }

      {/* {(stepPosition === tabList["manHours"].value) &&
        <Form03ManHours
          reportId={data?.id || ""}
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
        />
      } */}

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
          componentSaveButton={saveButton}
        />}

      {(stepPosition === tabList["drill"].value) &&
        <FormDrill
          formTitle={tabList["drill"].label} formDescription={tabList["drill"].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.drill} loading={loading}
          onSectionDelete={onSectionDelete}
          onDeleteAssets={onDeleteAssets}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.drillId !== null) ?? []}
          category={"project"}
          componentSaveButton={saveButton}
        />
      }

      {(stepPosition === tabList["training"].value) &&
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
          category="project"
          componentSaveButton={saveButton}
        />
      }

      {(stepPosition === tabList["preUseInspection"].value) &&
        <FormPreInspection formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.inspections?.filter((item: any) => item?.type === 'pre_use') ?? []}
          loading={loading} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.inspectionId !== null) ?? []}
          formKey="pre-inspection"
          onEditAssets={onEditAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "pre-inspection") ?? []}
          onSubmitAssetsClicked={(body) => onSubmitClicked("supportingFilesV1", body)}
          showSaveButton={false}
          componentSaveButton={saveButton}
        />
      }

      {(stepPosition === tabList["inspection"].value) &&
        <FormInspection formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.inspections?.filter((item: any) => item?.type === 'field') ?? []}
          loading={loading} onSectionDelete={onSectionDelete} onDeleteAssets={onDeleteAssets}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.inspectionId !== null) ?? []}
          formKey="inspection"
          onEditAssets={onEditAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "inspection") ?? []}
          onSubmitAssetsClicked={(body) => onSubmitClicked("supportingFilesV1", body)}
          showSaveButton={false}
          componentSaveButton={saveButton}
        />
      }

      {(stepPosition === tabList["smartCard"].value) &&
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
          projectCategory="project"
        />
      }

      {(stepPosition === tabList["permitToWork"].value) &&
        <Form10PermitToWork
          formKey="permit"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("multipart", body)}
          className={className}
          defaultValues={data?.permit} loading={loading}
          onSectionDelete={onSectionDelete}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={[]}
          onSubmitAssetsClicked={(body) => { }}
          showAssetFiles={false}
          showSaveButton={false}
          componentSaveButton={saveButton}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.permitId !== null) ?? []}
        />
      }

      {(stepPosition === tabList["dailyHighlights"].value) &&
        <Form11DailyHighlight
          reportId={data?.id || ""}
          parentForm={formDailyHighlights}
          formKey="highlight"
          formTitle={tabList[stepPosition].label} formDescription={tabList[stepPosition].desc}
          onSubmitClicked={(body) => onSubmitClicked("all", body)}
          className={className}
          defaultValues={data?.highlight} loading={loading}
          hsseIssues={data?.inspections?.filter((item: any) => ((item?.type === 'field') && (item?.openFinding > 0))) ?? []}
          supportingFiles={data?.supportingFiles?.filter((item: any) => item?.inspectionId !== null) ?? []}
          onEditAssets={onEditAssets}
          onDeleteAssets={onDeleteAssets}
          defaultAssetValues={data?.supportingFiles?.filter((item: any) => item?.section === "highlight") ?? []}
          showSaveButton={false}
          componentSaveButton={saveButton}
          reportDate={data?.reportDate}
        />
      }

      {(stepPosition === tabList["uploadFile"].value) &&
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
export default Step02ProjectForms
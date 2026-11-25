import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewTraining = ({template, value, className, allValues}: Props) => {
  const [summary, setSummary] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setSummary(allValues?.trainingSummary);
    }
  }, [allValues]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.shortLabel} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid md:grid-cols-3 gap-2"}>
          <ItemView label={template?.["sika"]?.["shortLabel"]} borderColor={template?.["sika"]?.["border"]}
                    value={value?.["sika"] ?? "-"}/>
          <ItemView label={template?.["shipboardTraining"]?.["shortLabel"]} borderColor={template?.["shipboardTraining"]?.["border"]}
                    value={value?.["shipboardTraining"] ?? "-"}/>
          <ItemView label={template?.["othersTraining"]?.["shortLabel"]} borderColor={template?.["othersTraining"]?.["border"]}
                    value={value?.["othersTraining"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayTraining"]?.["shortLabel"]} borderColor={template?.["todayTraining"]?.["border"]}
                    value={summary?.["todayTraining"] ?? "-"}/>
          <ItemView label={template?.["monthlyTraining"]?.["shortLabel"]} borderColor={template?.["monthlyTraining"]?.["border"]}
                    value={summary?.["monthlyTraining"] ?? "-"}/>
          <ItemView label={template?.["ytdTraining"]?.["shortLabel"]} borderColor={template?.["ytdTraining"]?.["border"]}
                    value={summary?.["ytdTraining"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewTraining
import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewInspection = ({template, value, className, allValues}: Props) => {
  const [summary, setSummary] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setSummary(allValues?.inspectionSummary);
    }
  }, [allValues]);
  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.shortLabel} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["closeFinding"]?.["shortLabel"]} borderColor={template?.["closeFinding"]?.["border"]}
                    value={value?.["closeFinding"] ?? "-"}/>
          <ItemView label={template?.["openFinding"]?.["shortLabel"]} borderColor={template?.["openFinding"]?.["border"]}
                    value={value?.["openFinding"] ?? "-"}/>
          <ItemView label={template?.["unsafeCondition"]?.["shortLabel"]} borderColor={template?.["unsafeCondition"]?.["border"]}
                    value={value?.["unsafeCondition"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayInspection"]?.["shortLabel"]} borderColor={template?.["todayInspection"]?.["border"]}
                    value={summary?.["todayInspection"] ?? "-"}/>
          <ItemView label={template?.["monthlyInspection"]?.["shortLabel"]} borderColor={template?.["monthlyInspection"]?.["border"]}
                    value={summary?.["monthlyInspection"] ?? "-"}/>
          <ItemView label={template?.["ytdInspection"]?.["shortLabel"]} borderColor={template?.["ytdInspection"]?.["border"]}
                    value={summary?.["ytdInspection"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewInspection
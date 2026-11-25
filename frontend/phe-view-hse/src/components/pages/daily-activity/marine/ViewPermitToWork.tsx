import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewPermitToWork = ({template, value, className, allValues}: Props) => {
  const [summary, setSummary] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setSummary(allValues?.permitSummary);
    }
  }, [allValues]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.shortLabel} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["cwpL1"]?.["shortLabel"]} borderColor={template?.["cwpL1"]?.["border"]}
                    value={value?.["cwpL1"] ?? "-"}/>
          <ItemView label={template?.["hwspL1"]?.["shortLabel"]} borderColor={template?.["hwspL1"]?.["border"]}
                    value={value?.["hwspL1"] ?? "-"}/>
          <ItemView label={template?.["confinedSpace1"]?.["shortLabel"]} borderColor={template?.["confinedSpace1"]?.["border"]}
                    value={value?.["confinedSpace1"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayPtw"]?.["shortLabel"]} borderColor={template?.["todayPtw"]?.["border"]}
                    value={summary?.["todayPermit"] ?? "-"}/>
          <ItemView label={template?.["monthlyPtw"]?.["shortLabel"]} borderColor={template?.["monthlyPtw"]?.["border"]}
                    value={summary?.["monthlyPermit"] ?? "-"}/>
          <ItemView label={template?.["ytdPtw"]?.["shortLabel"]} borderColor={template?.["ytdPtw"]?.["border"]}
                    value={summary?.["ytdPermit"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewPermitToWork
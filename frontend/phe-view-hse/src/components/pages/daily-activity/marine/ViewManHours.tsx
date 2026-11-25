import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewManHours = ({template, value, className, allValues}: Props) => {
  const [summary, setSummary] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setSummary(allValues?.manhoursSummary);
    }
  }, [allValues]);
  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <div className={"grid grid-cols-2 gap-2"}>
          <ItemView label={template?.["pobPheOses"]?.["shortLabel"]} borderColor={template?.["pobPheOses"]?.["border"]}
                    value={value?.["pobPheOses"] ?? "-"}/>
          <ItemView label={template?.["pobContractor"]?.["shortLabel"]} borderColor={template?.["pobContractor"]?.["border"]}
                    value={value?.["pobContractor"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["dailyMandays"]?.["shortLabel"]} borderColor={template?.["dailyMandays"]?.["border"]}
                    value={summary?.["todayMandays"] ?? "-"}/>
          <ItemView label={template?.["monthlyMandays"]?.["shortLabel"]} borderColor={template?.["monthlyMandays"]?.["border"]}
                    value={summary?.["monthlyMandays"] ?? "-"}/>
          <ItemView label={template?.["ytdMandays"]?.["shortLabel"]} borderColor={template?.["ytdMandays"]?.["border"]}
                    value={summary?.["ytdMandays"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayManhours"]?.["shortLabel"]} borderColor={template?.["todayManhours"]?.["border"]}
                    value={summary?.["todayManhours"] ?? "-"}/>
          <ItemView label={template?.["monthlyManhours"]?.["shortLabel"]} borderColor={template?.["monthlyManhours"]?.["border"]}
                    value={summary?.["monthlyManhours"] ?? "-"}/>
          <ItemView label={template?.["ytdManhours"]?.["shortLabel"]} borderColor={template?.["ytdManhours"]?.["border"]}
                    value={summary?.["ytdManhours"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewManHours
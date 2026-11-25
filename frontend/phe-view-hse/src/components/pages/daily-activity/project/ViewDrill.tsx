import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewDrill = ({template, value, className, allValues}: Props) => {
  const [ori, setori] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setori(allValues?.drillSummary);
    }
  }, [allValues]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.shortLabel} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid grid-cols-3 xl:grid-cols-4 gap-2"}>
          <ItemView label={template?.["fireDrill"]?.["shortLabel"]} borderColor={template?.["fireDrill"]?.["border"]}
                    value={value?.["fireDrill"] ?? "-"}/>
          <ItemView label={template?.["abandonDrill"]?.["shortLabel"]} borderColor={template?.["abandonDrill"]?.["border"]}
                    value={value?.["abandonDrill"] ?? "-"}/>
          <ItemView label={template?.["musteringDrill"]?.["shortLabel"]} borderColor={template?.["musteringDrill"]?.["border"]}
                    value={value?.["musteringDrill"] ?? "-"}/>
          <ItemView label={template?.["medievacDrill"]?.["shortLabel"]} borderColor={template?.["medievacDrill"]?.["border"]}
                    value={value?.["medievacDrill"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["h2sDrill"]?.["shortLabel"]} borderColor={template?.["h2sDrill"]?.["border"]}
                    value={value?.["h2sDrill"] ?? "-"}/>
          <ItemView label={template?.["manOverboardDrill"]?.["shortLabel"]} borderColor={template?.["manOverboardDrill"]?.["border"]}
                    value={value?.["manOverboardDrill"] ?? "-"}/>
          <ItemView label={template?.["othersDrill"]?.["shortLabel"]} borderColor={template?.["othersDrill"]?.["border"]}
                    value={value?.["othersDrill"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayDrill"]?.["shortLabel"]} borderColor={template?.["todayDrill"]?.["border"]}
                    value={ori?.["todayDrill"] ?? "-"}/>
          <ItemView label={template?.["monthlyDrill"]?.["shortLabel"]} borderColor={template?.["monthlyDrill"]?.["border"]}
                    value={ori?.["monthlyDrill"] ?? "-"}/>
          <ItemView label={template?.["ytdDrill"]?.["shortLabel"]} borderColor={template?.["ytdDrill"]?.["border"]}
                    value={ori?.["ytdDrill"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewDrill
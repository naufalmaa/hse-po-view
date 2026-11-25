import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewMeeting = ({template, value, className, allValues}: Props) => {
  const [summary, setSummary] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setSummary(allValues?.meetingSummary);
    }
  }, [allValues]);
  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.label} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid md:grid-cols-3 xl:grid-cols-4 gap-2"}>
          <ItemView label={template?.["hsseSiteOrientation"]?.["shortLabel"]} borderColor={template?.["hsseSiteOrientation"]?.["border"]}
                    value={value?.["hsseSiteOrientation"] ?? "-"}/>
          <ItemView label={template?.["marineContractorMeeting"]?.["shortLabel"]} borderColor={template?.["marineContractorMeeting"]?.["border"]}
                    value={value?.["marineContractorMeeting"] ?? "-"}/>
          <ItemView label={template?.["monthly"]?.["shortLabel"]} borderColor={template?.["monthly"]?.["border"]}
                    value={value?.["monthly"] ?? "-"}/>
          <ItemView label={template?.["toolbox"]?.["shortLabel"]} borderColor={template?.["toolbox"]?.["border"]}
                    value={value?.["toolbox"] ?? "-"}/>
        </div>
        <div className={"grid md:grid-cols-3 gap-2"}>
          <ItemView label={template?.["safetyStandDownMeeting"]?.["shortLabel"]} borderColor={template?.["safetyStandDownMeeting"]?.["border"]}
                    value={value?.["safetyStandDownMeeting"] ?? "-"}/>
          <ItemView label={template?.["managementSafetyVisit"]?.["shortLabel"]} borderColor={template?.["managementSafetyVisit"]?.["border"]}
                    value={value?.["managementSafetyVisit"] ?? "-"}/>
          <ItemView label={template?.["others"]?.["shortLabel"]} borderColor={template?.["others"]?.["border"]}
                    value={value?.["others"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewMeeting
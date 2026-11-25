import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> }
const ViewMeeting = ({template, value, className, allValues}: Props) => {
  const [ori, setori] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setori(allValues?.meetingSummary);
    }
  }, [allValues]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.label} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid grid-cols-2 gap-2"}>
          <ItemViewBg label={template?.["jenisMeeting"]?.label} color={template?.["jenisMeeting"]?.border} value={value?.["jenisMeeting"] ?? "-"}/>
          <ItemViewBg label={template?.["absencePercentage"]?.["shortLabel"]} color={template?.["absencePercentage"]?.["border"]}
                    value={value?.["absencePercentage"] ?? "-"}/>
        </div>
        <div className={"grid md:grid-cols-3 xl:grid-cols-5 gap-2"}>
          <ItemView label={template?.["toolbox"]?.["shortLabel"]} borderColor={template?.["toolbox"]?.["border"]}
                    value={value?.["toolbox"] ?? "-"}/>
          <ItemView label={template?.["generalSafety"]?.["shortLabel"]} borderColor={template?.["generalSafety"]?.["border"]}
                    value={value?.["generalSafety"] ?? "-"}/>
          <ItemView label={template?.["safetyCommittee"]?.["shortLabel"]} borderColor={template?.["safetyCommittee"]?.["border"]}
                    value={value?.["safetyCommittee"] ?? "-"}/>
          <ItemView label={template?.["preJob"]?.["shortLabel"]} borderColor={template?.["preJob"]?.["border"]}
                    value={value?.["preJob"] ?? "-"}/>
          <ItemView label={template?.["others"]?.["shortLabel"]} borderColor={template?.["others"]?.["border"]}
                    value={value?.["others"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["today"]?.["shortLabel"]} borderColor={template?.["today"]?.["border"]}
                    value={ori?.["todayMeeting"] ?? "-"}/>
          <ItemView label={template?.["monthly"]?.["shortLabel"]} borderColor={template?.["monthly"]?.["border"]}
                    value={ori?.["monthlyMeeting"] ?? "-"}/>
          <ItemView label={template?.["ytd"]?.["shortLabel"]} borderColor={template?.["ytd"]?.["border"]}
                    value={ori?.["ytdMeeting"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewMeeting
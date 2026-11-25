import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string, allValues?: Record<string, any> };
const ViewTraining = ({template, value, className, allValues}: Props) => {
  const [ori, setori] = useState<Record<string, any>|null>(null);
  useEffect(() => {
    if (allValues) {
      setori(allValues?.trainingSummary);
    }
  }, [allValues]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.label} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid md:grid-cols-3 xl:grid-cols-4 gap-2"}>
          <ItemView label={template?.["clsr"]?.["shortLabel"]} borderColor={template?.["clsr"]?.["border"]}
                    value={value?.["clsr"] ?? "-"}/>
          <ItemView label={template?.["akhlak"]?.["shortLabel"]} borderColor={template?.["akhlak"]?.["border"]}
                    value={value?.["akhlak"] ?? "-"}/>
          <ItemView label={template?.["unsafeActionCategory"]?.["shortLabel"]} borderColor={template?.["unsafeActionCategory"]?.["border"]}
                    value={value?.["unsafeActionCategory"] ?? "-"}/>
          <ItemView label={template?.["sika"]?.["shortLabel"]} borderColor={template?.["sika"]?.["border"]}
                    value={value?.["sika"] ?? "-"}/>
        </div>
        <div className={"grid md:grid-cols-3 xl:grid-cols-4 gap-2"}>
          <ItemView label={template?.["l2ra"]?.["shortLabel"]} borderColor={template?.["l2ra"]?.["border"]}
                    value={value?.["l2ra"] ?? "-"}/>
          <ItemView label={template?.["preSiteInduction"]?.["shortLabel"]} borderColor={template?.["preSiteInduction"]?.["border"]}
                    value={value?.["preSiteInduction"] ?? "-"}/>
          <ItemView label={template?.["siteInduction"]?.["shortLabel"]} borderColor={template?.["siteInduction"]?.["border"]}
                    value={value?.["siteInduction"] ?? "-"}/>
          <ItemView label={template?.["othersTraining"]?.["shortLabel"]} borderColor={template?.["othersTraining"]?.["border"]}
                    value={value?.["othersTraining"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayTraining"]?.["shortLabel"]} borderColor={template?.["todayTraining"]?.["border"]}
                    value={ori?.["todayTraining"] ?? "-"}/>
          <ItemView label={template?.["monthlyTraining"]?.["shortLabel"]} borderColor={template?.["monthlyTraining"]?.["border"]}
                    value={ori?.["monthlyTraining"] ?? "-"}/>
          <ItemView label={template?.["ytdTraining"]?.["shortLabel"]} borderColor={template?.["ytdTraining"]?.["border"]}
                    value={ori?.["ytdTraining"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewTraining
import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string }
const ViewLagging = ({template, value, className}: Props) => {
  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <div className={"grid grid-cols-3 xl:grid-cols-5 gap-2"}>
          <ItemView label={template?.["freeLtaDays"]["shortLabel"]} borderColor={template?.["freeLtaDays"]["border"]}
                    value={(value?.["freeLtaDays"] ?? "-") + " Days"}/>
          <ItemView label={template?.["freeRiDays"]["shortLabel"]} borderColor={template?.["freeRiDays"]["border"]}
                    value={(value?.["freeRiDays"]?? "-") + " Days"}/>
          <ItemView label={template?.["fatality"]["shortLabel"]} borderColor={template?.["fatality"]["border"]}
                    value={value?.["fatality"] ?? "-"}/>
          <ItemView label={template?.["lti"]["shortLabel"]} borderColor={template?.["lti"]["border"]} value={value?.["lti"] ?? "-"}/>
          <ItemView label={template?.["restrictedWorkDayCase"]["shortLabel"]} borderColor={template?.["restrictedWorkDayCase"]["border"]}
                    value={value?.["restrictedWorkDayCase"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 xl:grid-cols-5 gap-2"}>
          <ItemView label={template?.["medicalTreatmentCase"]["shortLabel"]} borderColor={template?.["medicalTreatmentCase"]["border"]}
                    value={value?.["medicalTreatmentCase"] ?? "-"}/>
          <ItemView label={template?.["firstAid"]["shortLabel"]} borderColor={template?.["firstAid"]["border"]}
                    value={value?.["firstAid"] ?? "-"}/>
          <ItemView label={template?.["nearMiss"]["shortLabel"]} borderColor={template?.["nearMiss"]["border"]}
                    value={value?.["nearMiss"] ?? "-"}/>
          <ItemView label={template?.["environmentalDamage"]["shortLabel"]} borderColor={template?.["environmentalDamage"]["border"]}
                    value={value?.["environmentalDamage"] ?? "-"}/>
          <ItemView label={template?.["propertyDamage"]["shortLabel"]} borderColor={template?.["propertyDamage"]["border"]}
                    value={value?.["propertyDamage"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewLagging
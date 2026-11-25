import * as React from "react";
import {ViewMeeting, ViewTraining, ViewDrill, ViewInspection, ViewPermitToWork} from "./marine";
import {useEffect} from "react";

type Props = {
  template: Record<string, any>
  values: Record<string, any>
  className?: string
}

const MarineInfoRight = ({template, values, className}: Props) => {
  const [inspection, setInspection] = React.useState<any>(null)

  useEffect(() => {
    let tmp = values?.inspections?.filter((item: any) => item.type === "field")
    setInspection(tmp?.[0] ?? {})
  }, [values])

  return(
    <div className={"flex flex-col gap-4"}>
      <ViewMeeting template={template?.meeting.form} value={values?.meeting} className={className} allValues={values}/>
      <ViewTraining template={template?.training.form} value={values?.training} className={className} allValues={values}/>
      <ViewDrill template={template?.drill.form} value={values?.drill} className={className} allValues={values}/>
      <ViewInspection template={template?.inspection.form} value={inspection} className={className} allValues={values}/>
      <ViewPermitToWork template={template?.permitToWork.form} value={values?.permit} className={className} allValues={values}/>
    </div>
  )
}
export default MarineInfoRight
import * as React from "react";
import {ViewLagging, ViewSmartCard, ViewManHours, ViewVessel, ViewOperation} from "./marine";

type Props = {
  template: Record<string, any>
  values: Record<string, any>
  className?: string
}

const MarineInfoLeft = ({template, values, className}: Props) => {
  return(
    <div className={"flex flex-col gap-4"}>
      <ViewOperation template={template?.operation.form} value={values?.operations} className={className}/>
      <ViewVessel template={template?.vesselUnderPnO.form} value={values?.vesselsUnderPO} className={className} allValues={values}/>
      <ViewLagging template={template?.laggingIndicator.form} value={values?.lagging} className={className}/>
      <ViewSmartCard template={template?.smartCard.form} value={values?.smartCard} className={className}/>
      <ViewManHours template={template?.manHours.form} value={values?.manhours} className={className} allValues={values}/>
    </div>
  )
}
export default MarineInfoLeft
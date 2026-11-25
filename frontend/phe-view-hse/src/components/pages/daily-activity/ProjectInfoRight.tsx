import * as React from "react";
import {ViewTodayHighlight, ViewDrill, ViewPermitToWork, ViewInspection} from "./project";

type Props = {
  template: Record<string, any>
  values: Record<string, any>
  className?: string
}

const ProjectInfoRight = ({template, values, className}: Props) => {
  const inspection = values?.inspections?.filter((item: any) => item.type === "field")

  return(
    <div className={"flex flex-col gap-4"}>
      <ViewTodayHighlight template={template?.dailyHighlights.form} value={values?.highlight} className={className}/>
      <ViewDrill template={template?.drill.form} value={values?.drill?.[0]} className={className} allValues={values}/>
      <ViewInspection template={template?.inspection.form} value={inspection?.[0] ?? {}} className={className} allValues={values}/>
      <ViewPermitToWork template={template?.permitToWork.form} value={values?.permit?.[0] ?? {}} className={className} allValues={values}/>
    </div>
  )
}
export default ProjectInfoRight
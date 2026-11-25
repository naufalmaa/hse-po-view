import Form01Identity from "./Form01Identity";
import { TabListReportProps } from "./lib/constants";
import { tabListProjectReport } from "./lib/project-template";

import { useState } from "react";

type Props = {
  loading: boolean,
  formClassName: string,
  onDataUpdated: (body: Record<any, any>) => void,
  subTypes: any[],
  userRole: string
}

const FormCreate = ({ loading, formClassName, onDataUpdated, subTypes, userRole }: Props) => {
  const [stepPosition, setStepPosition] = useState<string>("identity");
  const [stepWizard, setStepWizard] = useState<number>(1);

  const tabList: TabListReportProps = {
    identity: tabListProjectReport["identity"],
  }

  const getStepLabel = () => {
    switch (stepWizard) {
      case 1:
        return "Isi Identitas";
      default:
        return ""
    }
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] grid-cols-1 gap-0">
      <div className="border-r border-border bg-muted/30 p-4">
        <div>
          <div className={"flex flex-row justify-between items-center"}>
            <div />
            <div />
          </div>
        </div>

        {/* Step Indicator */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Step {stepWizard} of 2</div>
            <div className="font-semibold text-foreground">{getStepLabel()}</div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stepWizard / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={"flex flex-col gap-4 p-4"}>
        <div className={"flex flex-col"}>
          <div className={""}>
            {stepPosition === tabList["identity"].value &&
              <Form01Identity
                formTitle={tabList[stepPosition].label}
                formDescription={tabList[stepPosition].desc}
                onSubmitClicked={onDataUpdated} className={formClassName}
                loading={loading}
                subTypes={subTypes}
                userRole={userRole}
              />
            }
          </div>
        </div>
      </div>
    </div>


  )
}
export default FormCreate
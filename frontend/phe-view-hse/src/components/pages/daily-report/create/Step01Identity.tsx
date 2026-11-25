import {tabListProjectReport} from "./lib/project-template";
import * as React from "react";
import Form01Identity from "./Form01Identity";


type Props = {
  onBackClick?: () => void;
  onSubmitClicked: (objKey: string, obj: Record<any, any>) => void;
  className?: string
  defaultValues?: Record<string, any>;
  stepPosition: string,
  loading: boolean,
  disableEditing?: boolean,
  subTypes: any,
  userRole: string
}

const Step01Identity = ({onBackClick, onSubmitClicked, className, defaultValues, stepPosition, loading, disableEditing=false, subTypes, userRole}: Props) => {
  const {uploadFile, ...tabList} = tabListProjectReport;
  return (
    <Form01Identity
      formTitle={tabList[stepPosition].label}
      formDescription={tabList[stepPosition].desc}
      onSubmitClicked={(body) => {
        if(body?.formType === 'marine') {
          delete body?.subtype;
        }
        onSubmitClicked("other", body)
      }}
      className={className}
      defaultValues={defaultValues}
      loading={loading}
      disableEditing={disableEditing}
      subTypes={subTypes}
      userRole={userRole}
    />
  )
}
export default Step01Identity;
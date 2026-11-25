import React from "react";
import {cn} from "@/lib/utils";

type GroupContainerProps = {
  className?: string;
  classNameCard?: string;
  children?: React.ReactNode;
};

const IndicatorCard = ({children, className = "", classNameCard = ""}: GroupContainerProps) => {
  return (
    <div className={cn("flex flex-row rounded-lg", className)}>
      <div className={cn("w-1.5 rounded-l-lg", classNameCard)}/>
      <div className={"flex flex-1"}>
      {children}
      </div>
    </div>
  )
}

export default IndicatorCard
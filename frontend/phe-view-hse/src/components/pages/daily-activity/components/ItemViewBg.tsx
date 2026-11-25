import {cn} from "@/lib/utils";
import React from "react";

type Props = {
  label: string,
  value: React.ReactNode,
  className?: string,
  color?: string,
  borderColor?: string
  classNameValue?: string
}

const ItemViewBg = ({label, value, color, className, classNameValue}: Props) => {

  return(
    <div className={cn("flex flex-col items-center",
      "border rounded-md p-1 gap-1",
      className ?? "")} style={{borderColor: color, backgroundColor: color}}>
      <div className={"text-xs text-white"}>{label}</div>
      <div className={cn("bg-background w-full rounded-md p-1 text-left min-h-[35px]", classNameValue)}>{value}</div>
    </div>
  )
}
export default ItemViewBg;

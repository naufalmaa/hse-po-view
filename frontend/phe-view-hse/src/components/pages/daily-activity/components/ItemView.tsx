import {cn} from "@/lib/utils";
import React from "react";

type Props = {
  label: string,
  value: any,
  color?: string,
  className?: string,
  borderColor?: string
}

const ItemView = ({label, value, color, className, borderColor}: Props) => {
  return(
    <div className={cn("flex flex-col items-center", "border-2 rounded-md p-1", className ?? "")} style={{borderColor: borderColor}}>
      <div className={"text-[11px] text-foreground/70 text-center truncate w-full"}>{label}</div>
      <div className={"font-bold text-sm"}>{value}</div>
    </div>
  )
}
export default ItemView;

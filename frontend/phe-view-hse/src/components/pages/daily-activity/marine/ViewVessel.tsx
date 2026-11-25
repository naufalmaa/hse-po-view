import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import {useEffect, useState} from "react";

type Props = { template: Record<string, any>, value: any[], className?: string, allValues?: Record<string, any> };
const ViewVessel = ({template, value, className, allValues}: Props) => {
  const [cb, setCb] = useState(0);
  const [supply, setSupply] = useState(0);
  const [tb, setTb] = useState(0);
  const [ahts, setAhts] = useState(0);
  const [summary, setSummary] = useState<Record<string, any>|null>(null);

  useEffect(() => {
    if (value) {
      const cbCount = value.filter(vessel => vessel.type === "CB").length;
      const supplyCount = value.filter(vessel => vessel.type === "SV").length;
      const tbCount = value.filter(vessel => vessel.type === "TB").length;
      const ahtsCount = value.filter(vessel => vessel.type === "AHTS").length;

      setCb(cbCount);
      setSupply(supplyCount);
      setTb(tbCount);
      setAhts(ahtsCount);
    }

    if(allValues) {
      setSummary(allValues?.vesselsUnderPOSummary);
    }
  }, [value]);

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <div className={"grid md:grid-cols-3 xl:grid-cols-4 gap-2"}>
          <ItemView label={"IPB/CB"} borderColor={template?.["info"]?.["border"]}
                    value={cb}/>
          <ItemView label={"Supply / Utility"} borderColor={template?.["info"]?.["border"]}
                    value={supply}/>
          <ItemView label={"TB / Harbour Boat"} borderColor={template?.["info"]?.["border"]}
                    value={tb}/>
          <ItemView label={"AHTS / AHT"} borderColor={template?.["info"]?.["border"]}
                    value={ahts}/>
        </div>
        <div className={"grid md:grid-cols-3 gap-2"}>
          <ItemView label={template?.["totalBoatToday"]?.["shortLabel"]} borderColor={template?.["totalBoatToday"]?.["border"]}
                    value={summary?.["totalBoatToday"] ?? "-"}/>
          <ItemView label={template?.["totalBoatMonthly"]?.["shortLabel"]} borderColor={template?.["totalBoatMonthly"]?.["border"]}
                    value={summary?.["totalBoatMonthly"] ?? "-"}/>
          <ItemView label={template?.["totalBoatYtd"]?.["shortLabel"]} borderColor={template?.["totalBoatYtd"]?.["border"]}
                    value={summary?.["totalBoatYtd"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["totalEmployeeToday"]?.["shortLabel"]} borderColor={template?.["totalEmployeeToday"]?.["border"]}
                    value={summary?.["totalEmployeeToday"] ?? "-"}/>
          <ItemView label={template?.["totalEmployeeMonthly"]?.["shortLabel"]} borderColor={template?.["totalEmployeeMonthly"]?.["border"]}
                    value={summary?.["totalEmployeeMonthly"] ?? "-"}/>
          <ItemView label={template?.["totalEmployeeYtd"]?.["shortLabel"]} borderColor={template?.["totalEmployeeYtd"]?.["border"]}
                    value={summary?.["totalEmployeeYtd"] ?? "-"}/>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewVessel
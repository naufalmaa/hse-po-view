import CardCustom from "@/components/app/CardCustom";
import ItemViewBg from "../components/ItemViewBg";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string }
const ViewTodayHighlight = ({template, value, className}: Props) => {
  const weatherInfo = [
    {
      label: "Wind Speed",
      value: "50 knot"
    },
    {
      label: "Sea Level",
      value: "25 m",
    },
    {
      label: "Sky Condition",
      value: "Party Cloudy"
    }
  ]

  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <div className={"rounded-md p-2 text-white"} style={{backgroundColor: template?.["weather"]?.border || "gray"}}>
          <div className={"font-bold my-1"}>{template?.["weather"]?.["shortLabel"]}</div>
          <div className={"flex flex-row gap-2 justify-between"}>
            <table>
              <tbody>
              {weatherInfo.map((item, index) => (
                <tr key={index} className="">
                  <td>{item.label}</td>
                  <td className={"px-1"}>:</td>
                  <td>{item.value}</td>
                </tr>
              ))}
              </tbody>
            </table>
            <img src={"/weather/mostlycloudy.png"} style={{width: "80px", height: "80px"}} alt={""}/>
          </div>
        </div>
        <div className={"grid grid-cols-1 gap-2"}>
          <ItemViewBg label={template?.["dailyActivities"]?.shortLabel} color={template?.["dailyActivities"]?.border}
                      value={value?.["dailyActivities"] ?? "-"}/>
          <ItemViewBg label={template?.["dailyNextPlan"]?.shortLabel} color={template?.["dailyNextPlan"]?.border}
                      value={value?.["dailyNextPlan"] ?? "-"}/>
          <div>
          <ItemViewBg classNameValue={"p-0 min-h-none"} label={template?.["overstayPersonnel"]?.shortLabel}
                      color={template?.["overstayPersonnel"]?.border}
                      value={
                        <div style={{backgroundColor: template?.["overstayPersonnel"]?.border}} className={"flex flex-col gap-2  text-sm"}>
                          <div className={"flex flex-row gap-2"}>
                            <div className={"bg-background rounded-md w-30 text-center font-semibold truncate"}>No</div>
                            <div className={"bg-background rounded-md w-full text-center font-semibold truncate"}>Nama</div>
                            <div className={"bg-background rounded-md w-full text-center font-semibold truncate"}>Perusahaan</div>
                            <div className={"bg-background rounded-md w-full text-center font-semibold truncate"}>DOB (hari)</div>
                          </div>

                          {value?.["overstayPersonnel"]?.slice(0, 5)?.map((item: any, index: number) => (
                            <div key={index} className={"flex flex-row gap-2"}>
                              <div className={"bg-background rounded-md w-30 text-center truncate"}>{index + 1}</div>
                              <div className={"bg-background rounded-md w-full text-center truncate"}>{item?.name || item?.employeeName}</div>
                              <div className={"bg-background rounded-md w-full text-center truncate"}>{item?.company || item?.subContractorName}</div>
                              <div className={"bg-background rounded-md w-full text-center truncate"}>{item?.dob}</div>
                            </div>
                          ))}
                        </div>
                      }/>
          </div>
        </div>
      </div>
    </CardCustom>
  )
}
export default ViewTodayHighlight
import CardCustom from "@/components/app/CardCustom";
import ItemViewBg from "../components/ItemViewBg";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string }
const ViewOperation = ({template, value, className}: Props) => {
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
      <div className={"flex flex-row gap-1"}>
      {
        value?.map((item: any, index: number) => (
          <div key={index} className={"flex flex-col flex-1 text-primary-foreground p-1 rounded-md gap-1"} style={{backgroundColor: template?.["region"]?.border || "gray"}}>
            <div className={"font-bold"}>{item?.region ?? "-"}</div>
            <div className={"bg-card rounded-md p-1 text-card-foreground min-h-[35px]"}>
              {item?.currentHiPoActivity ?? "-"}
            </div>
            <div className={"bg-card rounded-md p-1 text-card-foreground min-h-[35px]"}>
              {item?.forecastHiPoActivity ?? "-"}
            </div>

            <div className={"flex flex-row justify-between"}>
              <div>Weather</div>
              <img src={"/weather/mostlycloudy.png"} style={{width: "30px", height: "30px"}} alt={""}/>
            </div>
            <div>
              <div className={"text-xs text-background/50"}>Wind Speed</div>
              <div className={"text-sm text-bold"}>{item?.windSpeed ?? "-"} knot</div>
            </div>

            <div>
              <div className={"text-xs text-background/50"}>Sea Level</div>
              <div className={"text-sm text-bold"}>{item?.seaLevel ?? "-"} m</div>
            </div>

            <div>
              <div className={"text-xs text-background/50"}>Sky Condition</div>
              <div className={"text-sm text-bold"}>{item?.skyCondition ?? "-"}</div>
            </div>
          </div>
        ))
      }
      </div>
    </CardCustom>
  )
}
export default ViewOperation
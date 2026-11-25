import CardCustom from "@/components/app/CardCustom";
import ItemView from "../components/ItemView";
import ItemViewBg from "../components/ItemViewBg";

type Props = { template: Record<string, any>, value: Record<string, any>, className?: string }
const ViewSmartCard = ({template, value, className}: Props) => {
  return (
    <CardCustom title={template?.info?.title} className={className}>
      <div className={"flex flex-col gap-2"}>
        <ItemViewBg label={template?.["description"]?.shortLabel} color={template?.["description"]?.border} value={value?.["description"]}/>
        <div className={"grid grid-cols-3 gap-2"}>
          <ItemView label={template?.["unsafeAction"]?.["shortLabel"]} borderColor={template?.["unsafeAction"]?.["border"]}
                    value={value?.["unsafeAction"] ?? "-"}/>
          <ItemView label={template?.["unsafeCondition"]?.["shortLabel"]} borderColor={template?.["unsafeCondition"]?.["border"]}
                    value={value?.["unsafeCondition"] ?? "-"}/>
          <ItemView label={template?.["nearMiss"]?.["shortLabel"]} borderColor={template?.["nearMiss"]?.["border"]}
                    value={value?.["nearMiss"] ?? "-"}/>
        </div>
        <div className={"grid grid-cols-2 xl:grid-cols-3 gap-2"}>
          <ItemView label={template?.["todayParticipationRate"]?.["shortLabel"]}
                    borderColor={template?.["todayParticipationRate"]?.["border"]}
                    value={(value?.["todayParticipate"] ?? "-") + " / " + (value?.["todayParticipationRate"] ?? "-") + " %"}/>
          <ItemView label={template?.["monthlyParticipationRate"]?.["shortLabel"]}
                    borderColor={template?.["monthlyParticipationRate"]?.["border"]}
                    value={(value?.["monthlyParticipate"] ?? "-") + " / " + (value?.["monthlyParticipationRate"] ?? "-") + " %"}/>
          <ItemView label={template?.["ytdParticipationRate"]?.["shortLabel"]} borderColor={template?.["ytdParticipationRate"]?.["border"]}
                    value={(value?.["ytdParticipate"] ?? "-") + " / " + (value?.["ytdParticipationRate"] ?? "-") + " %"}/>
        </div>
        {/*<div>*/}
        {/*  <ItemViewBg classNameValue={"p-0 min-h-none"} label={template?.["nonParticipants"]?.shortLabel} color={template?.["nonParticipants"]?.border}*/}
        {/*              value={*/}
        {/*                <div style={{backgroundColor: template?.["nonParticipants"]?.border}} className={"flex flex-col gap-2  text-sm"}>*/}
        {/*                  <div className={"flex flex-row gap-2"}>*/}
        {/*                    <div className={"bg-background rounded-md w-30 text-center font-semibold truncate"}>No</div>*/}
        {/*                    <div className={"bg-background rounded-md w-full text-center font-semibold truncate"}>Nama</div>*/}
        {/*                    <div className={"bg-background rounded-md w-full text-center font-semibold truncate"}>Perusahaan</div>*/}
        {/*                  </div>*/}

        {/*                  {value?.["nonParticipants"]?.slice(0, 5)?.map((item: any, index: number) => {*/}
        {/*                      return (*/}
        {/*                        <div key={index} className={"flex flex-row gap-2"}>*/}
        {/*                          <div className={"bg-background rounded-md w-30 text-center truncate"}>{index + 1}</div>*/}
        {/*                          <div className={"bg-background rounded-md w-full text-center truncate"}>{item?.name}</div>*/}
        {/*                          <div className={"bg-background rounded-md w-full text-center truncate"}>{item?.company}</div>*/}
        {/*                        </div>)*/}
        {/*                    }*/}
        {/*                  )}*/}
        {/*                </div>*/}

        {/*              }/>*/}
        {/*</div>*/}
      </div>
    </CardCustom>
  )
}
export default ViewSmartCard
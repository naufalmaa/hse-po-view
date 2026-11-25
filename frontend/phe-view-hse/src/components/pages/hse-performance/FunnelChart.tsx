import {
  EChartsDefaultsOptions,
  ReactECharts
} from "@/components/custom/charts/ReactECharts";
import {useEffect, useState} from "react";
import {cn} from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ValueItem {
  day?: number;
  ytd?: number;
  [key: string]: any;
}

interface LegendItem {
  key: string;
  name: string;
  color: string;
  multiKeys?: string[];
}

interface FunnelChartProps {
  values: Record<string, ValueItem>;
}

const formatDateStr = (dateStr?: string | null) => {
  if (!dateStr) return "Nihil Kejadian";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const FunnelChart = ({values}: FunnelChartProps) => {
  const [series, setSeries] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<{
    name: string;
    color: string;
    projDay: number;
    projYtd: number;
    marineDay: number;
    marineYtd: number;
    lastRecordedProj: string;
    lastRecordedMarine: string;
    lastRecordedOverall: string;
    extraInfo?: string;
  } | null>(null);

  const legend: LegendItem[] = [
    {
      key: 'fatality',
      name: 'Fatality',
      color: '#D84343',
    },
    {
      key: 'lti',
      name: 'LTI',
      color: '#F4B400',
    },
    {
      key: 'restrictedWorkDayCase',
      name: 'RDWC',
      color: '#F7CB4D',
    },
    {
      key: 'medicalTreatmentCase',
      name: 'MTC',
      color: '#AED581',
    },
    {
      key: 'firstAid',
      name: 'First Aid',
      color: '#4CAF50',
    },
    {
      key: 'nearMiss',
      name: 'Near Miss',
      color: '#009688',
    },
    {
      key: 'uauc',
      name: 'UA/UC',
      color: '#4A90E2',
      multiKeys: ['unsafeAction', 'unsafeCondition']
    },
    {
      key: 'environmentalDamage',
      name: 'Environmental Damage',
      color: '#616161',
    },
    {
      key: 'propertyDamage',
      name: 'Property Damage',
      color: '#2F2F2F',
    }
  ];

  const defaultOption = {
    type: 'funnel',
    left: '125px',
    right: '125px',
    top: 20,
    bottom: 20,
    sort: 'ascending',
    gap: 2,
    minSize: '85px',
    maxSize: '600px',
    legend: {
      show: false,
    },
  };

  let series_ = [
    {
      ...defaultOption,
      name: 'right',
      label: {
        show: true,
        position: 'right',
        fontSize: 12,
        fontWeight: 500,
        formatter: (params: any) => `  ${params?.name}`,
      },
      labelLine: {
        show: false,
        length: 10,
        lineStyle: {
          width: 0,
          type: 'solid',
        },
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 0,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      },
      data: [],
    },
    {
      ...defaultOption,
      name: 'left',
      label: {
        show: true,
        position: 'left',
        fontSize: 12,
        fontWeight: 500,
        formatter: (params: any) => `${params?.name}  `,
      },
      labelLine: {
        show: false,
        length: 10,
        lineStyle: {
          width: 0,
          type: 'solid',
        },
      },
      data: [],
    },
    {
      ...defaultOption,
      name: 'insideLeft',
      label: {
        show: true,
        color: '#ffffff',
        position: "insideLeft",
        fontSize: 11,
        fontWeight: 'bold',
        padding: [0, 0, 0, 10],
        formatter: (params: any) => `${params?.data?.ext?.labelLeft}`,
      },
      data: [],
    },
    {
      ...defaultOption,
      name: 'insideRight',
      label: {
        show: true,
        color: '#ffffff',
        position: "insideRight",
        fontSize: 11,
        fontWeight: 'bold',
        padding: [0, 10, 0, 0],
        formatter: (params: any) => `${params?.data?.ext?.labelRight}`,
      },
      data: [],
    },
  ];

  const ChartTooltipFunnel = ({params, className = ""}: any) => {
    const title = params?.name ?? '';
    const ext = params?.data?.ext;
    const tooltipClass = cn("flex flex-col gap-1.5 p-2.5 bg-background/95 backdrop-blur rounded-lg border shadow-lg text-xs min-w-[240px]", className);
    return `
      <div class="${tooltipClass}">
        <div class="font-bold flex items-center justify-between pb-1 border-b border-border/50 text-sm" style="color: ${params?.data?.extColor}">
          <span>${title}</span>
          <span class="text-[10px] font-normal text-muted-foreground">Klik untuk detail</span>
        </div>
        <div class="flex flex-col gap-1 pt-0.5">
          <div class="flex flex-row justify-between items-center text-xs">
            <span class="font-semibold text-foreground">Produksi:</span>
            <span class="text-foreground font-mono font-medium tabular-nums ml-auto">${ext?.tooltipLeft || ext?.labelLeft}</span>
          </div>
          <div class="text-[11px] text-muted-foreground flex items-center justify-between pl-1">
            <span>Terakhir:</span>
            <span class="font-medium text-foreground">${ext?.lastRecordedProj || 'Nihil Kejadian'}</span>
          </div>
        </div>
        <div class="flex flex-col gap-1 pt-1.5 border-t border-border/40">
          <div class="flex flex-row justify-between items-center text-xs">
            <span class="font-semibold text-foreground">Marine:</span>
            <span class="text-foreground font-mono font-medium tabular-nums ml-auto">${ext?.tooltipRight || ext?.labelRight}</span>
          </div>
          <div class="text-[11px] text-muted-foreground flex items-center justify-between pl-1">
            <span>Terakhir:</span>
            <span class="font-medium text-foreground">${ext?.lastRecordedMarine || 'Nihil Kejadian'}</span>
          </div>
        </div>
      </div>`;
  };

  const options = {
    ...EChartsDefaultsOptions,
    tooltip: {
      className: 'custom-echarts-tooltip',
      trigger: 'item',
      formatter: (params: any) => ChartTooltipFunnel({params: params}),
    },
  };

  useEffect(() => {
    let dataColor = [];
    let dataTransparent = [];

    let start_ = 10;
    const projectLagging = values?.project;
    const marineLagging = values?.marine;
    const lastRecordedMeta = values?.lastRecorded;

    for (let i = 0; i < legend.length; i++) {
      const item = legend[i];

      let labelLeft = "";
      let labelRight = "";
      let tooltipLeft = "";
      let tooltipRight = "";
      let projLast = "Nihil Kejadian";
      let marineLast = "Nihil Kejadian";
      let overallLast = "Nihil Kejadian";

      let projDay = 0;
      let projYtd = 0;
      let marineDay = 0;
      let marineYtd = 0;

      if (item?.multiKeys?.length === 2) {
        const [k1, k2] = item.multiKeys;
        // Project (Production)
        const projK1Day = projectLagging ? (projectLagging[k1]?.day ?? 0) : (values?.[k1]?.day ?? 0);
        const projK1Ytd = projectLagging ? (projectLagging[k1]?.ytd ?? 0) : (values?.[k1]?.ytd ?? 0);
        const projK2Day = projectLagging ? (projectLagging[k2]?.day ?? 0) : (values?.[k2]?.day ?? 0);
        const projK2Ytd = projectLagging ? (projectLagging[k2]?.ytd ?? 0) : (values?.[k2]?.ytd ?? 0);

        // Marine
        const marineK1Day = marineLagging ? (marineLagging[k1]?.day ?? 0) : (values?.[k1]?.day ?? 0);
        const marineK1Ytd = marineLagging ? (marineLagging[k1]?.ytd ?? 0) : (values?.[k1]?.ytd ?? 0);
        const marineK2Day = marineLagging ? (marineLagging[k2]?.day ?? 0) : (values?.[k2]?.day ?? 0);
        const marineK2Ytd = marineLagging ? (marineLagging[k2]?.ytd ?? 0) : (values?.[k2]?.ytd ?? 0);

        labelLeft = `${projK1Ytd} | ${projK2Ytd}`;
        labelRight = `${marineK1Ytd} | ${marineK2Ytd}`;

        tooltipLeft = `UA: ${projK1Day} (Day) | ${projK1Ytd} (YTD), UC: ${projK2Day} (Day) | ${projK2Ytd} (YTD)`;
        tooltipRight = `UA: ${marineK1Day} (Day) | ${marineK1Ytd} (YTD), UC: ${marineK2Day} (Day) | ${marineK2Ytd} (YTD)`;

        projDay = projK1Day + projK2Day;
        projYtd = projK1Ytd + projK2Ytd;
        marineDay = marineK1Day + marineK2Day;
        marineYtd = marineK1Ytd + marineK2Ytd;

        const uaMeta = lastRecordedMeta?.[k1];
        const ucMeta = lastRecordedMeta?.[k2];

        const pDates = [uaMeta?.project, ucMeta?.project].filter(Boolean) as string[];
        const mDates = [uaMeta?.marine, ucMeta?.marine].filter(Boolean) as string[];
        const oDates = [uaMeta?.overall, ucMeta?.overall].filter(Boolean) as string[];

        pDates.sort((a, b) => (a > b ? -1 : 1));
        mDates.sort((a, b) => (a > b ? -1 : 1));
        oDates.sort((a, b) => (a > b ? -1 : 1));

        projLast = formatDateStr(pDates[0]);
        marineLast = formatDateStr(mDates[0]);
        overallLast = formatDateStr(oDates[0]);
      } else {
        projDay = projectLagging ? (projectLagging[item.key]?.day ?? 0) : (values?.[item.key]?.day ?? 0);
        projYtd = projectLagging ? (projectLagging[item.key]?.ytd ?? 0) : (values?.[item.key]?.ytd ?? 0);

        marineDay = marineLagging ? (marineLagging[item.key]?.day ?? 0) : 0;
        marineYtd = marineLagging ? (marineLagging[item.key]?.ytd ?? 0) : 0;

        labelLeft = `${projDay} | ${projYtd}`;
        labelRight = `${marineDay} | ${marineYtd}`;

        tooltipLeft = `${projDay} (Day) | ${projYtd} (YTD)`;
        tooltipRight = `${marineDay} (Day) | ${marineYtd} (YTD)`;

        const meta = lastRecordedMeta?.[item.key];
        projLast = formatDateStr(meta?.project);
        marineLast = formatDateStr(meta?.marine);
        overallLast = formatDateStr(meta?.overall);
      }

      const detailItem = {
        name: item.name,
        color: item.color,
        projDay,
        projYtd,
        marineDay,
        marineYtd,
        lastRecordedProj: projLast,
        lastRecordedMarine: marineLast,
        lastRecordedOverall: overallLast,
        extraInfo: item.multiKeys ? "Pengamatan Unsafe Action (UA) & Unsafe Condition (UC) dari Smart Card" : undefined
      };

      const label = {
        labelLeft,
        labelRight,
        tooltipLeft,
        tooltipRight,
        lastRecordedProj: projLast,
        lastRecordedMarine: marineLast,
        detailItem
      };

      dataColor.push({
        value: start_,
        name: item['name'],
        itemStyle: { color: item['color'] },
        ext: label,
        extColor: item['color']
      });
      dataTransparent.push({
        value: start_,
        name: item['name'],
        itemStyle: { color: 'transparent' },
        ext: label,
        extColor: item['color']
      });
      start_ += 10;
    }

    setSeries([
      {
        ...series_[0],
        data: dataColor,
      },
      {
        ...series_[1],
        data: dataColor,
      },
      {
        ...series_[2],
        data: dataTransparent,
      },
      {
        ...series_[3],
        data: dataTransparent,
      },
    ]);
  }, [values]);

  return (
    <div className={"relative h-full w-full overflow-hidden"}>
      {series && (
        <ReactECharts
          options={options}
          series={series}
          onEvents={{
            click: (params: any) => {
              const detail = params?.data?.ext?.detailItem;
              if (detail) {
                setSelectedDetail(detail);
              }
            }
          }}
          className={"absolute top-0 left-0 w-full h-full cursor-pointer"}
        />
      )}

      {/* Interactive Metric Detail Dialog on Click */}
      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div
                className="h-4 w-4 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: selectedDetail?.color }}
              />
              <DialogTitle className="text-lg font-bold">{selectedDetail?.name}</DialogTitle>
            </div>
            <DialogDescription>
              Rincian metrik insiden dan tanggal kejadian terakhir yang tercatat di database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Produksi Panel */}
            <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-2">
              <div className="font-semibold text-xs text-orange-700 dark:text-orange-400 flex items-center justify-between">
                <span>Produksi (Project)</span>
              </div>
              <div className="text-base font-mono font-bold text-foreground">
                {selectedDetail?.projDay} <span className="text-xs font-normal text-muted-foreground">(Day)</span>
                {" | "}
                {selectedDetail?.projYtd} <span className="text-xs font-normal text-muted-foreground">(YTD)</span>
              </div>
              <div className="text-xs pt-1.5 border-t border-orange-200/60 dark:border-orange-900/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Terakhir Tercatat</div>
                <div className="font-medium text-foreground mt-0.5">{selectedDetail?.lastRecordedProj}</div>
              </div>
            </div>

            {/* Marine Panel */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="font-semibold text-xs text-blue-700 dark:text-blue-400 flex items-center justify-between">
                <span>Marine</span>
              </div>
              <div className="text-base font-mono font-bold text-foreground">
                {selectedDetail?.marineDay} <span className="text-xs font-normal text-muted-foreground">(Day)</span>
                {" | "}
                {selectedDetail?.marineYtd} <span className="text-xs font-normal text-muted-foreground">(YTD)</span>
              </div>
              <div className="text-xs pt-1.5 border-t border-blue-200/60 dark:border-blue-900/30">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Terakhir Tercatat</div>
                <div className="font-medium text-foreground mt-0.5">{selectedDetail?.lastRecordedMarine}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5 border border-border/50">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Kejadian Terakhir (Gabungan):</span>
              <span className="font-semibold text-foreground">{selectedDetail?.lastRecordedOverall}</span>
            </div>
            {selectedDetail?.extraInfo && (
              <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                ℹ️ {selectedDetail?.extraInfo}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunnelChart;
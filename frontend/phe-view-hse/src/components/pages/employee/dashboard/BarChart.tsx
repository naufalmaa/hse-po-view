import {
  ChartTooltip,
  EChartsDefaultsOptions,
  ReactECharts
} from "@/components/custom/charts/ReactECharts";
import { useEffect, useMemo, useRef } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useTheme } from "@/lib/theme-provider";

export const SeriesColors: Record<string, string> = {
  P1: "rgba(74, 222, 128, 1)",     // Hijau Terang (Light Green)
  P2: "rgba(22, 163, 74, 1)",      // Hijau Standar (Green)
  P3: "rgba(255, 215, 0, 1)",     // Kuning
  P4: "rgba(255, 165, 0, 1)",     // Orange
  P5: "rgba(255, 0, 0, 1)",       // Merah
  P6: "rgba(139, 0, 0, 1)",       // Merah tua (Dark Red)
  P7: "rgba(128, 0, 0, 1)",       // Maroon
};

type ChartAction = {
  label: string;
  onClick: (item: any) => void;
}

type Props = {
  values: any[],
  keyX: string,
  keyY: string,
  color?: string,
  useSeriesColor?: boolean,
  name?: string,
  sort?: boolean,
  showAverage?: boolean,
  tooltipFields?: { key?: string, label: string, value?: (item: any) => string }[],
  onClick?: (item: any) => void,
  actions?: ChartAction[],
  disableBarClick?: boolean,
  valueSuffix?: string,
  inverseY?: boolean,
  isContractor?: boolean,
  allowedContractorIds?: string[]
}

const BarChart = ({
  values,
  keyX,
  keyY,
  color,
  useSeriesColor = false,
  name,
  sort = false,
  showAverage = false,
  tooltipFields,
  onClick,
  actions,
  disableBarClick = true,
  valueSuffix = '%',
  inverseY = false,
  isContractor = false,
  allowedContractorIds = []
}: Props) => {
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  
  // Generate a unique ID for this chart instance
  const chartId = useRef(`chart-${Math.random().toString(36).slice(2)}`).current;

  // Unify options and series in a single synchronous useMemo block, identical to PieOnDuty.tsx
  const options = useMemo(() => {
    if (!values) return EChartsDefaultsOptions;

    let dataToProcess = [...values];
    if (sort) {
      dataToProcess.sort((a, b) => (a[keyX] || 0) - (b[keyX] || 0));
    }

    let yAxisData: (string | number)[] = [];
    let seriesData: any[] = [];
    for (let i = 0; i < dataToProcess.length; i++) {
      const item = dataToProcess[i];
      const xValue = item?.[keyX];
      const yValue = item?.[keyY];

      yAxisData.push(yValue);

      const barItem: any = {
        value: xValue,
        itemData: item
      };

      if (useSeriesColor) {
        const barColor = SeriesColors[yValue] || color || '#3b82f6';
        barItem.itemStyle = { color: barColor };
      }

      seriesData.push(barItem);
    }

    // Calculate average of the bar data
    const numericData = values.map(v => v[keyX]).filter(val => typeof val === 'number') as number[];
    const average = numericData.length > 0
      ? numericData.reduce((sum, val) => sum + val, 0) / numericData.length
      : 0;

    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const labelColor = isDark ? '#f5f5f4' : '#1c1917';

    const newSeries: any[] = [
      {
        type: 'bar',
        name: name || t($ => $.shared.value), // Translated "Value"
        data: seriesData,
        barWidth: 25,
        itemStyle: useSeriesColor ? {} : { color: color }, // Only set single color if not using series colors
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const val = typeof params.value === 'object' ? params.value?.value : params.value;
            if (val != null && !isNaN(Number(val))) {
              return Number(val).toFixed(1);
            }
            return val;
          },
          fontSize: 10,
          fontWeight: 'bold',
          color: labelColor
        }
      }
    ];

    if (showAverage) {
      newSeries.push({
        type: 'line',
        name: t($ => $.shared.average), // Translated "Average"
        data: yAxisData.map(() => average),
        lineStyle: {
          type: 'dashed',
          color: 'rgba(172, 20, 20, 0.5)',
          width: 2
        },
        symbol: 'none',
        itemStyle: {
          color: '#ff6b6b'
        },
        label: {
          show: true,
          position: 'top',
          formatter: `${t($ => $.shared.avg)}: ${average.toFixed(1)}${valueSuffix || ''}`, // Translated "Avg"
          color: 'rgba(206, 6, 6, 0.9)',
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: 'rgba(206, 175, 175, 0.9)',
          padding: [2, 6],
          borderRadius: 3
        },
        showSymbol: false
      });
    }

    return {
      ...EChartsDefaultsOptions,
      title: {
        show: false,
      },
      tooltip: {
        trigger: 'axis',
        triggerOn: 'click',
        enterable: true,
        confine: true,
        axisPointer: { type: 'shadow' },
        renderMode: 'html',
        className: 'custom-echarts-tooltip',
        formatter: (params: any) => {
          const title = params.find((p: any) => p.seriesIndex === 0)?.name ?? '';
          const tooltipClass = "flex flex-col gap-0 p-2 rounded-md border shadow-sm text-xs bg-popover/90";
          
          const mainSeriesHtml = params.map(({ name, value, marker, seriesName }: any) => {
            const displayVal = (value != null && !isNaN(Number(value)))
              ? Number(value).toFixed(1) + (valueSuffix || '')
              : value;
            
            return `
              <div>
                <div class="flex flex-row gap-2 items-center">
                  ${marker || ''}
                  <div class="font-medium text-muted-foreground">${seriesName || name}</div>
                  <div class="text-foreground font-mono font-medium tabular-nums ml-auto">${displayVal}</div>
                </div>
              </div>
            `;
          }).join('');

          const base = `
            <div class="${tooltipClass}">
              <div class="font-bold text-popover-foreground">${title}</div>
              ${mainSeriesHtml}
            </div>
          `;

          // Find the item data from the first series that has it
          const dataItem = params[0]?.data?.itemData;
          const isAllowed = !isContractor || (dataItem && allowedContractorIds?.includes(dataItem.subContractorId));
          
          if (!dataItem) return base;

          let extraHtml = '';
          if (tooltipFields) {
            extraHtml = tooltipFields.map(field => {
              const displayValue = field.value
                ? field.value(dataItem)
                : (field.key ? (dataItem[field.key] ?? '-') : '-');
              return `
                <div class="flex flex-row gap-2 items-center mt-1 border-t border-border/50 pt-1">
                  <div class="font-medium text-muted-foreground">${field.label}</div>
                  <div class="text-foreground font-medium ml-auto text-right">${displayValue}</div>
                </div>
              `;
            }).join('');
          }

          let buttonsHtml = '';
          if (onClick || (actions && actions.length > 0)) {
            buttonsHtml += '<div class="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">';

            if (onClick) {
              buttonsHtml += `
                <button
                  class="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium w-full transition-colors flex items-center justify-center ${isAllowed ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'}"
                  ${isAllowed ? `onclick="(function(e){ e.stopPropagation(); if(window.barChartHandlers && window.barChartHandlers['${chartId}']) window.barChartHandlers['${chartId}'].onClick(${params[0].dataIndex}); })(event)"` : 'disabled'}
                >
                  ${t($ => $.shared.detail)}
                </button>
              `;
            }

            if (actions) {
              actions.forEach((action, index) => {
                buttonsHtml += `
                  <button
                    class="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium w-full transition-colors flex items-center justify-center ${isAllowed ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'}"
                    ${isAllowed ? `onclick="(function(e){ e.stopPropagation(); if(window.barChartHandlers && window.barChartHandlers['${chartId}']) window.barChartHandlers['${chartId}'].onAction(${params[0].dataIndex}, ${index}); })(event)"` : 'disabled'}
                  >
                    ${action.label}
                  </button>
                `;
              });
            }

            buttonsHtml += '</div>';
          }

          // Inject extra info before closing div
          return base.replace(/<\/div>\s*$/, `${extraHtml}${buttonsHtml}</div>`);
        }
      },
      legend: {
        show: false,
      },
      grid: {
        top: 20,
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value}${valueSuffix || ''}`
        }
      },
      yAxis: {
        type: 'category',
        data: yAxisData,
        inverse: inverseY,
        axisLabel: {
          formatter: (value: string) => {
            const item = values.find((v) => v[keyY] === value);
            if (item && allowedContractorIds?.includes(item.subContractorId)) {
              return `{bold|${value}}`;
            }
            return value;
          },
          rich: {
            bold: {
              fontWeight: 'bold',
            },
          },
        },
      },
      series: newSeries
    };
  }, [values, useSeriesColor, color, keyX, keyY, t, name, sort, showAverage, theme, tooltipFields, onClick, actions, chartId, valueSuffix, inverseY]);

  // Calculate dynamic height based on number of items
  // Base height 60px + 40px per item, minimum 200px
  const calculatedHeight = Math.max(100, (values?.length || 0) * 35 + 60);

  // Register global handler for this chart
  useEffect(() => {
    (window as any).barChartHandlers = (window as any).barChartHandlers || {};
    (window as any).barChartHandlers[chartId] = {
      onClick: (dataIndex: number) => {
        let dataToProcess = [...(values || [])];
        if (sort) {
          dataToProcess.sort((a, b) => (a[keyX] || 0) - (b[keyX] || 0));
        }
        if (dataToProcess && dataToProcess[dataIndex]) {
          const item = dataToProcess[dataIndex];
          const isAllowed = !isContractor || (item && allowedContractorIds?.includes(item.subContractorId));
          if (onClick && isAllowed) onClick(item);
        }
      },
      onAction: (dataIndex: number, actionIndex: number) => {
        let dataToProcess = [...(values || [])];
        if (sort) {
          dataToProcess.sort((a, b) => (a[keyX] || 0) - (b[keyX] || 0));
        }
        if (dataToProcess && dataToProcess[dataIndex] && actions && actions[actionIndex]) {
          const item = dataToProcess[dataIndex];
          const isAllowed = !isContractor || (item && allowedContractorIds?.includes(item.subContractorId));
          if (isAllowed) actions[actionIndex].onClick(item);
        }
      }
    };

    return () => {
      if ((window as any).barChartHandlers) {
        delete (window as any).barChartHandlers[chartId];
      }
    }
  }, [values, onClick, actions, chartId, sort, keyX, isContractor, allowedContractorIds]);

  return (
    <div className={"flex w-full h-full"} style={{ height: `${calculatedHeight}px` }}>
      {options && (
        <ReactECharts
          options={options}
          className={"w-full h-full"}
          onEvents={{
            click: (params: any) => {
              if (!disableBarClick && onClick && params.data?.itemData) {
                const itemData = params.data.itemData;
                const isAllowed = !isContractor || (itemData && allowedContractorIds?.includes(itemData.subContractorId));
                if (isAllowed) {
                  onClick(itemData);
                }
              }
            }
          }}
        />
      )}
    </div>
  )
}

export default BarChart;
import {
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

type Props = {
  values: any[],
  onClick?: (category: string) => void,
}

const StackedBarChart = ({
  values,
  onClick
}: Props) => {
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  
  const chartId = useRef(`stacked-chart-${Math.random().toString(36).slice(2)}`).current;

  const options = useMemo(() => {
    if (!values) return EChartsDefaultsOptions;

    // Index values by category
    const dataMap: Record<string, any> = {};
    (values || []).forEach(item => {
      dataMap[item.category] = item;
    });

    // Categories on Y-axis
    const yAxisData = ['P1 - P3', 'P4', 'P5 - P7'];

    const getBarItem = (catName: string, activeInGroup: boolean) => {
      const item = dataMap[catName] || { category: catName, pct: 0, count: 0, total: 0 };
      return {
        value: activeInGroup ? (item.pct || 0) : 0,
        itemData: item
      };
    };

    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const labelColor = '#ffffff';

    const pCategories = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
    const newSeries = pCategories.map(cat => {
      // Determine activity in groups: 
      // Index 0: P1-P3
      // Index 1: P4
      // Index 2: P5-P7
      const d0 = (cat === 'P1' || cat === 'P2' || cat === 'P3');
      const d1 = (cat === 'P4');
      const d2 = (cat === 'P5' || cat === 'P6' || cat === 'P7');

      return {
        name: cat,
        type: 'bar',
        stack: 'healthRisk',
        barWidth: 30,
        data: [
          getBarItem(cat, d0),
          getBarItem(cat, d1),
          getBarItem(cat, d2)
        ],
        itemStyle: {
          color: SeriesColors[cat] || '#3b82f6'
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const val = params.data?.value;
            if (typeof val === 'number' && val >= 4) {
              return val.toFixed(1) + '%';
            }
            return '';
          },
          fontSize: 9,
          fontWeight: 'bold',
          color: labelColor
        }
      };
    });

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
          const axisName = params[0]?.name ?? '';
          const tooltipClass = "flex flex-col gap-0 p-2 rounded-md border shadow-sm text-xs bg-popover/90";
          
          let segmentsHtml = '';
          let buttonsHtml = '';
          
          const activeParams = params.filter((p: any) => {
            const val = typeof p.data === 'object' ? p.data?.value : p.data;
            return val > 0;
          });

          segmentsHtml = activeParams.map(({ seriesName, data, marker }: any) => {
            const val = data?.value ?? 0;
            const item = data?.itemData || {};
            const displayVal = val.toFixed(1) + '%';
            const countStr = item.count !== undefined && item.total !== undefined
              ? ` (${item.count} / ${item.total})`
              : '';
            
            return `
              <div>
                <div class="flex flex-row gap-2 items-center my-0.5">
                  ${marker || ''}
                  <div class="font-medium text-muted-foreground">${seriesName}</div>
                  <div class="text-foreground font-mono font-medium tabular-nums ml-auto">${displayVal}${countStr}</div>
                </div>
              </div>
            `;
          }).join('');

          if (onClick && activeParams.length > 0) {
            buttonsHtml += '<div class="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">';
            activeParams.forEach(({ seriesName }: any) => {
              buttonsHtml += `
                <button
                  class="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium w-full transition-colors flex items-center justify-center cursor-pointer mt-1"
                  onclick="(function(e){ e.stopPropagation(); if(window.stackedBarChartHandlers && window.stackedBarChartHandlers['${chartId}']) window.stackedBarChartHandlers['${chartId}'].onClick('${seriesName}'); })(event)"
                >
                  Detail ${seriesName}
                </button>
              `;
            });
            buttonsHtml += '</div>';
          }

          return `
            <div class="${tooltipClass}">
              <div class="font-bold text-popover-foreground mb-1">${axisName}</div>
              ${segmentsHtml}
              ${buttonsHtml}
            </div>
          `;
        }
      },
      legend: {
        show: true,
        bottom: 0,
        textStyle: {
          color: isDark ? '#f5f5f4' : '#1c1917'
        }
      },
      grid: {
        top: 20,
        left: '3%',
        right: '4%',
        bottom: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: yAxisData,
        inverse: true
      },
      series: newSeries
    };
  }, [values, theme, onClick, chartId]);

  useEffect(() => {
    (window as any).stackedBarChartHandlers = (window as any).stackedBarChartHandlers || {};
    (window as any).stackedBarChartHandlers[chartId] = {
      onClick: (category: string) => {
        if (onClick) onClick(category);
      }
    };

    return () => {
      if ((window as any).stackedBarChartHandlers) {
        delete (window as any).stackedBarChartHandlers[chartId];
      }
    }
  }, [onClick, chartId]);

  return (
    <div className="flex w-full h-[280px]">
      {options && (
        <ReactECharts
          options={options}
          className="w-full h-full"
        />
      )}
    </div>
  )
}

export default StackedBarChart;

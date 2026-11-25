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
  activeCategories?: string[],
  onClick?: (item: any) => void,
  isContractor?: boolean,
  allowedContractorIds?: string[],
}

const StackedCompanyBarChart = ({
  values,
  activeCategories = [],
  onClick,
  isContractor = false,
  allowedContractorIds = []
}: Props) => {
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  
  // Generate a unique ID for this chart instance
  const chartId = useRef(`stacked-company-chart-${Math.random().toString(36).slice(2)}`).current;

  const options = useMemo(() => {
    if (!values) return EChartsDefaultsOptions;

    // Y-axis: Company names
    const yAxisData = values.map(item => item.company);

    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const labelColor = '#ffffff';

    const pCategories = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
    
    // If activeCategories is empty, default to showing all of them
    const visibleCategories = activeCategories.length > 0 ? activeCategories : pCategories;

    const newSeries = pCategories
      .filter(cat => visibleCategories.includes(cat))
      .map(cat => {
        const seriesData = values.map(item => {
          const detail = item.details?.[cat] || { count: 0, pct: 0 };
          return {
            value: detail.pct || 0,
            itemData: item,
            count: detail.count || 0,
            total: item.statusTotal || 0,
          };
        });

        return {
          name: cat,
          type: 'bar',
          stack: 'companyHealth',
          barWidth: 20,
          data: seriesData,
          itemStyle: {
            color: SeriesColors[cat] || '#3b82f6'
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              const val = typeof params.value === 'object' ? params.value?.value : params.value;
              if (typeof val === 'number' && val >= 5) {
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
          const companyName = params[0]?.name ?? '';
          const tooltipClass = "flex flex-col gap-0 p-2 rounded-md border shadow-sm text-xs bg-popover/90";
          
          let segmentsHtml = '';
          let buttonsHtml = '';
          
          // Filter to show active/selected series categories
          const activeParams = params.filter((p: any) => {
            const val = typeof p.data === 'object' ? p.data?.value : p.data;
            return val > 0;
          });

          segmentsHtml = activeParams.map(({ seriesName, data, marker }: any) => {
            const val = data?.value ?? 0;
            const displayVal = val.toFixed(1) + '%';
            const countStr = data?.count !== undefined && data?.total !== undefined
              ? ` (${data.count} / ${data.total})`
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

          const dataItem = params[0]?.data?.itemData;
          const isAllowed = !isContractor || (dataItem && allowedContractorIds?.includes(dataItem.subContractorId));

          if (onClick && params.length > 0 && activeParams.length > 0) {
            buttonsHtml += '<div class="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">';
            buttonsHtml += `
              <button
                class="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-medium w-full transition-colors flex items-center justify-center ${isAllowed ? 'cursor-pointer mt-1' : 'opacity-50 cursor-not-allowed pointer-events-none mt-1'}"
                ${isAllowed ? `onclick="(function(e){ e.stopPropagation(); if(window.stackedCompanyBarChartHandlers && window.stackedCompanyBarChartHandlers['${chartId}']) window.stackedCompanyBarChartHandlers['${chartId}'].onClick(); })(event)"` : 'disabled'}
              >
                ${t($ => $.shared.detail)}
              </button>
            `;
            buttonsHtml += '</div>';
          }

          return `
            <div class="${tooltipClass}">
              <div class="font-bold text-popover-foreground mb-1">${companyName}</div>
              ${segmentsHtml || `<div class="text-muted-foreground text-center py-1">No data</div>`}
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
        inverse: true,
        axisLabel: {
          formatter: (value: string) => {
            const item = values.find((v) => v.company === value);
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
  }, [values, activeCategories, theme, onClick, chartId, t, isContractor, allowedContractorIds]);

  // Calculate dynamic height based on number of items
  // Base height 80px + 35px per company, minimum 200px
  const calculatedHeight = Math.max(200, (values?.length || 0) * 35 + 80);

  useEffect(() => {
    (window as any).stackedCompanyBarChartHandlers = (window as any).stackedCompanyBarChartHandlers || {};
    (window as any).stackedCompanyBarChartHandlers[chartId] = {
      onClick: () => {
        // Let's use the active item from values.
        // ECharts click parameters can give us the index, but inside the tooltip handler
        // we can trigger details page based on the company's itemData.
        if (values && values.length > 0 && onClick) {
          // Since the tooltip trigger is axis-level, params[0] represents the first active item
          // which has the itemData.
          // Let's find the company object in values
          const companyName = (window as any).stackedCompanyBarChartHandlers[chartId].currentCompany;
          const matchedItem = values.find(item => item.company === companyName);
          const isAllowed = !isContractor || (matchedItem && allowedContractorIds?.includes(matchedItem.subContractorId));
          if (matchedItem && isAllowed) {
            onClick(matchedItem);
          }
        }
      }
    };

    return () => {
      if ((window as any).stackedCompanyBarChartHandlers) {
        delete (window as any).stackedCompanyBarChartHandlers[chartId];
      }
    }
  }, [values, onClick, chartId, isContractor, allowedContractorIds]);

  return (
    <div className="flex w-full" style={{ height: `${calculatedHeight}px` }}>
      {options && (
        <ReactECharts
          options={options}
          className="w-full h-full"
          onEvents={{
            mouseover: (params: any) => {
              // Store current hovered company name to be accessed by the detail button click
              if (params.name && (window as any).stackedCompanyBarChartHandlers?.[chartId]) {
                (window as any).stackedCompanyBarChartHandlers[chartId].currentCompany = params.name;
              }
            }
          }}
        />
      )}
    </div>
  )
}

export default StackedCompanyBarChart;

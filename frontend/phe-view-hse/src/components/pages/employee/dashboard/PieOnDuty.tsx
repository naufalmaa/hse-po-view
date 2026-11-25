import { Badge } from "@/components/ui/badge";
import { ReactECharts, DefaultColors } from "@/components/custom/charts/ReactECharts";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useMemo, useRef, useEffect, ReactNode } from "react";
import { useTheme } from "@/lib/theme-provider";

type Props = {
    data: any[];
    total: number;
    onClick?: (item: any) => void;
    isLoading?: boolean;
    title: string;
    description: string;
    nameKey: string;
    filterComponent?: ReactNode;
}

export const PieOnDuty = ({ data, total, onClick, isLoading = false, title, description, nameKey, filterComponent }: Props) => {
    const { t } = useAppTranslation();
    const { theme } = useTheme();
    const chartId = useRef(`pie-chart-${Math.random().toString(36).slice(2)}`).current;

    const options = useMemo(() => {
        // Transform data for Pie
        const pieData = (data || []).map(item => ({
            value: item.crewOnDuty,
            name: item[nameKey],
            itemData: item // preserve original item
        }));

        let colors = DefaultColors;
        if (pieData.length > DefaultColors.length) {
            colors = pieData.map((_, index) => {
                const hue = (index * 137.508) % 360;
                return `hsl(${hue}, 70%, 50%)`;
            });
        }

        const labelColor = theme === 'dark' ? '#f5f5f4' : '#1c1917';
        return {
            color: colors,
            tooltip: {
                trigger: 'item',
                triggerOn: 'click',
                enterable: true,
                confine: true,
                renderMode: 'html',
                className: 'custom-echarts-tooltip',
                formatter: (params: any) => {
                    const { name, value, marker } = params;
                    const itemData = params.data.itemData;

                    const toolTipHtml = `
                <div class="flex flex-col gap-0 p-2 rounded-md border shadow-sm text-xs bg-popover/90">
                    <div class="font-bold text-popover-foreground">${marker} ${name}</div>
                    <div class="flex flex-row gap-2 items-center">
                        <div class="font-medium text-muted-foreground">${t($ => $.employee.dashboard.onDuty)}</div>
                        <div class="text-foreground font-mono font-medium tabular-nums ml-auto">${value}</div>
                    </div>
                     <div class="flex flex-row gap-2 items-center mt-1 border-t border-border/50 pt-1">
                        <div class="font-medium text-muted-foreground">${t($ => $.employee.dashboard.filters.subContractor)}</div>
                        <div class="text-foreground font-medium ml-auto text-right">${itemData?.subContractorName || '-'}</div>
                    </div>
                    ${onClick ? `
                    <div class="mt-2 pt-2 border-t border-border/50">
                        <button
                          class="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-xs font-medium w-full transition-colors flex items-center justify-center cursor-pointer"
                          onclick="(function(e){ e.stopPropagation(); if(window.pieChartHandlers && window.pieChartHandlers['${chartId}']) window.pieChartHandlers['${chartId}'](${params.dataIndex}); })(event)"
                        >
                          ${t($ => $.shared.detail)}
                        </button>
                    </div>` : ''}
                </div>
             `;
                    return toolTipHtml;
                }
            },
            legend: {
                show: false,
                top: 'middle',
                right: '0%',
                orient: 'vertical',
                icon: 'circle',
                itemGap: 10,
                textStyle: {
                    color: 'inherit'
                }
            },
            series: [
                {
                    name: title,
                    type: 'pie',
                    center: ['50%', '50%'],
                    radius: ['30%', '75%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 0,
                        shadowBlur: 3,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    },
                    label: {
                        show: true,
                        position: "outside",
                        formatter: '{b}\n{c} ({d}%)',
                        color: labelColor,
                        fontSize: 10,
                        fontWeight: "normal",
                        align: 'center',
                        verticalAlign: 'middle',
                        lineHeight: 18
                    },
                    labelLine: {
                        show: true,
                        length: 30,
                        length2: 30,
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            formatter: '{b}\n{c}',
                            color: labelColor
                        },
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    data: pieData
                }
            ]
        };
    }, [data, t, onClick, chartId, theme]);

    // Register global handler
    useEffect(() => {
        (window as any).pieChartHandlers = (window as any).pieChartHandlers || {};
        (window as any).pieChartHandlers[chartId] = (dataIndex: number) => {
            const pieData = (data || []).map(item => ({
                itemData: item
            }));
            if (pieData && pieData[dataIndex]) {
                if (onClick) onClick(pieData[dataIndex].itemData);
            }
        };
        return () => {
            if ((window as any).pieChartHandlers) {
                delete (window as any).pieChartHandlers[chartId];
            }
        }
    }, [data, onClick, chartId]);

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border h-full flex flex-col">
            <div className="p-6 border-b border-border">
                <div>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center">
                            <h3 className="text-lg font-semibold text-foreground">
                                {title}
                                <Badge variant="secondary" className="ml-2 text-sm">{total}</Badge>
                            </h3>
                        </div>
                        {filterComponent}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
            </div>
            <div className="p-4 w-full h-full min-h-[400px]" style={{ height: '400px' }}>
                <ReactECharts options={options} className="flex w-full h-full items-center justify-center" loading={isLoading} />
            </div>
        </div>
    );
}

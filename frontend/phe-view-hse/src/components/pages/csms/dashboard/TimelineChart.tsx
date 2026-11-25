import React, { useEffect, useState } from 'react';
import { ReactECharts } from '@/components/custom/charts/ReactECharts';
import { useAppTranslation } from "@/lib/i18n-typed";
import { AppRoute } from '@/constants/app-route';
import { date_to_string } from '@/lib/my-utils';

interface TimelineContract {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  onGoingAssessmentDates?: string[];
  finalAssessmentDate?: string;
}

interface TimelineChartProps {
  data: TimelineContract[];
  loading?: boolean;
}

// Utility function to convert long text to multiline with max 2 lines and ellipsis
const formatYAxisLabel = (text: string, maxWidth: number = 25): string => {
  if (!text) return '';

  // If text is short enough, return as is
  if (text.length <= maxWidth) {
    return text;
  }

  // Split text into words
  const words = text.split(' ');
  const lines: string[] = [];

  let currentLine = '';
  for (const word of words) {
    // Check if adding this word would exceed the max width
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      // If we have a current line, save it
      if (currentLine) {
        lines.push(currentLine);
      }

      // If the word itself is longer than maxWidth, truncate it
      if (word.length > maxWidth) {
        lines.push(`${word.substring(0, maxWidth - 3)}...`);
        currentLine = '';
        // Stop processing if we've reached our line limit
        if (lines.length >= 2) {
          break;
        }
      } else {
        // Start a new line with this word
        currentLine = word;
      }

      // Stop processing if we've reached our line limit
      if (lines.length >= 2) {
        break;
      }
    }
  }

  // Add the last line if there's space for it
  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  } else if (currentLine && lines.length >= 2) {
    // If we're at the limit, add ellipsis to the last line
    const lastLine = lines[1];
    if (lastLine.length > maxWidth - 3) {
      lines[1] = `${lastLine.substring(0, maxWidth - 3)}...`;
    }
  }

  // Join lines with newline character
  return lines.join('\n');
};

const getStatusColor = (status: string): string => {
  // Define color mapping for different statuses
  const statusColors: Record<string, string> = {
    'finished': '#10B981',      // green
    'on going': '#3B82F6',   // blue
    'not started': '#6B7280',   // gray
    'default': '#9CA3AF'
  };

  return statusColors[status.toLowerCase()] || statusColors['default'];
};

const getStatusStepColor = (status: string): string => {
  // Define color mapping for different statuses
  const statusColors: Record<string, string> = {
    'final assessment': '#006400',      // green
    'on going': '#FFA500',   // blue
    'default': '#9CA3AF'
  };

  return statusColors[status.toLowerCase()] || statusColors['default'];
};

// Maximum number of bars to display
const MAX_BARS = 10;

const TimelineChart: React.FC<TimelineChartProps> = ({ data, loading = false }) => {
  const { t } = useAppTranslation();
  const [chartOptions, setChartOptions] = useState<any>({});

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Extract unique names for y-axis (limit to MAX_BARS)
    const allNames = Array.from(new Set(data.map(item => item.name)));
    const names = allNames.slice(0, MAX_BARS);

    // Format names for y-axis labels with multiline support
    const formattedNames = names.map(name => formatYAxisLabel(name, 25));

    // Filter data to only include items with names in our limited set
    const filteredData = data.filter(item => names.includes(item.name));

    // Convert dates to timestamps for x-axis
    const dates = filteredData.flatMap(item => [item.startDate, item.endDate]);
    
    // Add assessment dates to the date range calculation
    filteredData.forEach(item => {
      if (item.onGoingAssessmentDates) {
        dates.push(...item.onGoingAssessmentDates);
      }
      if (item.finalAssessmentDate) {
        dates.push(item.finalAssessmentDate);
      }
    });

    // More robust date parsing for min/max calculation
    const dateTimestamps = dates.map(date => {
      let dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(date.replace(/-/g, '/'));
      }
      return dateObj.getTime();
    });

    const minDate = Math.min(...dateTimestamps);
    const maxDate = Math.max(...dateTimestamps);

    if (isNaN(minDate) || isNaN(maxDate)) {
      return;
    }

    // Create series data with rectangles
    const seriesData = filteredData.map((item, index) => {
      try {
        const yIndex = names.indexOf(item.name);

        // More robust date parsing
        let startDateObj = new Date(item.startDate);
        let endDateObj = new Date(item.endDate);

        // If direct parsing fails, try with different formats
        if (isNaN(startDateObj.getTime())) {
          startDateObj = new Date(item.startDate.replace(/-/g, '/'));
        }
        if (isNaN(endDateObj.getTime())) {
          endDateObj = new Date(item.endDate.replace(/-/g, '/'));
        }

        const startDate = startDateObj.getTime();
        const endDate = endDateObj.getTime();

        // Check if dates are valid
        if (isNaN(startDate) || isNaN(endDate)) {
          return null;
        }

        // Check if startDate is before endDate
        if (startDate > endDate) {
          return null;
        }

        return {
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
          onGoingAssessmentDates: item.onGoingAssessmentDates,
          finalAssessmentDate: item.finalAssessmentDate,
          // For bar charts, we need [start, end, y-index] format
          value: [startDate, endDate, yIndex],
          itemStyle: {
            color: getStatusColor(item.status)
          }
        };
      } catch (error) {
        return null;
      }
    }).filter(item => item !== null); // Filter out any null items

    // Create assessment markers data
    const assessmentMarkers: any[] = [];
    
    filteredData.forEach(item => {
      const yIndex = names.indexOf(item.name);
      
      // Add ongoing assessment markers
      if (item.onGoingAssessmentDates && item.onGoingAssessmentDates.length > 0) {
        item.onGoingAssessmentDates.forEach(date => {
          let dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date(date.replace(/-/g, '/'));
          }
          
          if (!isNaN(dateObj.getTime())) {
            assessmentMarkers.push({
              name: 'Ongoing Assessment',
              value: [dateObj.getTime(), yIndex],
              itemStyle: {
                color: getStatusStepColor('on going')
              },
              symbolSize: 8
            });
          }
        });
      }
      
      // Add final assessment marker
      if (item.finalAssessmentDate) {
        let dateObj = new Date(item.finalAssessmentDate);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date(item.finalAssessmentDate.replace(/-/g, '/'));
        }
        
        if (!isNaN(dateObj.getTime())) {
          assessmentMarkers.push({
            name: 'Final Assessment',
            value: [dateObj.getTime(), yIndex],
            itemStyle: {
              color: getStatusStepColor('final assessment')
            },
            symbolSize: 10,
            symbol: 'circle',
            borderColor: '#FFFFFF',
            borderWidth: 2
          });
        }
      }
    });

    const options = {
      grid: {
        right: 30,
        left: 250,
        top: 30,
        bottom: 30,
        containLabel: false
      },
      tooltip: {
        show: true,
        trigger: 'item',
        triggerOn: 'mousemove',
        padding: 10,
        alwaysShowContent: false,
        enterable: true,
        confine: true,
        axisPointer: {
          type: 'shadow'
        },
        // className: 'custom-echarts-tooltip',
        position: function (pos: any, params: any, dom: any, rect: any, size: any) {
          // pos = [x, y] of mouse
          const offsetX = 5; // distance in pixels from cursor (right)
          const offsetY = 5; // distance in pixels from cursor (below)
          return [pos[0] + offsetX, pos[1] + offsetY];
        },
        formatter: (params: any) => {
          // Check if this is an assessment marker (scatter series)
          if (params.seriesType === 'scatter') {
            // Handle tooltip for assessment markers
            const { name } = params.data;
            const date = date_to_string(new Date(params.value[0]));
            
            // Format name to have max 2 lines with ellipsis
            const formatTooltipName = (text: string, maxLines: number = 2, maxWidth: number = 30): string => {
              if (!text) return '';

              // Split text into words
              const words = text.split(' ');
              const lines: string[] = [];

              let currentLine = '';
              for (const word of words) {
                // Check if adding this word would exceed the max width
                const testLine = currentLine ? `${currentLine} ${word}` : word;

                if (testLine.length <= maxWidth) {
                  currentLine = testLine;
                } else {
                  // If we have a current line, save it
                  if (currentLine) {
                    lines.push(currentLine);
                  }

                  // If the word itself is longer than maxWidth, truncate it
                  if (word.length > maxWidth) {
                    lines.push(`${word.substring(0, maxWidth - 3)}...`);
                    currentLine = '';
                    // If we already have enough lines, stop processing
                    if (lines.length >= maxLines) {
                      break;
                    }
                  } else {
                    // Start a new line with this word
                    currentLine = word;
                  }

                  // If we already have enough lines, stop processing
                  if (lines.length >= maxLines) {
                    break;
                  }
                }
              }

              // Add the last line if there's space for it
              if (currentLine && lines.length < maxLines) {
                lines.push(currentLine);
              } else if (currentLine && lines.length >= maxLines) {
                // If we're at the limit, add ellipsis to the last line
                const lastLine = lines[maxLines - 1];
                if (lastLine.length > maxWidth - 3) {
                  lines[maxLines - 1] = `${lastLine.substring(0, maxWidth - 3)}...`;
                }
              }

              // Join lines with HTML line breaks
              return lines.join('<br/>');
            };

            const formattedName = formatTooltipName(name, 2, 30);
            
            return `
              <div class="flex flex-col gap-1 p-2 text-xs bg-popover/90 max-w-xs custom-echarts-tooltip">
                <div class="font-bold text-popover-foreground">${formattedName}</div>
                <div class="font-medium">${t($ => $.csms.dashboard.charts.date)}: ${date}</div>
              </div>
            `;
          } else {
            // Handle tooltip for timeline bars
            const { name, startDate, endDate, status, id } = params.data;
            
            // Format name to have max 2 lines with ellipsis
            const formatTooltipName = (text: string, maxLines: number = 2, maxWidth: number = 30): string => {
              if (!text) return '';

              // Split text into words
              const words = text.split(' ');
              const lines: string[] = [];

              let currentLine = '';
              for (const word of words) {
                // Check if adding this word would exceed the max width
                const testLine = currentLine ? `${currentLine} ${word}` : word;

                if (testLine.length <= maxWidth) {
                  currentLine = testLine;
                } else {
                  // If we have a current line, save it
                  if (currentLine) {
                    lines.push(currentLine);
                  }

                  // If the word itself is longer than maxWidth, truncate it
                  if (word.length > maxWidth) {
                    lines.push(`${word.substring(0, maxWidth - 3)}...`);
                    currentLine = '';
                    // If we already have enough lines, stop processing
                    if (lines.length >= maxLines) {
                      break;
                    }
                  } else {
                    // Start a new line with this word
                    currentLine = word;
                  }

                  // If we already have enough lines, stop processing
                  if (lines.length >= maxLines) {
                    break;
                  }
                }
              }

              // Add the last line if there's space for it
              if (currentLine && lines.length < maxLines) {
                lines.push(currentLine);
              } else if (currentLine && lines.length >= maxLines) {
                // If we're at the limit, add ellipsis to the last line
                const lastLine = lines[maxLines - 1];
                if (lastLine.length > maxWidth - 3) {
                  lines[maxLines - 1] = `${lastLine.substring(0, maxWidth - 3)}...`;
                }
              }

              // Join lines with HTML line breaks
              return lines.join('<br/>');
            };

            const formattedName = formatTooltipName(name, 2, 30);
            
            // Create the URL for contract management with search parameter
            const contractManagementUrl = `${AppRoute.csms.contractManagementDetails.url}?contractId=${id}`;
            
            return `
              <div class="flex flex-col gap-1 p-2 text-xs bg-popover/90 max-w-xs custom-echarts-tooltip">
                <div class="font-bold text-popover-foreground">${formattedName}</div>
                <span class="font-medium">${t($ => $.csms.dashboard.charts.status)}: ${status}</span>
                <div class="font-medium">${t($ => $.csms.dashboard.charts.startDate)}: ${startDate}</div>
                <div class="font-medium">${t($ => $.csms.dashboard.charts.endDate)}: ${endDate}</div>
                <div class="mt-2">
                  <a href="${contractManagementUrl}" 
                     class="inline-block px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors cursor-pointer"
                     onclick="event.stopPropagation(); window.location.href='${contractManagementUrl}'; return false;">
                    ${t($ => $.csms.dashboard.charts.showDetails)}
                  </a>
                </div>
              </div>
            `;
          }
        }
      },
      xAxis: {
        type: 'time',
        name: t($ => $.csms.dashboard.charts.timeline),
        nameLocation: 'middle',
        nameGap: 30,
        min: minDate,
        max: maxDate,
        axisLabel: {
          formatter: (value: number) => {
            return new Date(value).toLocaleDateString();
          }
        }
      },
      yAxis: {
        type: 'category',
        data: formattedNames,
        nameLocation: 'middle',
        nameGap: 50,
        axisLine: { show: true },
        axisTick: { show: true },
        axisLabel: {
          margin: 15,
          // Format labels to have max 2 lines with ellipsis
          formatter: (value: string) => {
            return formatYAxisLabel(value, 50);
          },
          // Enable rich text formatting for multiline support
          rich: {
            // Define styles for multiline text
          }
        }
      },
      series: [{
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const startDate = api.value(0);
          const endDate = api.value(1);
          const yIndex = api.value(2);

          const startCoord = api.coord([startDate, yIndex]);
          const endCoord = api.coord([endDate, yIndex]);

          // Calculate bar height (adjust as needed)
          const barHeight = 20;

          return {
            type: 'rect',
            shape: {
              x: startCoord[0],
              y: startCoord[1] - barHeight / 2,
              width: endCoord[0] - startCoord[0],
              height: barHeight
            },
            style: {
              fill: api.visual('color')
            },
            silent: false
          };
        },
        encode: {
          x: [0, 1], // startDate and endDate
          y: 2        // y-index
        },
        data: seriesData,
        silent: false
      },
      // Add scatter series for assessment markers
      {
        type: 'scatter',
        data: assessmentMarkers,
        symbol: (value: any, params: any) => {
          // Return the symbol if defined in data, otherwise default to circle
          return params.data.symbol || 'circle';
        },
        symbolSize: (value: any, params: any) => {
          // Return the symbolSize if defined in data, otherwise default to 8
          return params.data.symbolSize || 8;
        },
        itemStyle: {
          color: (params: any) => {
            return params.data.itemStyle.color;
          },
          borderColor: (params: any) => {
            return params.data.borderColor;
          },
          borderWidth: (params: any) => {
            return params.data.borderWidth || 0;
          }
        },
        silent: false
      }]
    };

    setChartOptions(options);
  }, [data, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const hasValidData = data && Array.isArray(data) && data.length > 0 &&
    data.some(item => item.name && item.startDate && item.endDate);

  if (!hasValidData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t($ => $.csms.dashboard.noTimelineData)}</p>
      </div>
    );
  }

  const hasValidSeries = chartOptions &&
    chartOptions.series &&
    chartOptions.series.length > 0 &&
    chartOptions.series[0].data &&
    chartOptions.series[0].data.length > 0;

  // Define status colors for legend (excluding 'default')
  const statusLegend = [
    { name: 'finished', color: '#10B981' },
    { name: 'on going', color: '#3B82F6' },
    { name: 'not started', color: '#6B7280' }
  ];

  // Define assessment status colors for legend (excluding 'default')
  const assessmentLegend = [
    { name: 'final assessment', color: '#006400' },
    { name: 'on going', color: '#FFA500' }
  ];

  if (!hasValidSeries) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t($ => $.csms.dashboard.noTimelineData)}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Status Legend */}
      <div className="flex justify-center mb-2">
        <div className="flex flex-wrap gap-4">
          {statusLegend.map((item) => (
            <div key={item.name} className="flex items-center">
              <div 
                className="w-4 h-4 mr-2 rounded-sm" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm capitalize">{item.name}</span>
            </div>
          ))}

          {assessmentLegend.map((item) => (
            <div key={item.name} className="flex items-center">
              <div 
                className="w-3 h-3 mr-2 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm capitalize">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <ReactECharts
        options={chartOptions}
        series={chartOptions.series}
        className="h-136 w-full"
      />
    </div>
  );
};

export default TimelineChart;
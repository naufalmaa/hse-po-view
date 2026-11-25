import { marineFormList } from "@/components/pages/daily-report/create/lib/marine-template";

/**
 * Converts operation data to simple markdown text format
 * @param values - The operation values array containing SBU, NBU, and CBU data
 * @param template - The template (optional, uses marineFormList.operation by default)
 * @returns Simple markdown formatted string with operation data for each region
 */
export const convertOperationToMarkdown = (
  values: Record<string, any>[],
  template: Record<string, any> = marineFormList?.operation
): string => {
  if (!values || !Array.isArray(values) || values.length === 0) return "";

  let markdown = `#### Operation\n\n`;

  // Process each region (SBU, NBU, CBU)
  values.forEach(regionData => {
    const region = regionData?.region || "";
    if (!region) return;

    markdown += `##### ${region}\n`;
    
    // Current Hi-Po Activity
    const currentHiPoLabel = template?.form?.currentHiPoActivity?.shortLabel || "Current Hi-Po Activity";
    const currentHiPoValue = regionData?.currentHiPoActivity || "-";
    markdown += `${currentHiPoLabel}:\n${currentHiPoValue}\n\n`;
    
    // Forecast Hi-Po Activity
    const forecastHiPoLabel = template?.form?.forecastHiPoActivity?.shortLabel || "Forecast Hi-Po Activity";
    const forecastHiPoValue = regionData?.forecastHiPoActivity || "-";
    markdown += `${forecastHiPoLabel}:\n${forecastHiPoValue}\n\n`;
    
    // Weather Data
    const windSpeedLabel = template?.form?.windSpeed?.shortLabel || "Wind Speed";
    const windSpeedValue = regionData?.windSpeed || "-";
    markdown += `${windSpeedLabel}: ${windSpeedValue}  \n`;
    
    const seaLevelLabel = template?.form?.seaLevel?.shortLabel || "Sea Level";
    const seaLevelValue = regionData?.seaLevel || "-";
    markdown += `${seaLevelLabel}: ${seaLevelValue}  \n`;
    
    const skyConditionLabel = template?.form?.skyCondition?.shortLabel || "Sky Condition";
    const skyConditionValue = regionData?.skyCondition || "-";
    markdown += `${skyConditionLabel}: ${skyConditionValue}  \n`;
    
    const pitchingRollingLabel = template?.form?.pitchingRolling?.shortLabel || "Pitching & Rolling";
    const pitchingRollingValue = regionData?.pitchingRolling || "-";
    markdown += `${pitchingRollingLabel}: ${pitchingRollingValue}  \n\n`;
  });

  return markdown;
};
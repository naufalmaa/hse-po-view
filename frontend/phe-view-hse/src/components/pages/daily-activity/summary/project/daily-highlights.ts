import { formList } from "@/components/pages/daily-report/create/lib/project-template";

/**
 * Converts daily highlights data to simple markdown text format
 * @param values - The daily highlights values
 * @param template - The template (optional, uses formList.dailyHighlights by default)
 * @returns Simple markdown formatted string with label: value format
 */
export const convertDailyHighlightsToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList?.dailyHighlights
): string => {
  let markdown = `#### Daily Highlights\n\n`;

  if (!values) {
    markdown += "Tidak ada data \n\n"
    return markdown;
  }

  // Daily Activities
  const dailyActivitiesValue = values?.dailyActivities;
  const dailyActivitiesLabel = template?.form?.dailyActivities?.label || "Daily Activities";
  if (dailyActivitiesValue) {
    markdown += `${dailyActivitiesLabel}:  ${dailyActivitiesValue}  \n`;
  } else {
    markdown += `${dailyActivitiesLabel}: -  \n`;
  }

  // Daily Next Plan
  const dailyNextPlanValue = values?.dailyNextPlan;
  const dailyNextPlanLabel = template?.form?.dailyNextPlan?.label || "Daily Next Plan";
  if (dailyNextPlanValue) {
    markdown += `${dailyNextPlanLabel}:  ${dailyNextPlanValue}  \n`;
  } else {
    markdown += `${dailyNextPlanLabel}: -  \n`;
  }

  // Weather
  const weatherValue = values?.weather;
  const weatherLabel = template?.form?.weather?.label || "Weather";
  if (weatherValue) {
    markdown += `${weatherLabel}:  ${weatherValue}  \n`;
  } else {
    markdown += `${weatherLabel}: -  \n`;
  }

  // Overstay Personnel (list format)
  const overstayPersonnelValue = values?.overstayPersonnel;
  const overstayPersonnelLabel = template?.form?.overstayPersonnel?.label || "Overstay Personnel List";
  if (Array.isArray(overstayPersonnelValue) && overstayPersonnelValue.length > 0) {
    markdown += `${overstayPersonnelLabel}:\n\n`;
    overstayPersonnelValue.forEach((item: any, index: number) => {
      const no = index + 1;
      const name = item?.name || item?.employeeName || '';
      const company = item?.company || item?.subContractorName || '';
      const dob = item?.dob || '';
      markdown += `${no}. **${name}** - ${company} (${dob})  \n`;
    });
    markdown += "\n";
  } else {
    markdown += `${overstayPersonnelLabel}: -  \n`;
  }

  return markdown;
};
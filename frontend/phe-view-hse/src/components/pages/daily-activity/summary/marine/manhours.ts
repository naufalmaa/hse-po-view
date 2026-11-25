import { formList } from "@/components/pages/daily-report/create/lib/project-template";

/**
 * Converts manhours data to simple markdown text format
 * @param values - The manhours values
 * @param template - The template (optional, uses formList.manHours by default)
 * @returns Simple markdown formatted string with label: value format
 */
export const convertManhoursToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList?.manHours
): string => {
  let markdown = `#### Manhours\n\n`;

  if (!values) {
    markdown += "Tidak ada data \n\n"
    return markdown;
  }

  // Only include the two specific data fields from Form03ManHours.tsx lines 79-82
  const manhoursData = [
    { key: "pobPheOses", label: template?.["pobPheOses"]?.["shortLabel"] || "POB PHE OSES" },
    { key: "pobContractor", label: template?.["pobContractor"]?.["shortLabel"] || "POB Contractor" },
  ];

  manhoursData.forEach(item => {
    const value = values?.[item.key] ?? "-";
    markdown += `${item.label}: ${value}  \n`;
  });

  return markdown;
};

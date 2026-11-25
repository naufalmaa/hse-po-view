import { formList } from "@/components/pages/daily-report/create/lib/project-template";

/**
 * Converts lagging indicator data to simple markdown text format
 * @param values - The lagging indicator values
 * @param template - The template (optional, uses formList.laggingIndicator by default)
 * @returns Simple markdown formatted string with label: value format
 */
export const convertLaggingToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList?.laggingIndicator
): string => {
  let markdown = `#### Lagging Indicators\n\n`;

  if (!values) {
    markdown += "Tidak ada data \n\n"
    return markdown;
  }

  // Status
//   markdown += `Status: ${values?.statusFreeLtaRi ? "Free LTA & Free RI" : "Not Free"}  \n`;
  
  // Free LTA Days
  markdown += `Free LTA/RI: ${values?.freeLtaDays !== undefined ? values.freeLtaDays + " Days" : "-"}  \n`;
  
  // Free RI Days
  // markdown += `Free RI Days: ${values?.freeRiDays !== undefined ? values.freeRiDays + " Days" : "-"}  \n`;
  
  // Description
  if (values?.description) {
    markdown += `Description: ${values.description}  \n`;
  }
  
  // Individual indicators
  const indicators = [
    { key: "fatality", label: template?.["fatality"]?.["shortLabel"] || "Fatality" },
    { key: "lti", label: template?.["lti"]?.["shortLabel"] || "LTI" },
    { key: "restrictedWorkDayCase", label: template?.["restrictedWorkDayCase"]?.["shortLabel"] || "Restricted Work Day Case" },
    { key: "medicalTreatmentCase", label: template?.["medicalTreatmentCase"]?.["shortLabel"] || "Medical Treatment Case" },
    { key: "firstAid", label: template?.["firstAid"]?.["shortLabel"] || "First Aid" },
    { key: "nearMiss", label: template?.["nearMiss"]?.["shortLabel"] || "Near Miss" },
    // { key: "unsafeAction", label: template?.["unsafeAction"]?.["shortLabel"] || "Unsafe Action" },
    // { key: "unsafeCondition", label: template?.["unsafeCondition"]?.["shortLabel"] || "Unsafe Condition" },
    { key: "environmentalDamage", label: template?.["environmentalDamage"]?.["shortLabel"] || "Environmental Damage" },
    { key: "propertyDamage", label: template?.["propertyDamage"]?.["shortLabel"] || "Property Damage" },
    { key: "recordableIncident", label: template?.["recordableIncident"]?.["shortLabel"] || "Recordable Incident" },
    { key: "nonRecordableIncident", label: template?.["nonRecordableIncident"]?.["shortLabel"] || "Non Recordable Incident" },
  ];

  indicators.forEach(indicator => {
    const value = values?.[indicator.key] ?? "-";
    markdown += `${indicator.label}: ${value}  \n`;
  });

  return markdown;
};
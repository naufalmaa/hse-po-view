import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { INSTANCE_TYPE, REPORT_TYPE } from "@/constants/app-enum";

/**
 * Converts identity data to simple markdown text format
 * @param values - The identity values
 * @param template - The template (optional, uses formList.identity by default)
 * @returns Simple markdown formatted string with label: value format
 */
export const convertIdentityToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList?.identity
): string => {
  let markdown = `#### Identity\n\n`;

  if (!values) {
    markdown += "Tidak ada data \n\n"
    return markdown;
  }

  // Report Date
  const reportDateLabel = template?.form?.reportDate?.label || "Report Date";
  const reportDateValue = values?.reportDate ? new Date(values.reportDate).toLocaleDateString() : "-";
  markdown += `${reportDateLabel}: ${reportDateValue}  \n`;

  // Reported By
  const reportedByLabel = template?.form?.reportedBy?.label || "Reported By";
  const reportedByValue = values?.reportedBy || "-";
  markdown += `${reportedByLabel}: ${reportedByValue}  \n`;

  // Instance
  const instanceLabel = template?.form?.instansi?.label || "Instance";
  const instanceValue = values?.instansi ? 
    (INSTANCE_TYPE[values.instansi as keyof typeof INSTANCE_TYPE]?.label || values.instansi) : "-";
  markdown += `${instanceLabel}: ${instanceValue}  \n`;

  // Form Type
  const formTypeLabel = template?.form?.formType?.label || "Type of Form";
  const formTypeValue = values?.formType ? 
    (REPORT_TYPE[values.formType as keyof typeof REPORT_TYPE]?.label || values.formType) : "-";
  markdown += `${formTypeLabel}: ${formTypeValue}  \n`;

  // Subtype (only shown if formType is "project")
  if (values?.formType === "project") {
    const subtypeLabel = template?.form?.subtype?.label || "Nama Project";
    const subtypeValue = values?.subtypeName || "-";
    markdown += `${subtypeLabel}: ${subtypeValue}  \n`;

    if (values?.workLocationName) {
      markdown += `Work Location: ${values.workLocationName}  \n`;
    }
  }

  return markdown;
};
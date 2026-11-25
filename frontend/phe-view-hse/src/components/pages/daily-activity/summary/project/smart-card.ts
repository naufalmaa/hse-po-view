import { formList } from "@/components/pages/daily-report/create/lib/project-template";

/**
 * Converts smart card data to simple markdown text format
 * @param values - The smart card values
 * @param template - The template (optional, uses formList.smartCard by default)
 * @returns Simple markdown formatted string with label: value format
 */
export const convertSmartCardToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList?.smartCard
): string => {
  let markdown = `#### Smart Card\n\n`;

  if (!values) {
    markdown += "Tidak ada data \n\n"
    return markdown;
  }

  // Description (textarea field) - displayed as label: \n value
  const descriptionValue = values?.description;
  const descriptionLabel = template?.form?.description?.label || "Description";
  if (descriptionValue) {
    markdown += `${descriptionLabel}:  \n${descriptionValue}  \n`;
  } else {
    markdown += `${descriptionLabel}: -  \n`;
  }

  // Unsafe Action
  const unsafeActionValue = values?.unsafeAction;
  const unsafeActionLabel = template?.form?.unsafeAction?.label || "Unsafe Action";
  markdown += `${unsafeActionLabel}: ${unsafeActionValue ?? 0}  \n`;

  // Unsafe Condition
  const unsafeConditionValue = values?.unsafeCondition;
  const unsafeConditionLabel = template?.form?.unsafeCondition?.label || "Unsafe Condition";
  markdown += `${unsafeConditionLabel}: ${unsafeConditionValue ?? 0}  \n`;

  // Near Miss
  const nearMissValue = values?.nearMiss;
  const nearMissLabel = template?.form?.nearMiss?.label || "Near Miss";
  markdown += `${nearMissLabel}: ${nearMissValue ?? 0}  \n`;

  // Process Safety
  const processSafetyValue = values?.processSafety;
  const processSafetyLabel = template?.form?.processSafety?.label || "Process Safety";
  markdown += `${processSafetyLabel}: ${processSafetyValue ?? 0}  \n`;

  // Non Participants
  const nonParticipantsValue = values?.nonParticipants;
  const nonParticipantsLabel = template?.form?.nonParticipants?.label || "Non Participants";
  if (Array.isArray(nonParticipantsValue) && nonParticipantsValue.length > 0) {
    markdown += `${nonParticipantsLabel}:\n\n`;
    nonParticipantsValue.forEach((item: any, index: number) => {
      const no = index + 1;
      const name = item?.name || '';
      const company = item?.company || '';
      markdown += `${no}. **${name}** (${company})  \n`;
    });
    markdown += "\n";
  } else {
    markdown += `${nonParticipantsLabel}: -  \n`;
  }

  return markdown;
};
import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { getMeetingType, MEETING_TYPE } from "@/constants/app-enum";

/**
 * Converts meeting data to simple markdown text format using table or list format
 * @param format - The format to return ("list" or "table"), defaults to "table"
 * @param meetings - The array of meeting values
 * @param template - The template (optional, uses formList.meeting by default)
 * @returns Simple markdown formatted string with specified format
 */
export const convertMeetingToMarkdown = (
  meetings: Record<string, any>[],
  template: Record<string, any> = formList?.meeting,
  format: "list" | "table" = "table",
  maxCharLength: number = 80
): string => {

  if (format === "table") {
    return convertToTableFormat(meetings, template, maxCharLength);
  } else {
    return convertToListFormat(meetings, template, maxCharLength);
  }
};

/**
 * Converts meeting data to markdown table format
 */
const convertToTableFormat = (
  meetings: Record<string, any>[],
  template: Record<string, any>,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Meeting\n\n`;

  // Create table header
  markdown += `| Jenis Meeting | Meeting Agenda | Participant |\n`;
  markdown += `|--------------|----------------|--------------|\n`;

  // Check if there are no meetings and add a "no data" row
  if (!meetings || meetings.length === 0) {
    markdown += `| Tidak ada data|\n`;
    return markdown;
  }

  // Process each meeting
  meetings.forEach((meeting: any) => {
    const jenisMeeting = getMeetingType(meeting);
    let description = meeting?.description || "-";
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const absencePercentage = meeting?.absencePercentage !== undefined ? meeting?.absencePercentage : "-";

    // Escape pipe characters in data to prevent table formatting issues
    const escapePipes = (text: any) => {
      // Convert to string if not already a string
      const str = typeof text === 'string' ? text : String(text);
      return str.replace(/\|/g, '\\|');
    };

    markdown += `| ${escapePipes(jenisMeeting)} | ${escapePipes(description)} | ${escapePipes(absencePercentage)} |\n`;
  });

  return markdown;
};

/**
 * Converts meeting data to markdown list format
 */
const convertToListFormat = (
  meetings: Record<string, any>[],
  template: Record<string, any>,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Meeting\n\n`;

  // Check if there are no meetings and add a "no data" message
  if (!meetings || meetings.length === 0) {
    markdown += `No data\n`;
    return markdown;
  }

  // Process each meeting as a list
  meetings.forEach((meeting: any, index: number) => {
    markdown += `##### Meeting ${index + 1}\n\n`;

    const jenisMeetingValue = meeting?.jenisMeeting || "-";
    const meetingType = MEETING_TYPE[jenisMeetingValue as keyof typeof MEETING_TYPE];
    const jenisMeeting = meetingType?.label || jenisMeetingValue;
    let description = meeting?.description || "-";
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const absencePercentage = meeting?.absencePercentage !== undefined ? meeting?.absencePercentage : "-";

    const jenisMeetingLabel = template?.form?.jenisMeeting?.label || "Jenis Meeting";
    const descriptionLabel = template?.form?.description?.label || "Meeting Agenda";
    const absencePercentageLabel = "Total Participant";

    markdown += `${jenisMeetingLabel}: ${jenisMeeting}  \n`;
    
    // Description (textarea field) - displayed as label: \n value
    if (description && description !== "-") {
      markdown += `${descriptionLabel}:  \n${description}  \n`;
    } else {
      markdown += `${descriptionLabel}: -  \n`;
    }
    
    markdown += `${absencePercentageLabel}: ${absencePercentage}  \n`;

    markdown += `\n`;
  });

  return markdown;
};
import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { getDrillType } from "@/constants/app-enum";

/**
 * Converts drill data to simple markdown text format using table or list format
 * @param format - The format to return ("list" or "table"), defaults to "table"
 * @param drills - The array of drill values
 * @param template - The template (optional, uses formList.drill by default)
 * @returns Simple markdown formatted string with specified format
 */
export const convertDrillToMarkdown = (
  drills: Record<string, any>[],
  template: Record<string, any> = formList?.drill,
  format: "list" | "table" = "table",
  maxCharLength: number = 80
): string => {
  if (!drills || drills.length === 0) return "";

  if (format === "table") {
    return convertToTableFormat(drills, template, maxCharLength);
  } else {
    return convertToListFormat(drills, template, maxCharLength);
  }
};

/**
 * Converts drill data to markdown table format
 */
const convertToTableFormat = (
  drills: Record<string, any>[],
  template: Record<string, any> = formList?.drill,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Drill\n\n`;

  // Create table header
  markdown += `| Jenis Drill | Deskripsi Drill | Participant |\n`;
  markdown += `|-------------|------------------|-------------------|\n`;

  // Check if there are no meetings and add a "no data" row
  if (!drills || drills.length === 0) {
    markdown += `| Tidak ada data|\n`;
    return markdown;
  }

  // Process each drill
  drills.forEach((drill: any) => {
    const jenisDrill = getDrillType(drill);
    let description = drill?.description || "-";
    
    // Try to get total participant value (could be from various field names)
    let totalParticipant: any = "-";
    if (drill?.totalParticipant !== undefined) {
      totalParticipant = drill.totalParticipant;
    } else if (drill?.totalParticipants !== undefined) {
      totalParticipant = drill.totalParticipants;
    } else if (drill?.absencePercentage !== undefined) {
      totalParticipant = drill.absencePercentage;
    }
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    // Escape pipe characters in data to prevent table formatting issues
    const escapePipes = (text: any) => {
      // Convert to string if not already a string
      const str = typeof text === 'string' ? text : String(text);
      return str.replace(/\|/g, '\\|');
    };

    markdown += `| ${escapePipes(jenisDrill)} | ${escapePipes(description)} | ${escapePipes(totalParticipant)} |\n`;
  });

  return markdown;
};

/**
 * Converts drill data to markdown list format
 */
const convertToListFormat = (
  drills: Record<string, any>[],
  template: Record<string, any> = formList?.drill,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Drill\n\n`;

  // Process each drill as a list
  drills.forEach((drill: any, index: number) => {
    markdown += `##### Drill ${index + 1}\n\n`;

    const jenisDrill = getDrillType(drill) || "-";
    let description = drill?.description || "-";
    
    // Try to get total participant value (could be from various field names)
    let totalParticipant: any = "-";
    if (drill?.totalParticipant !== undefined) {
      totalParticipant = drill.totalParticipant;
    } else if (drill?.totalParticipants !== undefined) {
      totalParticipant = drill.totalParticipants;
    } else if (drill?.absencePercentage !== undefined) {
      totalParticipant = drill.absencePercentage;
    }
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const jenisDrillLabel = template?.form?.status?.label || "Jenis Drill";
    const descriptionLabel = template?.form?.description?.label || "Drill Description";
    const totalParticipantLabel = "Total Participant";

    markdown += `${jenisDrillLabel}: ${jenisDrill}  \n`;
    
    // Description (textarea field) - displayed as label: \n value
    if (description && description !== "-") {
      markdown += `${descriptionLabel}:  \n${description}  \n`;
    } else {
      markdown += `${descriptionLabel}: -  \n`;
    }
    
    // Add total participant if it exists
    markdown += `${totalParticipantLabel}: ${totalParticipant}  \n`;
    
    markdown += `\n`;
  });

  return markdown;
};
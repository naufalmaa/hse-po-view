import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { getTrainingType } from "@/constants/app-enum";

/**
 * Converts training data to simple markdown text format using table or list format
 * @param format - The format to return ("list" or "table"), defaults to "table"
 * @param trainings - The array of training values
 * @param template - The template (optional, uses formList.training by default)
 * @returns Simple markdown formatted string with specified format
 */
export const convertTrainingToMarkdown = (
  trainings: Record<string, any>[],
  template: Record<string, any> = formList?.training,
  format: "list" | "table" = "table",
  maxCharLength: number = 80
): string => {
  if (!trainings || trainings.length === 0) return "";

  if (format === "table") {
    return convertToTableFormat(trainings, template, maxCharLength);
  } else {
    return convertToListFormat(trainings, template, maxCharLength);
  }
};

/**
 * Converts training data to markdown table format
 */
const convertToTableFormat = (
  trainings: Record<string, any>[],
  template: Record<string, any> = formList?.training,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Training\n\n`;

  // Create table header
  markdown += `| Jenis Training | Deskripsi Training | Participant |\n`;
  markdown += `|---------------|-------------------|------------------|\n`;

  // Check if there are no data and add a "no data" row
  if (!trainings || trainings.length === 0) {
    markdown += `| Tidak ada data|\n`;
    return markdown;
  }

  // Process each training
  trainings.forEach((training: any) => {
    const jenisTraining = getTrainingType(training);
    let description = training?.description || "-";
    
    // Try to get total participant value (could be from various field names)
    let totalParticipant: any = "-";
    if (training?.totalParticipant !== undefined) {
      totalParticipant = training.totalParticipant;
    } else if (training?.totalParticipants !== undefined) {
      totalParticipant = training.totalParticipants;
    } else if (training?.absencePercentage !== undefined) {
      totalParticipant = training.absencePercentage;
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

    markdown += `| ${escapePipes(jenisTraining)} | ${escapePipes(description)} | ${escapePipes(totalParticipant)} |\n`;
  });

  return markdown;
};

/**
 * Converts training data to markdown list format
 */
const convertToListFormat = (
  trainings: Record<string, any>[],
  template: Record<string, any> = formList?.training,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Training\n\n`;

  // Process each training as a list
  trainings.forEach((training: any, index: number) => {
    markdown += `##### Training ${index + 1}\n\n`;

    const jenisTraining = getTrainingType(training) || "-";
    let description = training?.description || "-";
    
    // Try to get total participant value (could be from various field names)
    let totalParticipant: any = "-";
    if (training?.totalParticipant !== undefined) {
      totalParticipant = training.totalParticipant;
    } else if (training?.totalParticipants !== undefined) {
      totalParticipant = training.totalParticipants;
    } else if (training?.absencePercentage !== undefined) {
      totalParticipant = training.absencePercentage;
    }
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const jenisTrainingLabel = template?.form?.status?.label || "Jenis Training";
    const descriptionLabel = template?.form?.description?.label || "Training Description";
    const totalParticipantLabel = "Total Participant";

    markdown += `${jenisTrainingLabel}: ${jenisTraining}  \n`;
    
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
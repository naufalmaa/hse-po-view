import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { getPermitToWorkType } from "@/constants/app-enum";

/**
 * Converts permit to work data to simple markdown text format using table or list format
 * @param format - The format to return ("list" or "table"), defaults to "table"
 * @param permits - The array of permit to work values
 * @param template - The template (optional, uses formList.permitToWork by default)
 * @returns Simple markdown formatted string with specified format
 */
export const convertPermitToWorkToMarkdown = (
  permits: Record<string, any>[],
  template: Record<string, any> = formList?.permitToWork,
  format: "list" | "table" = "table",
  maxCharLength: number = 80
): string => {

  if (format === "table") {
    return convertToTableFormat(permits, template, maxCharLength);
  } else {
    return convertToListFormat(permits, template, maxCharLength);
  }
};

/**
 * Converts permit to work data to markdown table format
 */
const convertToTableFormat = (
  permits: Record<string, any>[],
  template: Record<string, any>,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Permit To Work\n\n`;

  // Create table header
  markdown += `| No | Type | Description | Open Date | No. of PTW | Location | RA/JSAA | Performing Authority | Site Controller |\n`;
  markdown += `|----|---------------------|----------------------------|------------|----------|----------|---------|-------------------|----------------|\n`;

  // Check if there are no permits and add a "no data" row
  if (!permits || permits.length === 0) {
    markdown += `| Tidak ada data |\n`;
    return markdown;
  }

  // Process each permit
  permits.forEach((permit: any, index: number) => {
    const permitToWorkType = getPermitToWorkType(permit);
    let description = permit?.description || "-";
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const openDate = permit?.openDate !== undefined ? permit?.openDate : "-";
    const noPTW = permit?.noPTW !== undefined ? permit?.noPTW : "-";
    const location = permit?.location !== undefined ? permit?.location : "-";
    const RA_JSA = permit?.RA_JSA !== undefined ? permit?.RA_JSA : "-";
    const performingAuthority = permit?.performingAuthority !== undefined ? permit?.performingAuthority : "-";
    const siteController = permit?.siteController !== undefined ? permit?.siteController : "-";

    // Escape pipe characters in data to prevent table formatting issues
    const escapePipes = (text: any) => {
      // Convert to string if not already a string
      const str = typeof text === 'string' ? text : String(text);
      return str.replace(/\|/g, '\\|');
    };

    markdown += `| ${index + 1} | ${escapePipes(permitToWorkType)} | ${escapePipes(description)} | ${escapePipes(openDate)} | ${escapePipes(noPTW)} | ${escapePipes(location)} | ${escapePipes(RA_JSA)} | ${escapePipes(performingAuthority)} | ${escapePipes(siteController)} |\n`;
  });

  return markdown;
};

/**
 * Converts permit to work data to markdown list format
 */
const convertToListFormat = (
  permits: Record<string, any>[],
  template: Record<string, any>,
  maxCharLength: number = 80
): string => {
  let markdown = `#### Permit To Work\n\n`;

  // Check if there are no permits and add a "no data" message
  if (!permits || permits.length === 0) {
    markdown += `No data\n`;
    return markdown;
  }

  // Process each permit as a list
  permits.forEach((permit: any, index: number) => {
    markdown += `##### Permit To Work ${index + 1}\n\n`;

    const permitToWorkType = getPermitToWorkType(permit);
    let description = permit?.description || "-";
    
    // Truncate description if it exceeds maxCharLength
    if (description !== "-" && description.length > maxCharLength) {
      description = description.substring(0, maxCharLength) + "...";
    }
    
    const noPTW = permit?.noPTW !== undefined ? permit?.noPTW : "-";
    const location = permit?.location !== undefined ? permit?.location : "-";
    const openDate = permit?.openDate !== undefined ? permit?.openDate : "-";
    const RA_JSA = permit?.RA_JSA !== undefined ? permit?.RA_JSA : "-";
    const performingAuthority = permit?.performingAuthority !== undefined ? permit?.performingAuthority : "-";
    const siteController = permit?.siteController !== undefined ? permit?.siteController : "-";

    const permitToWorkTypeLabel = template?.form?.status?.label || "Permit To Work Type";
    const descriptionLabel = template?.form?.description?.label || "Permit To Work Description";
    const noPTWLabel = template?.form?.noPTW?.label || "No. of PTW";
    const locationLabel = template?.form?.location?.label || "Location";
    const openDateLabel = template?.form?.openDate?.label || "Open Date";
    const RA_JSALabel = template?.form?.RA_JSA?.label || "RA/JSAA";
    const performingAuthorityLabel = template?.form?.performingAuthority?.label || "Performing Authority";
    const siteControllerLabel = template?.form?.siteController?.label || "Site Controller";

    markdown += `${permitToWorkTypeLabel}: ${permitToWorkType}  \n`;
    
    // Description (textarea field) - displayed as label: \n value
    if (description && description !== "-") {
      markdown += `${descriptionLabel}:  \n${description}  \n`;
    } else {
      markdown += `${descriptionLabel}: -  \n`;
    }
    
    markdown += `${noPTWLabel}: ${noPTW}  \n`;
    markdown += `${locationLabel}: ${location}  \n`;
    markdown += `${openDateLabel}: ${openDate}  \n`;
    markdown += `${RA_JSALabel}: ${RA_JSA}  \n`;
    markdown += `${performingAuthorityLabel}: ${performingAuthority}  \n`;
    markdown += `${siteControllerLabel}: ${siteController}  \n`;

    markdown += `\n`;
  });

  return markdown;
};
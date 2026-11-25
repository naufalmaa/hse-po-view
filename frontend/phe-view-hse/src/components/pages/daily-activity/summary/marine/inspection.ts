import { formList } from "@/components/pages/daily-report/create/lib/project-template";
import { getInspectionMarineType } from "@/constants/app-enum";

/**
 * Converts inspection data to simple markdown text format using table or list format
 * @param inspections - The array of inspection values
 * @param template - The template (optional, uses formList.inspection by default)
 * @param format - The format to return ("list" or "table"), defaults to "list"
 * @returns Simple markdown formatted string with specified format
 */
export const convertInspectionToMarkdown = (
    subTitle: string = "Pre-Inspections",
    format: "list" | "table" = "list",
    inspections: Record<string, any>[],
    template: Record<string, any> = formList?.inspection,
): string => {
    if (!inspections || inspections.length === 0) return "";

    if (format === "table") {
        return convertToTableFormat(inspections, template, subTitle);
    } else {
        return convertToListFormat(inspections, template, subTitle);
    }
};

/**
 * Converts inspection data to markdown table format
 */
const convertToTableFormat = (
    inspections: Record<string, any>[],
    template: Record<string, any>,
    subTitle: string = "Pre-Inspections"
): string => {
    let markdown = `#### ${subTitle}\n\n`;

    // Create table header
    markdown += `| Status | Description |\n`;
    markdown += `|--------|-------------|\n`;

        // Check if there are no data and add a "no data" row
    if (!inspections || inspections.length === 0) {
        markdown += `| Tidak ada data|\n`;
        return markdown;
    }
    
    // Process each inspection
    inspections.forEach((inspection: any) => {
        const status = getInspectionMarineType(inspection);
        const description = inspection?.description || "-";

        // Escape pipe characters in data to prevent table formatting issues
        const escapePipes = (text: string) => text.replace(/\|/g, '\\|');

        markdown += `| ${escapePipes(status)} | ${escapePipes(description)} |\n`;
    });

    return markdown;
};

/**
 * Converts inspection data to markdown list format
 */
const convertToListFormat = (
    inspections: Record<string, any>[],
    template: Record<string, any>,
    subTitle: string = "Pre-Inspections"
): string => {
    let markdown = `#### ${subTitle}\n\n`;

    // Process each inspection as a list
    inspections.forEach((inspection: any, index: number) => {
        markdown += `##### ${subTitle} ${index + 1}\n\n`;

        const status = inspection?.status || "-";
        const description = inspection?.description || "-";

        // For list format, we use the label: value pattern with textarea handling
        markdown += `Status: ${status}  \n`;

        // Description (textarea field) - displayed as label: \n value
        if (description && description !== "-") {
            markdown += `Description:  \n${description}  \n`;
        } else {
            markdown += `Description: -  \n`;
        }
    });

    return markdown;
};
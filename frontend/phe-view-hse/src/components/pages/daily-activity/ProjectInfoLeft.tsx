import * as React from "react";
import { convertProjectDataToMarkdown } from "./project/utils";

type Props = {
  template: Record<string, any>
  values: Record<string, any>
  className?: string
}

export const ProjectInfoLeft = ({template, values, className}: Props) => {
  // Convert all project data to markdown text
  const markdownContent = convertProjectDataToMarkdown(values, template);
  
  return (
    <div className={"flex flex-col gap-4"}>
      {/* The markdown content will be rendered by MarkdownViewer */}
      <div style={{ display: 'none' }} data-markdown-content={markdownContent} />
    </div>
  );
}

// Export a function to get the markdown content
export const getProjectInfoMarkdown = (values: Record<string, any>, template: Record<string, any>) => {
  return convertProjectDataToMarkdown(values, template);
};

export default ProjectInfoLeft;
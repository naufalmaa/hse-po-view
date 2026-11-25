import React from "react";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import { convertLaggingToMarkdown } from "./project/lagging";
import { convertManhoursToMarkdown } from "./marine/manhours";
import { convertMeetingToMarkdown } from "./project/meeting";
import { convertDrillToMarkdown } from "./project/drill";
import { convertTrainingToMarkdown } from "./project/training";
import { convertInspectionToMarkdown } from "./marine/inspection";
import { convertSmartCardToMarkdown } from "./project/smart-card";
import { convertIdentityToMarkdown } from "./project/identity";
import { convertOperationToMarkdown } from "./marine/operation";
import '@/assets/markdown-viewer.css';

type Props = {
  template: Record<string, any>,
  value: Record<string, any>,
  className?: string
};

const MdMarineViewer = ({ template, value, className }: Props) => {
  // Generate markdown content based on the template and value
  const generateMarkdown = () => {
    // Get identity data (from Form01Identity.tsx lines 151-157)
    const identity = convertIdentityToMarkdown(value);
    
    const lagging = convertLaggingToMarkdown(value?.detail?.lagging);
    const manhours = convertManhoursToMarkdown(value?.detail?.manhours);
    const meeting = convertMeetingToMarkdown(value?.detail?.meeting, undefined, "table", 80);
    const operation = convertOperationToMarkdown(value?.detail?.operations); // Get operation data
    const drill = convertDrillToMarkdown(value?.detail?.drill);
    const training = convertTrainingToMarkdown(value?.detail?.training);

    // Get smart card data
    const smartCard = convertSmartCardToMarkdown(value?.detail?.smartCard);

    const inspections = value?.detail?.inspections || [];
    const inspection = convertInspectionToMarkdown("Inspection", "table", inspections?.filter((item: any) => item?.type === 'field') ?? [],);
    
    const markdown = `${identity}

 ${lagging}

 ${manhours}

 ${meeting}

 ${drill}

 ${training}

 ${inspection}

 ${smartCard}

 ${operation}

`;

    return markdown;
  };

  const markdownContent = generateMarkdown();

  return (
    <div className="px-6">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          br: () => <br />,
          p: ({ children }) => <p>{children}</p>
        }}
      >
        {markdownContent}
      </Markdown>
    </div>
  );
};

export default MdMarineViewer;
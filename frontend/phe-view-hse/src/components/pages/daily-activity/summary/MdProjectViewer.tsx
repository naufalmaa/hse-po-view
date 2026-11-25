import React from "react";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import { convertLaggingToMarkdown } from "./project/lagging";
import { convertManhoursToMarkdown } from "./project/manhours";
import { convertMeetingToMarkdown } from "./project/meeting";
import { convertDrillToMarkdown } from "./project/drill";
import { convertTrainingToMarkdown } from "./project/training";
import { convertInspectionToMarkdown } from "./project/inspection";
import { convertSmartCardToMarkdown } from "./project/smart-card";
import { convertPermitToWorkToMarkdown } from "./project/permit-to-work";
import { convertDailyHighlightsToMarkdown } from "./project/daily-highlights";
import { convertIdentityToMarkdown } from "./project/identity";
import '@/assets/markdown-viewer.css';

type Props = {
  template: Record<string, any>,
  value: Record<string, any>,
  className?: string
};

const MdProjectViewer = ({ template, value, className }: Props) => {
  // Generate markdown content based on the template and value
  const generateMarkdown = () => {
    // Get identity data (from Form01Identity.tsx lines 151-157)
    const identity = convertIdentityToMarkdown(value);
    
    const lagging = convertLaggingToMarkdown(value?.detail?.lagging);
    const manhours = convertManhoursToMarkdown(value?.detail?.manhours);
    const meeting = convertMeetingToMarkdown(value?.detail?.meeting, undefined, "table", 80);
    const drill = convertDrillToMarkdown(value?.detail?.drill);
    const training = convertTrainingToMarkdown(value?.detail?.training);
    // Get inspection data and convert to markdown list (default format)
    const inspections = value?.detail?.inspections || [];
    const pre_inspection = convertInspectionToMarkdown("Pre-Insepection", "table", inspections?.filter((item: any) => item?.type === 'pre_use') ?? []);
    const inspection = convertInspectionToMarkdown("Inspection", "table", inspections?.filter((item: any) => item?.type === 'field') ?? [],);

    // Get smart card data
    const smartCard = convertSmartCardToMarkdown(value?.detail?.smartCard);
    
    // Get permit to work data
    const permitToWork = convertPermitToWorkToMarkdown(value?.detail?.permit);

    // Get daily highlights data
    const dailyHighlights = convertDailyHighlightsToMarkdown(value?.detail?.highlight);

    const markdown = `${identity}

${lagging}

 ${manhours}

 ${meeting}

 ${drill}

 ${training}

 ${pre_inspection}

 ${inspection}

 ${smartCard}

 ${permitToWork}

 ${dailyHighlights}
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

export default MdProjectViewer;
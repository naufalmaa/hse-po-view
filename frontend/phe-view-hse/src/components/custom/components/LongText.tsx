import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface LongTextProps {
  text: string;
  maxChars?: number;
  maxLines?: number;
  className?: string;
  isHtml?: boolean;
}

export const LongText: React.FC<LongTextProps> = ({
  text = "",
  maxChars = 80,
  maxLines = 2,
  className,
  isHtml = false
}) => {
  // Truncate text based on maxChars
  const truncateText = (text: string, maxChars: number) => {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  };

  const shouldTruncate = text.length > maxChars;
  const displayText = shouldTruncate ? truncateText(text, maxChars) : text;

  return (
    <div className={cn("text-left", className)}>
      {shouldTruncate ? (
        <>
          {isHtml ? (
            <span dangerouslySetInnerHTML={{ __html: displayText }} />
          ) : (
            displayText
          )}
          <Popover>
            <PopoverTrigger asChild>
              <span
                className="text-blue-500 hover:underline cursor-pointer ml-1"
              >
                More
              </span>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs max-h-[400px] overflow-y-auto">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: text }} />
              ) : (
                <p className="whitespace-pre-wrap">{text}</p>
              )}
            </PopoverContent>
          </Popover>
        </>
      ) : (
        <>{isHtml ? <span dangerouslySetInnerHTML={{ __html: displayText }} /> : displayText}</>
      )}
    </div>
  );
};
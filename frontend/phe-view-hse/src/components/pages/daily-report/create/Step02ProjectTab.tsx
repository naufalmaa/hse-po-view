import { cn } from "@/lib/utils";
import * as React from "react";
import { tabListProjectReport } from "./lib/project-template";
import {
  LuActivity,
  LuClock,
  LuUsers,
  LuClipboardCheck,
  LuShield,
  LuFileText,
  LuSettings,
  LuTarget,
  LuCalendarDays,
  LuFolder,
  LuChevronRight,
  LuUser
} from "react-icons/lu";

type Props = {
  tabList: typeof tabListProjectReport,
  stepPosition: string,
  setStepPosition: React.Dispatch<React.SetStateAction<string>>;
}
const Step02ProjectTab = ({tabList, stepPosition, setStepPosition }: Props) => {
  const getTabIcon = (value: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      identity: <LuUser className="h-4 w-4" />,
      laggingIndicator: <LuActivity className="h-4 w-4" />,
      manHours: <LuClock className="h-4 w-4" />,
      meeting: <LuUsers className="h-4 w-4" />,
      drill: <LuTarget className="h-4 w-4" />,
      training: <LuClipboardCheck className="h-4 w-4" />,
      preUseInspection: <LuShield className="h-4 w-4" />,
      inspection: <LuSettings className="h-4 w-4" />,
      smartCard: <LuFileText className="h-4 w-4" />,
      permitToWork: <LuClipboardCheck className="h-4 w-4" />,
      dailyHighlights: <LuCalendarDays className="h-4 w-4" />,
      uploadFile: <LuFolder className="h-4 w-4" />,
    };
    return iconMap[value] || <LuFileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2 p-0">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {(Object.keys(tabList).length > 0) ? "Report Sections" : ""}
      </div>
      <div className="space-y-1">
        {
          Object.values(tabList).map((item, index) => {
            const isActive = item.value === stepPosition;
            return (
              <button
                key={index}
                onClick={() => setStepPosition(item.value)}
                className={cn(
                  "group relative w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm font-medium",
                  "transition-all duration-200 ease-in-out",
                  "border border-transparent",
                  "hover:shadow-sm hover:scale-[1.02]",
                  isActive
                    ? "bg-primary/10 border-primary/20 text-primary dark:bg-primary/20 dark:border-primary/30 dark:text-primary-foreground shadow-sm"
                    : "bg-card hover:bg-accent/50 text-foreground hover:text-accent-foreground border-border/50 hover:border-border"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-primary dark:text-primary-foreground"
                    : "text-muted-foreground group-hover:text-accent-foreground"
                )}>
                  {getTabIcon(item.value)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium truncate transition-colors duration-200",
                    isActive ? "text-primary dark:text-primary-foreground" : "group-hover:text-accent-foreground"
                  )}>
                    {item.label}
                  </div>
                  <div className={cn(
                    "text-xs truncate transition-colors duration-200 mt-0.5",
                    isActive
                      ? "text-primary/70 dark:text-primary-foreground/70"
                      : "text-muted-foreground group-hover:text-muted-foreground"
                  )}>
                    {item.desc}
                  </div>
                </div>

                <div className={cn(
                  "flex-shrink-0 transition-all duration-200",
                  isActive
                    ? "text-primary dark:text-primary-foreground opacity-100 translate-x-0"
                    : "text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                )}>
                  <LuChevronRight className="h-3 w-3" />
                </div>

                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}
              </button>
            )
          })
        }
      </div>
    </div>
  )
}
export default Step02ProjectTab
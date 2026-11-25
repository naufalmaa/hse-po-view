import React from "react";
import {cn} from "@/lib/utils";

type CardStatsProps = {
  title: string;
  value: string | number | any;
  className?: string;
  classNameTitleContainer?: string;
  classNameTitle?: string;
  classNameValue?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

const CardStats = ({
                     title, 
                     value, 
                     className = "",
                     classNameTitleContainer,
                     classNameTitle = "", 
                     classNameValue = "",
                     icon,
                     trend
                   }: CardStatsProps) => {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out",
      "hover:scale-[1.02] hover:border-border/80 group overflow-hidden",
      className
    )}>
      {/* Header Section with Title */}
      <div className={cn(
        "relative flex flex-col items-center justify-center rounded-t-xl py-3 px-2",
        "bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm",
        "border-b border-white/20 group-hover:border-white/30 transition-colors duration-300",
        classNameTitleContainer
      )}>
        {/* Optional Icon */}
        {icon && (
          <div className="mb-1 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            {icon}
          </div>
        )}
        
        {/* Title */}
        <div className={cn(
          "text-xs font-medium text-center leading-tight",
          "px-1 max-w-full overflow-hidden text-ellipsis",
          "group-hover:text-opacity-100 transition-all duration-300",
          classNameTitle
        )}>
          {title}
        </div>
        
        {/* Decorative line */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-white/30 rounded-full"></div>
      </div>
      
      {/* Value Section */}
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-gradient-to-b from-background/50 to-background">
        <div className={cn(
          "font-bold text-2xl leading-none mb-1",
          "text-foreground group-hover:scale-105 transition-transform duration-300",
          "tracking-tight",
          classNameValue
        )}>
          {value}
        </div>
        
        {/* Optional Trend Indicator */}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium mt-1",
            trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            <span className={cn(
              "inline-block w-0 h-0 border-l-[3px] border-r-[3px] border-transparent",
              trend.isPositive 
                ? "border-b-[4px] border-b-green-600 dark:border-b-green-400" 
                : "border-t-[4px] border-t-red-600 dark:border-t-red-400"
            )}></span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      
      {/* Subtle bottom accent */}
      <div className="h-1 bg-gradient-to-r from-transparent via-muted to-transparent group-hover:via-muted/80 transition-colors duration-300"></div>
    </div>
  )
}

export default CardStats
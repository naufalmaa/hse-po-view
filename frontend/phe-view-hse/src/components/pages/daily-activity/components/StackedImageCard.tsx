import React from 'react';
import {cn} from "@/lib/utils";

interface StackedImageCardProps {
  images: any[];
  asset: Record<string, any>;
  selected: boolean;
}

export default function StackedImageCard({images, asset, selected}: StackedImageCardProps) {

  return (
    <div className={cn("flex flex-col gap-6 p-2 mt-2 mb-4 mx-1 rounded-xl shadow-sm",
      selected ? "bg-primary/80 text-background" : "bg-card text-foreground"
    )}>
      <div className="pl-0 pt-0 pr-8 pb-4 flex flex-col items-center justify-center">
        <div className="relative w-36 h-28">
          {images.map((image: Record<string, any>, index: number) => {
            return (
              <img
                key={index}
                src={image?.src}
                alt={""}
                className={`absolute w-full h-full object-cover rounded-lg border-2 border-muted-foreground transition-all duration-300 bg-secondary
              ${index === 0 ? 'transform translate-x-8 translate-y-0 blur-[1px]' :
                  index === 1 ? 'transform translate-x-4 translate-y-4 blur-[1px]' :
                    'transform translate-x-0 translate-y-8'}`}
              />
            )
          })}
        </div>
      </div>
      <div className="w-full">
        <div className={"font-semibold text-center"}>{asset?.reportDate ?? ""}</div>
        <div className={"flex flex-row gap-2 justify-between"}>
          <div className={cn("text-xs border rounded-md px-1 text-primary truncate", selected ? 'text-muted' : '')}>{asset?.formType ?? ""}</div>
          <div className={cn("text-xs border rounded-md px-1 text-muted-foreground truncate", selected ? 'text-muted' : '')}>
            {asset?.subtypeName ?? ""}
            {asset?.workLocationName ? ` - ${asset.workLocationName}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

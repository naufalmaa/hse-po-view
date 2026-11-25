import {Carousel, CarouselContent, CarouselItem} from "@/components/ui/carousel"
import {cn} from "@/lib/utils";
import React, {useEffect, useRef, useState} from "react";

type Props = {
  value: any
}
const ImageCarousel = ({value}: Props) => {
  const [selectedImages, setSelectedImages] = useState(value?.assets?.length > 0 ? 0 : -1);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setSelectedImages((prev) => {
        let idx = 0;
        if (e.deltaY > 0) {
          idx = Math.min(prev + 1, value?.assets?.length - 1);
        } else {
          idx = Math.max(prev - 1, 0);
        }
        return idx;
      });
    };

    setSelectedImages(value?.assets?.length > 0 ? 0 : -1);
    el.addEventListener("wheel", handleWheel, {passive: false});
    return () => el.removeEventListener("wheel", handleWheel);
  }, [value?.assets?.length]);

  return (
    <div className={"flex flex-col gap-4 w-full items-center justify-center"}
         // onWheel={handleWheel}
    >

      {selectedImages !== -1 &&
        <div className={"flex flex-col gap-4 w-full"}>
          <div className={"flex flex-col gap-4 w-full items-center"}>
            {/* Previous Image */}
            {/* <div className={"flex-1 flex flex-col items-center"}>
              {selectedImages > 0 ? (
                <div className={"flex flex-col items-center"}>
                  <img
                    src={value?.assets?.[selectedImages - 1]?.src}
                    alt="Previous"
                    className={cn(
                      "object-cover rounded-xl opacity-70 hover:opacity-100 transition-opacity cursor-pointer",
                      "h-[200px] w-full"
                    )}
                    onClick={() => setSelectedImages(selectedImages - 1)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{value?.assets?.[selectedImages-1]?.note || '-'}</div>
                </div>
              ) : (
                <div className="h-[200px] w-[200px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30">
                  <span className="text-muted-foreground">No previous image</span>
                </div>
              )}
            </div> */}

            {/* Current Image */}
            <div className={"flex-1 flex flex-col items-center"}>
              {value?.assets?.[selectedImages]?.src ? (
                <img
                  src={value.assets[selectedImages].src}
                  alt=""
                  className={cn(
                    "object-cover rounded-xl border-2 border-primary shadow-lg",
                    "h-[400px] w-full"
                  )}
                />
              ) : (
                <div className="h-[400px] w-full flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/50">
                  <span className="text-muted-foreground">No current image</span>
                </div>
              )}
              <div className="text-sm font-sans mt-2 text-muted-foreground">
                Note: {value?.assets?.[selectedImages]?.note || '-'}
              </div>
            </div>

            {/* Next Image */}
            {/* <div className={"flex-1 flex flex-col items-center"}>
              {selectedImages < value?.assets?.length - 1 ? (
                <div className={"flex flex-col items-center"}>
                  <img
                    src={value?.assets?.[selectedImages + 1]?.src}
                    alt="Next"
                    className={cn(
                      "object-cover rounded-xl opacity-70 hover:opacity-100 transition-opacity cursor-pointer",
                      "h-[200px] w-full"
                    )}
                    onClick={() => setSelectedImages(selectedImages + 1)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{value?.assets?.[selectedImages+1]?.note || '-'}</div>
                </div>
              ) : (
                <div className="h-[200px] w-[200px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30">
                  <span className="text-muted-foreground">No next image</span>
                </div>
              )}
            </div> */}
          </div>
        </div>
      }

      <div ref={scrollRef} className="w-full max-w-[500px] mx-auto touch-action-none">
        <Carousel className="w-full">
          <CarouselContent className="flex items-center">
            {value?.assets?.map((image: Record<string, any>, index: number) => (
              <CarouselItem key={index} className="basis-[80px] flex-grow-0 flex-shrink-0" style={{width: "80px"}}>
                <div
                  className={`relative flex flex-col items-center p-1 ${selectedImages === index ? "border-primary border-2 rounded-lg" : ""}`}
                  onClick={() => setSelectedImages(index)}>
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-card rounded-full flex items-center justify-center text-xs shadow-sm z-10">
                      {index + 1}
                    </div>
                    <img 
                      src={image?.src} 
                      alt="" 
                      className="object-cover rounded-md w-[60px] h-[60px]"
                    />
                  </div>
                  <div className="text-xs text-center mt-1 truncate w-full px-1">
                    {image?.note || `${index + 1}`}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  )
}
export default ImageCarousel
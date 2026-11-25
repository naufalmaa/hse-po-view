import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Ship, FileText, Calendar, Building2, User, MapPin, Pencil, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  assets: any[];
  selectedAsset: any;
  setSelectedAsset: any;
  orientation: "horizontal" | "vertical";
  maxAsset?: number;
  onEditReport?: (reportId: string) => void;
}

const PAGE_SIZE = 20;

const SliderContainer = ({ assets, selectedAsset, setSelectedAsset, orientation = "horizontal", onEditReport }: Props) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil((assets?.length || 0) / PAGE_SIZE) || 1;

  // Keep page in sync if selectedAsset changes externally
  useEffect(() => {
    if (typeof selectedAsset === 'number' && selectedAsset >= 0) {
      const targetPage = Math.floor(selectedAsset / PAGE_SIZE) + 1;
      if (targetPage !== currentPage && targetPage <= totalPages) {
        setCurrentPage(targetPage);
      }
    }
  }, [selectedAsset, totalPages, currentPage]);

  // Clamp currentPage if assets length shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, assets.length);
  const displayedAssets = assets.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    // If current selectedAsset is outside the new page, select the first asset of the new page
    const newPageStartIndex = (newPage - 1) * PAGE_SIZE;
    const newPageEndIndex = Math.min(newPageStartIndex + PAGE_SIZE, assets.length);
    if (selectedAsset < newPageStartIndex || selectedAsset >= newPageEndIndex) {
      setSelectedAsset(newPageStartIndex);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setSelectedAsset((prev: number) => {
        if (e.deltaY > 0) {
          return Math.min(prev + 1, assets.length - 1);
        } else {
          return Math.max(prev - 1, 0);
        }
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [assets.length, setSelectedAsset]);

  return (
    <div ref={scrollRef} className="w-full select-none cursor-grab active:cursor-grabbing pb-1 relative px-1 flex flex-col gap-2">
      <Carousel className="w-full" orientation={orientation} opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2 md:-ml-4 py-2 px-1">
          {displayedAssets.map((asset, localIndex) => {
            const globalIndex = startIndex + localIndex;
            const isSelected = globalIndex === selectedAsset;
            const isMarine = asset?.formType === 'marine';
            const title = isMarine ? (asset?.vesselName || "-") : (asset?.subtypeName || "-");

            return (
              <CarouselItem key={globalIndex} className="pl-2 md:pl-4 basis-auto">
                <div
                  onClick={() => {
                    setSelectedAsset(globalIndex)
                  }}
                  className={cn(
                    "group flex flex-col justify-between p-3.5 md:p-4 rounded-xl border transition-all duration-300 min-w-[260px] sm:min-w-[280px] h-[135px] shadow-sm hover:shadow-md cursor-pointer",
                    isSelected
                      ? "bg-[#0078D4] border-[#0078D4] text-white ring-2 ring-[#0078D4]/30 ring-offset-2 ring-offset-background transform scale-[1.02]"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-[#0078D4]/40 dark:hover:border-[#0078D4]/40"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-lg shadow-sm transition-colors",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-blue-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 text-[#0078D4] dark:text-[#37a2fc] group-hover:bg-[#0078D4]/10"
                      )}>
                        {isMarine ? <Ship size={16} strokeWidth={2.5} /> : <FileText size={16} strokeWidth={2.5} />}
                      </div>
                      <span className={cn(
                        "text-[10px] sm:text-[11px] font-bold uppercase tracking-widest",
                        isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                      )}>
                        {isMarine ? 'Marine' : 'Project'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {asset?.id && onEditReport && (
                        <button
                          type="button"
                          title="Sunting Laporan"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditReport(asset.id);
                          }}
                          className={cn(
                            "p-1 rounded-md transition-colors",
                            isSelected
                              ? "hover:bg-white/20 text-white/90"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          )}
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {isSelected && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className={cn(
                        "font-semibold text-sm sm:text-[15px] leading-tight truncate",
                        isSelected ? "text-white" : "text-slate-800 dark:text-slate-100 font-bold"
                      )} title={title}>
                        {title}
                      </div>
                      {asset?.workLocationName && (
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5",
                          isSelected 
                            ? "bg-white/20 text-white border border-white/30" 
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                        )}>
                          <MapPin size={10} />
                          {asset.workLocationName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className={cn(
                        "flex items-center gap-1.5 text-[9px] sm:text-[10px] font-medium min-w-0 flex-1",
                        isSelected ? "text-blue-100/90" : "text-slate-500 dark:text-slate-400"
                      )} title={asset?.instansi || "-"}>
                        <Building2 size={12} className={isSelected ? "text-blue-200" : "text-slate-400"} />
                        <span className="truncate">{asset?.instansi || "-"}</span>
                      </div>

                      <div className={cn(
                        "flex items-center gap-1.5 text-[9px] sm:text-[10px] font-medium min-w-0 flex-1",
                        isSelected ? "text-blue-100/90" : "text-slate-500 dark:text-slate-400"
                      )} title={asset?.reportedBy || "-"}>
                        <User size={12} className={isSelected ? "text-blue-200" : "text-slate-400"} />
                        <span className="truncate">{asset?.reportedBy || "-"}</span>
                      </div>
                    </div>

                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] sm:text-xs font-medium mt-1",
                      isSelected ? "text-blue-50" : "text-slate-600 dark:text-slate-300"
                    )}>
                      <Calendar size={13} className={isSelected ? "text-blue-200" : "text-[#0078D4] dark:text-[#37a2fc]"} />
                      {asset?.reportDate || "No Date"}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {displayedAssets.length > 1 && (
          <>
            <CarouselPrevious className="hidden sm:flex -left-2 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-md border-slate-200 text-slate-700 z-10 size-8" />
            <CarouselNext className="hidden sm:flex -right-2 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-md border-slate-200 text-slate-700 z-10 size-8" />
          </>
        )}
      </Carousel>

      {/* Pagination Controls when total items > PAGE_SIZE */}
      {assets.length > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 pb-0.5 px-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <div className="font-medium">
            Menampilkan <span className="font-bold text-slate-700 dark:text-slate-200">{startIndex + 1} - {endIndex}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{assets.length}</span> laporan
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .reduce((acc: any[], page, idx, arr) => {
                  if (idx > 0 && page - arr[idx - 1] > 1) {
                    acc.push('ellipsis-' + page);
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map(item => {
                  if (typeof item === 'string') {
                    return <span key={item} className="px-1 text-slate-400">...</span>;
                  }
                  const isCurrent = item === currentPage;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      className={cn(
                        "h-7 min-w-[28px] px-1.5 rounded-md font-medium text-xs transition-colors",
                        isCurrent
                          ? "bg-[#0078D4] text-white font-bold shadow-xs"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {item}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Halaman Selanjutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default SliderContainer;
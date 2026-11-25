import React, { useState, useMemo } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { string_date_formatted } from "@/lib/my-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AssetListView from "@/components/pages/daily-report/create/components/AssetListView";
import {
  LuFileText,
  LuShield,
  LuFlame,
  LuActivity,
  LuExternalLink,
  LuSearch,
  LuChevronLeft,
  LuChevronRight
} from "react-icons/lu";

type Props = {
  data: any[];
  loading?: boolean;
};

const ListGuideline = ({ data, loading }: Props) => {
  const { t } = useAppTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [viewAssetModal, setViewAssetModal] = useState<{ open: boolean; data: any[]; title: string }>({
    open: false,
    data: [],
    title: "",
  });

  // Filtered and sorted data based on search and date created descending
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    // Sort from newest to oldest
    const sorted = [...data].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return sorted.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }, [data, searchQuery]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Categorize guide dynamic tags
  const getGuideMeta = (item: any) => {
    const title = (item.title || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const fullText = title + " " + desc;

    let badge = "Panduan";
    let badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    let IconComponent = LuFileText;

    if (fullText.includes("wajib") || fullText.includes("harus") || fullText.includes("apd") || fullText.includes("k3")) {
      badge = "Wajib";
      badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
      IconComponent = LuFileText;
    } else if (fullText.includes("urgent") || fullText.includes("darurat") || fullText.includes("kebakaran") || fullText.includes("kontinjensi")) {
      badge = "Urgent";
      badgeClass = "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
      IconComponent = LuFlame;
    } else if (fullText.includes("keamanan") || fullText.includes("security") || fullText.includes("protokol") || fullText.includes("akses")) {
      badge = "Prosedur";
      badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
      IconComponent = LuShield;
    } else if (fullText.includes("training") || fullText.includes("pelatihan") || fullText.includes("first aid") || fullText.includes("p3k") || fullText.includes("trauma")) {
      badge = "Training";
      badgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300";
      IconComponent = LuActivity;
    }

    // Get file extension from first file if available
    let ext = "PDF";
    if (item.files && item.files.length > 0) {
      const name = item.files[0].fileName || "";
      const detectedExt = name.split(".").pop()?.toUpperCase();
      if (detectedExt && ["PDF", "DOCX", "DOC", "PPTX", "PPT", "XLSX", "XLS"].includes(detectedExt)) {
        ext = detectedExt;
      }
    }

    return { badge, badgeClass, IconComponent, ext };
  };

  const handleOpenGuideline = (item: any) => {
    const files = item.files || [];
    if (files.length === 0) return;
    if (files.length === 1) {
      window.open(files[0].url, "_blank");
    } else {
      setViewAssetModal({
        open: true,
        data: files,
        title: item.title || "Pedoman",
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card rounded-xl p-4 border border-border">
        <div className="relative w-full sm:max-w-md">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t($ => $.guidelines.loading) ? "Mencari..." : "Cari pedoman..."}
            className="pl-9 bg-background border-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List Container */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">Tidak ada pedoman yang ditemukan.</p>
          </div>
        ) : (
          paginatedData.map((item) => {
            const { badge, badgeClass, IconComponent, ext } = getGuideMeta(item);
            const dateStr = item.createdAt
              ? string_date_formatted({ localeId: "id", dateString: item.createdAt, format: "dd MMMM yyyy" })
              : "-";
            const filesCount = item.files?.length || 0;

            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center hover:bg-accent/30 transition-all duration-200 group"
              >
                {/* File Icon Block */}
                <div className="flex-shrink-0 w-20 h-24 bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent">
                  <IconComponent className="text-[40px] w-10 h-10" />
                  <span className="text-[10px] font-bold uppercase mt-1">{ext}</span>
                </div>

                {/* Information Block */}
                <div className="mt-4 md:mt-0 md:ml-6 flex-grow">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badgeClass}`}>
                      {badge}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Action Block */}
                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-start md:items-end min-w-[200px] w-full md:w-auto">
                  <div className="text-left md:text-right mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tanggal Dibuat</p>
                    <p className="text-sm font-bold text-foreground">{dateStr}</p>
                  </div>
                  <Button
                    onClick={() => handleOpenGuideline(item)}
                    disabled={filesCount === 0}
                    className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all duration-200 border border-primary/10 flex items-center justify-center gap-2"
                  >
                    <span>{filesCount > 1 ? `Lihat ${filesCount} File` : "Detail Panduan"}</span>
                    <LuExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-card border border-border p-4 rounded-xl gap-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-bold text-foreground">{paginatedData.length}</span> dari{" "}
            <span className="font-bold text-foreground">{filteredData.length}</span> pedoman
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <LuChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
                className="w-10 h-10 font-bold"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <LuChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Multi-asset view dialog */}
      <Dialog open={viewAssetModal.open} onOpenChange={(open) => setViewAssetModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {viewAssetModal.title} - File Pedoman ({viewAssetModal.data.length})
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <AssetListView
              data={viewAssetModal.data}
              disableAction={true}
              showSelection={false}
              className="max-w-[460px] mx-auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListGuideline;

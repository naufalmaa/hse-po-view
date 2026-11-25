import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Calendar, FileText, Layers, Ship, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    basis?: string;
    date_start?: string;
    date_end?: string;
    formTypes?: string[];
    subtype?: string | string[];
    vesselId?: string[];
  };
  filterSummary: {
    periodText: string;
    formTypesText: string;
    subtypeText: string;
    vesselText: string;
  };
  onConfirmExport: () => void;
  isExporting: boolean;
  progress: number;
}

export const ExportPdfModal = ({
  open,
  onOpenChange,
  filterSummary,
  onConfirmExport,
  isExporting,
  progress,
}: ExportPdfModalProps) => {

  return (
    <>
      {/* Modal Konfirmasi Ekspor */}
      <Dialog open={open && !isExporting} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Download className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold">Ekspor HSE Performance ke PDF</DialogTitle>
            </div>
            <DialogDescription>
              Dokumen PDF akan dihasilkan dalam layout standar A4 Landscape resmi PHE OSES dengan seluruh kartu metrik, piramida lagging, dan ringkasan observasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parameter Laporan Yang Akan Diekspor:
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  <span>Periode:</span>
                </span>
                <span className="font-semibold text-foreground">{filterSummary.periodText}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Tipe Form:</span>
                </span>
                <span className="font-semibold text-foreground">{filterSummary.formTypesText}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-purple-500" />
                  <span>Subtype (Proyek):</span>
                </span>
                <span className="font-semibold text-foreground">{filterSummary.subtypeText}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Ship className="h-3.5 w-3.5 text-blue-500" />
                  <span>Vessel (Kapal):</span>
                </span>
                <span className="font-semibold text-foreground">{filterSummary.vesselText}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>Format PDF landscape yang di-generate server menjamin seluruh komponen tercetak proporsional tanpa terpotong.</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={onConfirmExport}
              disabled={isExporting}
              className="gap-1.5 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Generate & Unduh PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Bar Floating Overlay (Mirip Daily Activity Report) */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-background border border-border/80 rounded-2xl shadow-2xl w-96 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Menyiapkan Dokumen PDF
                </h3>
                <p className="text-xs text-muted-foreground">
                  Merender dashboard metrik HSE ke PDF...
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                <span>Rendering visual report</span>
                <span className="font-mono font-semibold">{progress}%</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center italic">
              Mohon tunggu beberapa detik sementara server memproses file PDF Anda.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

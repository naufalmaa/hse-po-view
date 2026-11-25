import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/custom/components";
import { useWorkLocations } from "@/service/work-location-api";
import { useReportDuplicate } from "@/service/report";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useNavigate } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { addDays, format, parseISO, isValid } from "date-fns";
import { Copy, Loader2, MapPin, Calendar, Building, User, Layers, Info } from "lucide-react";

interface DuplicateReportModalProps {
  open: boolean;
  onClose: () => void;
  sourceReport: any;
  subTypes?: Array<{ value: string; label: string }> | null;
}

export const DuplicateReportModal: React.FC<DuplicateReportModalProps> = ({
  open,
  onClose,
  sourceReport,
  subTypes = [],
}) => {
  const navigate = useNavigate();
  const duplicateMutation = useReportDuplicate();

  // Compute default target date: H+1 from source report date or tomorrow
  const getInitialTargetDate = () => {
    if (sourceReport?.reportDate) {
      try {
        const parsed = parseISO(sourceReport.reportDate);
        if (isValid(parsed)) {
          return addDays(parsed, 1);
        }
      } catch (e) {
        // fallback
      }
    }
    return addDays(new Date(), 1);
  };

  const [targetDate, setTargetDate] = useState<Date | undefined>(getInitialTargetDate);
  const [reportedBy, setReportedBy] = useState<string>(sourceReport?.reportedBy || "");
  const [instansi, setInstansi] = useState<string>(sourceReport?.instansi || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    sourceReport?.subtypeId || sourceReport?.subtype || ""
  );
  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState<string>(
    sourceReport?.workLocationId || ""
  );

  // Sync state whenever sourceReport changes
  useEffect(() => {
    if (sourceReport) {
      setTargetDate(getInitialTargetDate());
      setReportedBy(sourceReport.reportedBy || "");
      setInstansi(sourceReport.instansi || "");
      setSelectedProjectId(sourceReport.subtypeId || sourceReport.subtype || "");
      setSelectedWorkLocationId(sourceReport.workLocationId || "");
    }
  }, [sourceReport]);

  // Query work locations for currently selected project
  const { data: workLocations = [], isLoading: isLoadingLocations } = useWorkLocations(
    selectedProjectId || null,
    { enabled: !!selectedProjectId }
  );

  // If project changes and previously selected location doesn't belong to it, reset
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedWorkLocationId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetDate || !isValid(targetDate)) {
      showNotifError({ message: "Silakan pilih tanggal laporan yang valid" });
      return;
    }

    if (!reportedBy.trim()) {
      showNotifError({ message: "Nama pelapor (Reported By) wajib diisi" });
      return;
    }

    if (!instansi.trim()) {
      showNotifError({ message: "Instansi wajib diisi" });
      return;
    }

    const payload = {
      sourceReportId: sourceReport.id,
      reportDate: format(targetDate, "yyyy-MM-dd"),
      reportedBy: reportedBy.trim(),
      instansi: instansi.trim(),
      subtype: selectedProjectId || undefined,
      workLocationId: selectedWorkLocationId ? selectedWorkLocationId : null,
    };

    duplicateMutation.mutate(
      { body: payload },
      {
        onSuccess: (res: any) => {
          showNotifSuccess({ message: res?.message || "Laporan berhasil diduplikasi" });
          onClose();
          const newReportId = res?.data?.reportId || res?.reportId;
          if (newReportId) {
            navigate({
              to: AppRoute.report.dailyReport.edit.url,
              search: { project_id: newReportId, step: 1 },
            });
          }
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Gagal menduplikasi laporan. Periksa apakah laporan dengan tanggal dan lokasi ini sudah ada.";
          showNotifError({ message: msg });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-[#0a1e38] via-primary to-[#0d284f] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                Duplikat Laporan Harian
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-xs mt-1">
                Kloning seluruh metrics, aktivitas harian, serta lampiran foto ke laporan baru
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          {/* Notice Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Tanggal laporan secara otomatis disetel ke <strong>H+1</strong> dari laporan sumber.
              Setelah diduplikasi, Anda akan diarahkan langsung ke halaman edit laporan baru.
            </span>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Target Date */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Tanggal Laporan Baru <span className="text-red-500">*</span>
              </Label>
              <div className="w-full">
                <DatePicker
                  value={targetDate}
                  onChange={(d) => setTargetDate(d)}
                  className="w-full h-10 text-sm bg-slate-50/70 border-slate-200 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default: H+1 dari tanggal laporan awal ({sourceReport?.reportDate || "-"})
              </p>
            </div>

            {/* 2. Reported By */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Reported By <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Nama Pelapor"
                required
                className="h-10 text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:border-primary"
              />
            </div>

            {/* 3. Instansi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary" />
                Instansi <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={instansi}
                onChange={(e) => setInstansi(e.target.value)}
                placeholder="Instansi / Kontraktor"
                required
                className="h-10 text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:border-primary"
              />
            </div>

            {/* 4. Project Name (Subtype) */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Nama Project
              </Label>
              <Select
                value={selectedProjectId}
                onValueChange={handleProjectChange}
                disabled={!subTypes || subTypes.length === 0}
              >
                <SelectTrigger className="w-full h-10 text-sm bg-slate-50/70 border-slate-200 rounded-xl">
                  <SelectValue placeholder="-- Pilih Project --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {subTypes?.map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      {sub.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Work Location */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Work Location
              </Label>
              <Select
                value={selectedWorkLocationId || "ALL_LOCATION"}
                onValueChange={(val) =>
                  setSelectedWorkLocationId(val === "ALL_LOCATION" ? "" : val)
                }
                disabled={isLoadingLocations}
              >
                <SelectTrigger className="w-full h-10 text-sm bg-slate-50/70 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Semua Lokasi / General" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL_LOCATION">
                    <span className="text-slate-500 italic">Semua Lokasi (General / Tidak Spesifik)</span>
                  </SelectItem>
                  {workLocations.map((wl) => (
                    <SelectItem key={wl.id} value={wl.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{wl.name}</span>
                        {wl.latitude !== null && wl.longitude !== null && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({Number(wl.latitude).toFixed(3)}, {Number(wl.longitude).toFixed(3)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                Pilih lokasi spesifik atau biarkan "Semua Lokasi" jika mencakup keseluruhan area proyek.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={duplicateMutation.isPending}
              className="rounded-xl px-4"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={duplicateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 font-semibold flex items-center gap-2 shadow-sm transition-all duration-200"
            >
              {duplicateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menduplikasi...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Duplikasi Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateReportModal;

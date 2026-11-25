import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormDatePicker, FormSelect, FormMultiSelect } from "@/components/custom/forms";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { REPORT_TYPE } from "@/constants/app-enum";
import { date_to_string } from "@/lib/my-utils";
import { APP_CONFIG } from "@/constants/config";
import { Download, Loader2, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues: {
    date_start?: Date | null;
    date_end?: Date | null;
    formTypes?: string;
    subtypes?: string[];
    vesselId?: string[];
  };
  subtypesList: any[];
  vesselList: any[];
  availableReports: any[];
  onConfirmExport: (params: {
    date_start: string;
    date_end: string;
    formTypes: string[];
    subtypes: string[];
    vesselId: string[];
    reportIds?: string[];
    showInspectionTables?: boolean;
  }) => void;
  isExporting?: boolean;
  progress?: number;
}

export const ExportPdfModal = ({
  open,
  onOpenChange,
  defaultValues,
  subtypesList = [],
  vesselList = [],
  availableReports = [],
  onConfirmExport,
  isExporting = false,
  progress = 0,
}: ExportPdfModalProps) => {

  const form = useForm({
    defaultValues: {
      date_start: defaultValues?.date_start || new Date(),
      date_end: defaultValues?.date_end || new Date(),
      formTypes: defaultValues?.formTypes || REPORT_TYPE.project.value,
      subtypes: defaultValues?.subtypes || [],
      vesselId: defaultValues?.vesselId || [],
    }
  });

  // Track selected report IDs for export
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  // Option: show/hide inspection & pre-use inspection tables (default: false / hide)
  const [showInspectionTables, setShowInspectionTables] = useState<boolean>(false);

  // Track previous open state so we ONLY initialize when opening from closed
  const prevOpenRef = React.useRef(false);

  // When modal opens, sync form values with current filters ONLY on first open transition
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      form.reset({
        date_start: defaultValues?.date_start || new Date(),
        date_end: defaultValues?.date_end || new Date(),
        formTypes: defaultValues?.formTypes || REPORT_TYPE.project.value,
        subtypes: defaultValues?.subtypes || [],
        vesselId: defaultValues?.vesselId || [],
      });
      // Default: select all currently available reports
      setSelectedReportIds(availableReports.map((r: any) => r.id).filter(Boolean));
      setShowInspectionTables(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const formTypes_ = form.watch("formTypes");
  const watchDateStart = form.watch("date_start");
  const watchDateEnd = form.watch("date_end");
  const watchSubtypes = form.watch("subtypes");
  const watchVesselId = form.watch("vesselId");

  // Filter available reports based on modal form selections
  const filteredReports = availableReports.filter((rep: any) => {
    // Form Type check
    if (formTypes_ && rep.formType !== formTypes_) {
      return false;
    }
    // Subtype check
    if (formTypes_ === REPORT_TYPE.project.value && watchSubtypes && watchSubtypes.length > 0) {
      if (!watchSubtypes.includes(rep.subtype)) {
        return false;
      }
    }
    // Vessel check
    if (formTypes_ === REPORT_TYPE.marine.value && watchVesselId && watchVesselId.length > 0) {
      if (!watchVesselId.includes(rep.vesselId)) {
        return false;
      }
    }
    // Date range check
    if (rep.reportDate) {
      const repDate = new Date(rep.reportDate).getTime();
      if (watchDateStart) {
        const start = new Date(watchDateStart).setHours(0, 0, 0, 0);
        if (repDate < start) return false;
      }
      if (watchDateEnd) {
        const end = new Date(watchDateEnd).setHours(23, 59, 59, 999);
        if (repDate > end) return false;
      }
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r: any) => r.id));
    }
  };

  const toggleReport = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const values = form.getValues();
    const date_start_str = values.date_start ? date_to_string(values.date_start, APP_CONFIG.dayFormat) : '';
    const date_end_str = values.date_end ? date_to_string(values.date_end, APP_CONFIG.dayFormat) : '';
    const formTypes_arr = values.formTypes ? [values.formTypes] : [];
    const subtypes_arr = values.subtypes || [];
    const vesselId_arr = values.vesselId || [];

    onConfirmExport({
      date_start: date_start_str,
      date_end: date_end_str,
      formTypes: formTypes_arr,
      subtypes: subtypes_arr,
      vesselId: vesselId_arr,
      reportIds: selectedReportIds.length > 0 ? selectedReportIds : undefined,
      showInspectionTables,
    });
  };

  const formList = {
    date_start: { name: "date_start", label: "From Date" },
    date_end: { name: "date_end", label: "To Date" },
    formTypes: { name: "formTypes", label: "Form Type", options: Object.values(REPORT_TYPE) },
    subtypes: { name: "subtypes", label: "Sub Type", options: subtypesList },
    vesselId: { name: "vesselId", label: "Vessel", options: vesselList },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Download className="w-5 h-5 text-[#0078D4]" />
            <DialogTitle className="text-lg font-bold">Konfirmasi Ekspor PDF Daily Report</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Sesuaikan kriteria filter laporan di bawah ini dan konfirmasi laporan yang akan dimasukkan ke dalam dokumen PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Filter Parameters */}
          <Form {...form}>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kriteria Filter Laporan</span>
              
              <div className="grid grid-cols-2 gap-3">
                <FormDatePicker form={form} item={formList.date_start} />
                <FormDatePicker form={form} item={formList.date_end} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormSelect form={form} item={formList.formTypes} />
                {formTypes_ === REPORT_TYPE.project.value ? (
                  <FormMultiSelect form={form} item={formList.subtypes} />
                ) : (
                  <FormMultiSelect form={form} item={formList.vesselId} />
                )}
              </div>
            </div>
          </Form>

          {/* Report Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Daftar Laporan yang Akan Diekspor</span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {selectedReportIds.length} dari {filteredReports.length} Dipilih
                </Badge>
              </div>
              {filteredReports.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-7 text-xs text-[#0078D4] hover:bg-blue-50"
                >
                  {selectedReportIds.length === filteredReports.length ? "Hapus Pilihan" : "Pilih Semua"}
                </Button>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
              {filteredReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  Tidak ada laporan yang sesuai dengan kriteria filter di atas.
                </div>
              ) : (
                filteredReports.map((rep: any) => {
                  const isChecked = selectedReportIds.includes(rep.id);
                  const isMarine = rep.formType === 'marine';
                  const title = isMarine ? (rep.vesselName || '-') : (rep.subtypeName || '-');

                  return (
                    <div
                      key={rep.id}
                      onClick={() => toggleReport(rep.id)}
                      className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-[#0078D4]">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-800">{title}</p>
                            {rep.workLocationName && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {rep.workLocationName}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {rep.reportDate} • Dilaporkan oleh: {rep.reportedBy || '-'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold">
                        {rep.formType}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Option: Show/Hide Inspection Tables (Default: Hide) */}
          <div 
            onClick={() => setShowInspectionTables(!showInspectionTables)}
            className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer transition-colors flex items-start gap-3 select-none"
          >
            <div className="mt-0.5 text-[#0078D4] shrink-0">
              {showInspectionTables ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800">Sertakan Tabel Pre-Use & Field Inspection</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Secara default disembunyikan. Seluruh temuan berstatus Open Findings tetap otomatis dirangkum di Table HSSE Issues.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Batal
          </Button>

          <Button
            onClick={handleExport}
            disabled={isExporting || (filteredReports.length > 0 && selectedReportIds.length === 0)}
            className="bg-[#0078D4] hover:bg-[#0060aa] text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengekspor... {progress > 0 ? `${progress}%` : ''}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Ekspor PDF ({selectedReportIds.length} Laporan)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ExportPdfModal;

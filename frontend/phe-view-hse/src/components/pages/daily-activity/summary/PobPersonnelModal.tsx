import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Users,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  Briefcase,
  Calendar,
  X,
  UserCheck
} from "lucide-react";
import { useReportDutyList } from "@/service/report";
import { useNavigate } from "@tanstack/react-router";
import { string_date_formatted } from "@/lib/my-utils";

interface PobPersonnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: string;
  reportDate?: string;
  workLocationName?: string;
  pobType: 'phe' | 'contr';
  totalCount?: number;
}

export const PobPersonnelModal: React.FC<PobPersonnelModalProps> = ({
  open,
  onOpenChange,
  reportId,
  reportDate,
  workLocationName,
  pobType,
  totalCount = 0,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0); // Reset page on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page and search when modal opens or pobType changes
  useEffect(() => {
    if (open) {
      setPage(0);
      setSearch('');
      setDebouncedSearch('');
    }
  }, [open, pobType]);

  const { data: response, isLoading, isFetching } = useReportDutyList({
    reportId: reportId || '',
    pobType: pobType,
    search: debouncedSearch || undefined,
    page,
    limit,
    options: {
      enabled: open && !!reportId,
    },
  });

  const resData = response as any;
  const rawData = resData?.data;
  const employees: any[] = Array.isArray(rawData) ? rawData : (Array.isArray(response) ? response : []);
  const meta = resData?.meta || {
    page: page,
    limit: limit,
    total: employees.length,
    totalPages: Math.ceil(employees.length / limit) || 1,
  };

  const totalEmployees = meta.total ?? totalCount ?? employees.length;
  const totalPages = Math.max(1, meta.totalPages ?? Math.ceil(totalEmployees / limit));
  const currentPage = meta.page ?? page;

  const isPhe = pobType === 'phe';
  const typeTitle = isPhe ? 'POB PHE OSES' : 'POB Contractor';
  const typeBadgeClass = isPhe
    ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
    : 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800';

  const handleOpenDetail = (employeeId: string) => {
    if (!employeeId) return;
    // Open in current app router or new window
    window.open(`/employee/detail?id=${employeeId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl w-[94vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col gap-1 sm:text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isPhe ? 'bg-blue-600 text-white' : 'bg-cyan-600 text-white'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Daftar Pekerja On Duty ({typeTitle})
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${typeBadgeClass}`}>
                    {totalEmployees} Pekerja
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {reportDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Tanggal: <strong className="text-slate-700 dark:text-slate-200">{reportDate}</strong>
                    </span>
                  )}
                  {workLocationName && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Lokasi: <strong className="text-slate-700 dark:text-slate-200">{workLocationName}</strong>
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, jabatan, atau perusahaan..."
              className="pl-9 pr-8 text-sm h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto text-right">
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">
              {totalEmployees > 0 ? (currentPage * limit) + 1 : 0}
            </strong> - <strong className="text-slate-800 dark:text-slate-200">
              {Math.min((currentPage + 1) * limit, totalEmployees)}
            </strong> dari <strong className="text-slate-800 dark:text-slate-200">{totalEmployees}</strong> pekerja
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[55vh] relative min-h-[220px] pr-1.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Memuat data pekerja on duty...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Users className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {debouncedSearch ? 'Tidak ada pekerja yang sesuai dengan pencarian' : 'Tidak ada pekerja tercatat on duty'}
              </p>
              {debouncedSearch && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="text-xs text-blue-600">
                  Reset Pencarian
                </Button>
              )}
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader className="bg-slate-50/95 dark:bg-slate-800/95 sticky top-0 z-10 shadow-xs">
                <TableRow className="border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="w-[5%] text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3">No</TableHead>
                  <TableHead className="w-[28%] text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3">Nama Pekerja</TableHead>
                  <TableHead className="w-[25%] text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3">Perusahaan</TableHead>
                  <TableHead className="w-[18%] text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3">Jabatan</TableHead>
                  <TableHead className="w-[11%] text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3">Tgl Lahir</TableHead>
                  <TableHead className="w-[13%] text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase py-3 pr-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp, idx) => {
                  const rowNum = (currentPage * limit) + idx + 1;
                  const birthDateFormatted = emp.dateOfBirth
                    ? (string_date_formatted({ localeId: 'id', dateString: emp.dateOfBirth, format: 'dd-MM-yyyy' }) || emp.dateOfBirth)
                    : '-';
                  const displayCompany = emp.companyName || emp.company || emp.subContractorName || (emp.category === 'mitra' ? 'PHE OSES' : '-');

                  return (
                    <TableRow
                      key={emp.id || idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <TableCell className="w-[5%] text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-3">
                        {rowNum}
                      </TableCell>
                      <TableCell className="w-[28%] py-3">
                        <div className="flex flex-col min-w-0 pr-2">
                          <a
                            href={`/employee/detail?id=${emp.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 font-semibold text-sm text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit max-w-full"
                            title={`Buka detail ${emp.name || ''}`}
                          >
                            <span className="truncate">{emp.name || '-'}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                          </a>
                          {emp.hssePassportNumber && (
                            <span className="text-[11px] text-slate-400 truncate">
                              Passport: {emp.hssePassportNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-[25%] py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 min-w-0 pr-2" title={displayCompany}>
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{displayCompany}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[18%] py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 min-w-0 pr-2" title={emp.position || '-'}>
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{emp.position || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[11%] py-3 text-center text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {birthDateFormatted}
                      </TableCell>
                      <TableCell className="w-[13%] py-3 text-center pr-3">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center justify-center gap-1 px-2.5 py-0.5 mx-auto w-fit whitespace-nowrap shadow-2xs">
                          <UserCheck className="w-3 h-3" />
                          On Duty
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Halaman <strong className="text-slate-700 dark:text-slate-200">{currentPage + 1}</strong> dari <strong className="text-slate-700 dark:text-slate-200">{totalPages}</strong>
            {isFetching && !isLoading && (
              <span className="ml-2 text-blue-600 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Memperbarui...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 0 || isLoading}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="h-8 px-3 text-xs flex items-center gap-1 border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1 || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
              className="h-8 px-3 text-xs flex items-center gap-1 border-slate-200 dark:border-slate-700"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

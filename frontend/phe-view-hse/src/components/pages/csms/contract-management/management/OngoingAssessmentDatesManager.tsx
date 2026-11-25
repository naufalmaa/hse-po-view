import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash, Plus, Calendar, Loader2, Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  useGenerateAssessmentFolder,
  useDeleteFolder,
  useUpdateAssessmentDates,
} from '@/service/csms/contract-management-api';
import { useContractFolders } from '@/service/csms/folder-detail';
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppTranslation } from "@/lib/i18n-typed";
import { date_to_string } from "@/lib/my-utils";
import { cn } from '@/lib/utils';
import {
  AssessmentDateItem,
  getAllAssessmentDates,
  getAssessmentPeriodLabel,
} from '@/lib/lib-contract';

export interface OngoingAssessmentDate {
  id?: string;
  date: string;
  folderId?: string;
  type?: 'PSB' | 'PB' | 'PA';
  label?: string;
  canDelete?: boolean;
}

interface OngoingAssessmentDatesManagerProps {
  contractId: string;
  initialDates: (OngoingAssessmentDate | AssessmentDateItem)[];
  onDatesUpdated: () => void;
  onReloadContracts?: () => void;
}

export const OngoingAssessmentDatesManager: React.FC<OngoingAssessmentDatesManagerProps> = ({
  contractId,
  initialDates,
  onDatesUpdated,
  onReloadContracts
}) => {
  const { t } = useAppTranslation();

  const normalizeDateItem = (item: any): AssessmentDateItem => {
    const type: 'PSB' | 'PB' | 'PA' = item.type || 'PB';
    const label = item.label || getAssessmentPeriodLabel(type, item.date);
    return {
      date: item.date,
      folderId: item.folderId,
      folderName: item.folderName,
      type,
      label,
      canDelete: item.canDelete !== undefined ? item.canDelete : (type === 'PB'),
      score: item.score,
    };
  };

  const [dates, setDates] = useState<AssessmentDateItem[]>(() =>
    (initialDates || []).map(normalizeDateItem)
  );
  const [newDate, setNewDate] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ index: number; date: string } | null>(null);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);

  // Inline edit states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // Edit waiting for the user's confirmation in the dialog
  const [pendingEdit, setPendingEdit] = useState<{ index: number; newDateIso: string } | null>(null);

  const { mutate: generateAssessmentFolder, isPending: isGenerating } = useGenerateAssessmentFolder();
  const { mutate: deleteFolder } = useDeleteFolder();
  const { mutate: updateAssessmentDates, isPending: isUpdating } = useUpdateAssessmentDates();
  const { mutate: loadContractFolders, isPending: isLoadingFolders } = useContractFolders();

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const ddmmyyyyMatch = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (ddmmyyyyMatch) {
      return `${ddmmyyyyMatch[1]}/${ddmmyyyyMatch[2]}/${ddmmyyyyMatch[3]}`;
    }
    const yyyymmddMatch = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (yyyymmddMatch) {
      return `${yyyymmddMatch[3]}/${yyyymmddMatch[2]}/${yyyymmddMatch[1]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return date_to_string(d, "dd/MM/yyyy");
  };

  const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const ddmmyyyy = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return dateStr;
  };

  const fetchLatestFolders = () => {
    if (!contractId) return;
    loadContractFolders(contractId, {
      onSuccess: (details) => {
        if (details?.data && details.data.length > 0) {
          const allDates = getAllAssessmentDates(details.data);
          setDates(allDates);
        }
      }
    });
  };

  // Sync initialDates when updated from parent
  useEffect(() => {
    if (initialDates && initialDates.length > 0) {
      setDates(initialDates.map(normalizeDateItem));
    }
  }, [initialDates]);

  // Also query contract folders to ensure full accuracy of folders
  useEffect(() => {
    fetchLatestFolders();
  }, [contractId]);

  // Add a new ongoing PB assessment date
  const handleAddDate = () => {
    if (!newDate) {
      showNotifError({ message: t($ => $.contractManagement.form.startDate.required) });
      return;
    }

    const inputDateFormatted = toInputDate(newDate);

    // Check if date already exists
    if (dates.some(d => toInputDate(d.date) === inputDateFormatted)) {
      showNotifError({ message: "Tanggal penilaian ini sudah ada di daftar." });
      return;
    }

    // Call API to generate assessment folder
    generateAssessmentFolder(
      {
        contractId,
        assessmentType: 'ongoing',
        assessmentDate: inputDateFormatted
      },
      {
        onSuccess: () => {
          setNewDate('');
          fetchLatestFolders();
          onDatesUpdated();
          if (onReloadContracts) {
            onReloadContracts();
          }
          showNotifSuccess({ message: t($ => $.contractManagement.createSuccess) });
        },
        onError: (error: any) => {
          showNotifError({ message: error?.response?.data?.message ?? error?.message });
        }
      }
    );
  };

  // Start inline editing
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingDateValue(toInputDate(dates[index].date));
  };

  // Cancel inline editing
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingDateValue('');
  };

  // Save inline editing
  const handleSaveEdit = () => {
    if (editingIndex === null || !dates[editingIndex]) return;

    const currentItem = dates[editingIndex];
    const newDateIso = toInputDate(editingDateValue);

    if (!newDateIso) {
      showNotifError({ message: "Tanggal tidak boleh kosong." });
      return;
    }

    // If unchanged
    if (toInputDate(currentItem.date) === newDateIso) {
      setEditingIndex(null);
      return;
    }

    // Check duplicate
    const isDuplicate = dates.some((d, idx) => idx !== editingIndex && toInputDate(d.date) === newDateIso);
    if (isDuplicate) {
      showNotifError({ message: "Tanggal penilaian ini sudah ada di daftar." });
      return;
    }

    setPendingEdit({ index: editingIndex, newDateIso });
  };

  // "DD-MM-YYYY - PB" style name for a date, as the backend names folders
  const toFolderName = (dateIso: string, type: AssessmentDateItem['type']) => {
    const [yyyy, mm, dd] = toInputDate(dateIso).split('-');
    return `${dd}-${mm}-${yyyy} - ${type}`;
  };

  // Save the edit after the user confirmed it
  const handleConfirmEdit = () => {
    if (!pendingEdit || !dates[pendingEdit.index]) return;
    const { index: editIndex, newDateIso } = pendingEdit;
    const currentItem = dates[editIndex];

    setIsSavingEdit(true);

    const updatedDates: AssessmentDateItem[] = dates.map((d, idx) => {
      if (idx !== editIndex) return d;
      return {
        ...d,
        date: newDateIso,
        label: getAssessmentPeriodLabel(d.type, newDateIso),
      };
    });

    // Sort chronologically
    updatedDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nearestOngoingAssessmentDate = updatedDates
      .filter(d => d.type === 'PB')
      .map(d => toInputDate(d.date));

    const paItem = updatedDates.find(d => d.type === 'PA');
    const finalAssessmentDate = paItem ? toInputDate(paItem.date) : undefined;

    const psbItem = updatedDates.find(d => d.type === 'PSB');
    const psbAssessmentDate = psbItem ? toInputDate(psbItem.date) : undefined;

    updateAssessmentDates(
      {
        contractId,
        nearestOngoingAssessmentDate,
        finalAssessmentDate,
        psbAssessmentDate,
        // Rename exactly the edited folder, so no other folder changes its date
        folderDates: currentItem.type === 'PB' && currentItem.folderId
          ? [{ folderId: currentItem.folderId, date: newDateIso }]
          : undefined,
      },
      {
        onSuccess: () => {
          setDates(updatedDates);
          setEditingIndex(null);
          setPendingEdit(null);
          setIsSavingEdit(false);
          showNotifSuccess({ message: t($ => $.contractManagement.updateSuccess) });
          fetchLatestFolders();
          onDatesUpdated();
          if (onReloadContracts) {
            onReloadContracts();
          }
        },
        onError: (error: any) => {
          setIsSavingEdit(false);
          setPendingEdit(null);
          showNotifError({ message: error?.response?.data?.message ?? error?.message });
        }
      }
    );
  };

  // Show delete confirmation dialog (PB items only)
  const showDeleteConfirmation = (index: number) => {
    const dateToRemove = dates[index];
    if (!dateToRemove.canDelete) return;
    setDeleteConfirmation({ index, date: dateToRemove.date });
  };

  // Handle delete confirmation
  const handleDeleteConfirmation = () => {
    if (!deleteConfirmation) return;

    const { index, date } = deleteConfirmation;
    const dateToRemove = dates[index];

    setIsDeletingProcess(true);

    loadContractFolders(
      contractId,
      {
        onSuccess: (details) => {
          const inputDate = toInputDate(date);
          const [yyyy, mm, dd] = inputDate.split('-');
          const formattedDate = `${dd}-${mm}-${yyyy}`;

          const pbFolder = details.data?.find((folder: any) =>
            (folder.id && folder.id === dateToRemove.folderId) ||
            (folder.name && folder.name.endsWith(' - PB') && folder.name.startsWith(formattedDate))
          );

          const updatedDates = dates.filter((_, i) => i !== index);
          const remainingPBDates = updatedDates.filter(d => d.type === 'PB').map(d => toInputDate(d.date));

          if (!pbFolder) {
            setDates(updatedDates);
            setDeleteConfirmation(null);
            updateAssessmentDates(
              { contractId, nearestOngoingAssessmentDate: remainingPBDates },
              {
                onSuccess: () => {
                  fetchLatestFolders();
                  onDatesUpdated();
                  if (onReloadContracts) onReloadContracts();
                  setIsDeletingProcess(false);
                  showNotifSuccess({ message: t($ => $.contractManagement.deleteSuccess) });
                },
                onError: (err: any) => {
                  setIsDeletingProcess(false);
                  showNotifError({ message: err?.response?.data?.message ?? err?.message });
                }
              }
            );
            return;
          }

          deleteFolder(
            pbFolder.id,
            {
              onSuccess: () => {
                updateAssessmentDates(
                  { contractId, nearestOngoingAssessmentDate: remainingPBDates },
                  {
                    onSuccess: () => {
                      setDates(updatedDates);
                      setDeleteConfirmation(null);
                      fetchLatestFolders();
                      onDatesUpdated();
                      if (onReloadContracts) onReloadContracts();
                      showNotifSuccess({ message: t($ => $.contractManagement.deleteSuccess) });
                      setIsDeletingProcess(false);
                    },
                    onError: (err: any) => {
                      setDeleteConfirmation(null);
                      setIsDeletingProcess(false);
                      showNotifError({ message: err?.response?.data?.message ?? err?.message });
                    }
                  }
                );
              },
              onError: (error: any) => {
                setDeleteConfirmation(null);
                showNotifError({ message: error?.response?.data?.message ?? error?.message });
                setIsDeletingProcess(false);
              }
            }
          );
        },
        onError: (error: any) => {
          setDeleteConfirmation(null);
          showNotifError({ message: error?.response?.data?.message ?? error?.message });
          setIsDeletingProcess(false);
        }
      }
    );
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {t($ => $.contractManagement.ongoingAssessmentDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-4">
        {/* Add new PB date input */}
        <div className="flex gap-2">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            placeholder={t($ => $.contractManagement.form.startDate.placeholder)}
            disabled={isGenerating || isSavingEdit}
            className="text-sm"
          />
          <Button
            onClick={handleAddDate}
            disabled={isGenerating || !newDate || isSavingEdit}
            className="flex items-center gap-1.5 shrink-0"
            size="sm"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t($ => $.contractManagement.add)}
          </Button>
        </div>

        {/* List of dates */}
        {dates.length > 0 ? (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {dates.map((item, index) => {
              const isEditingThis = editingIndex === index;

              if (isEditingThis) {
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800/60 gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold px-2 py-0.5 shrink-0",
                          item.type === 'PSB' && "bg-blue-100/70 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
                          item.type === 'PB' && "bg-amber-100/70 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
                          item.type === 'PA' && "bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        )}
                      >
                        {item.label}
                      </Badge>
                      <Input
                        type="date"
                        value={editingDateValue}
                        onChange={(e) => setEditingDateValue(e.target.value)}
                        className="h-8 text-sm flex-1 bg-white dark:bg-gray-900"
                        autoFocus
                        disabled={isSavingEdit}
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40"
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editingDateValue}
                        title="Simpan Perubahan"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 dark:hover:bg-gray-800"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                        title="Batal"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-md border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-100/60 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Small text label on the left */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 shrink-0 whitespace-nowrap",
                        item.type === 'PSB' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
                        item.type === 'PB' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
                        item.type === 'PA' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                      )}
                    >
                      {item.label}
                    </Badge>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {formatDateDisplay(item.date)}
                    </span>
                    {item.score !== undefined && (
                      <span
                        className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap",
                          item.score > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "text-gray-400 dark:text-gray-500"
                        )}
                        title="Skor folder penilaian periode ini"
                      >
                        {item.score > 0 ? `Skor ${item.score.toFixed(2)}` : 'Belum dinilai'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Edit button: available for all items */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      onClick={() => handleStartEdit(index)}
                      disabled={isDeletingProcess || isSavingEdit}
                      title="Edit Tanggal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete button: available ONLY for PB (item.canDelete) */}
                    {item.canDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => showDeleteConfirmation(index)}
                        disabled={isDeletingProcess || isSavingEdit}
                        title="Hapus Tanggal"
                      >
                        <Trash className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">
            {isLoadingFolders ? 'Memuat tanggal penilaian...' : t($ => $.contractManagement.ongoingAssessmentDate)}
          </p>
        )}

        {/* Reload / Sync Button */}
        <Button
          onClick={() => {
            fetchLatestFolders();
            if (onReloadContracts) {
              onReloadContracts();
            }
          }}
          disabled={isUpdating || isSavingEdit || isLoadingFolders}
          variant="outline"
          className="w-full text-xs h-9"
        >
          {isUpdating || isLoadingFolders ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : null}
          {t($ => $.contractManagement.updateAssessmentDate)}
        </Button>
      </CardContent>

      {/* Edit Date Confirmation Dialog */}
      <Dialog
        open={!!pendingEdit}
        onOpenChange={(open) => {
          if (!open && !isSavingEdit) setPendingEdit(null);
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ubah tanggal penilaian?</DialogTitle>
          </DialogHeader>
          {pendingEdit && dates[pendingEdit.index] && (() => {
            const item = dates[pendingEdit.index];
            const newLabel = getAssessmentPeriodLabel(item.type, pendingEdit.newDateIso);
            return (
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs">Sebelum</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {item.folderName ?? toFolderName(item.date, item.type)}
                    </span>
                    <span className="text-xs">({item.label})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs">Sesudah</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {toFolderName(pendingEdit.newDateIso, item.type)}
                    </span>
                    <span className="text-xs">({newLabel})</span>
                  </div>
                </div>
                <p>
                  Hanya folder ini yang berganti nama. Isi folder, skor, dan progres persetujuannya tetap ikut folder ini.
                  {item.score !== undefined && item.score > 0 && ` Skor saat ini ${item.score.toFixed(2)}.`}
                </p>
                {newLabel !== item.label && (
                  <p className="text-amber-700 dark:text-amber-400">
                    Periode berubah dari {item.label} ke {newLabel}.
                  </p>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingEdit(null)} disabled={isSavingEdit}>
              {t($ => $.contractManagement.cancel)}
            </Button>
            <Button onClick={handleConfirmEdit} disabled={isSavingEdit} className="flex items-center gap-2">
              {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => {
          if (!isDeletingProcess) {
            setDeleteConfirmation(null);
          }
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t($ => $.contractManagement.confirmDeletion)}</DialogTitle>
            {deleteConfirmation && (
              <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                {t($ => $.contractManagement.deleteConfirmation).replace("{TITLE}", formatDateDisplay(deleteConfirmation.date))}
              </div>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation(null)}
              disabled={isDeletingProcess}
            >
              {t($ => $.contractManagement.cancel)}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmation}
              disabled={isDeletingProcess}
              className="flex items-center gap-2"
            >
              {isDeletingProcess ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t($ => $.contractManagement.deletingContract)}
                </>
              ) : (
                t($ => $.contractManagement.delete)
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
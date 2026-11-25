import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useBulkAssessmentFolder, BulkAssessmentItemPayload } from '@/service/csms/contract-management-api';
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';
import { getScoreConfig } from '../root-folder-selector/utils';
import {
  Zap,
  Check,
  X,
  RotateCcw,
  Search,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  AlertCircle,
  AlertTriangle,
  FolderOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface QuickScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRootFolder: ContractFolder | null;
  refreshFolders: () => void;
}

const SCORE_OPTIONS = [
  { value: -1, label: 'N/A', activeClass: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-400 font-bold shadow-xs' },
  { value: 0, label: '0', activeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-400 font-bold shadow-xs' },
  { value: 3, label: '3', activeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-400 font-bold shadow-xs' },
  { value: 6, label: '6', activeClass: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border-cyan-400 font-bold shadow-xs' },
  { value: 10, label: '10', activeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 font-bold shadow-xs' },
];

const STATUS_OPTIONS = [
  { value: 'accept', label: 'Accept', activeClass: 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-200 border-green-400 font-bold shadow-xs', icon: Check },
  { value: 'revision', label: 'Revisi', activeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-400 font-bold shadow-xs', icon: RotateCcw },
  { value: 'reject', label: 'Reject', activeClass: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-400 font-bold shadow-xs', icon: X },
];

// Helper to strictly collect only the 29 scoreable leaf folders
export const getScoreableLeafFolders = (rootFolder: ContractFolder | null): ContractFolder[] => {
  if (!rootFolder) return [];
  const result: ContractFolder[] = [];

  const traverse = (node: ContractFolder) => {
    if (node.fileType === 'folder') {
      const isCat1or2 = /^([12])[\.\s]/.test(node.name) || node.name === '1 Kepemimpinan dan Komitmen' || node.name === '2 Kebijakan dan Sasaran Strategis K3LL';
      if (isCat1or2) {
        result.push(node);
        return;
      }

      // Standard K3LL subcategories 3.1 through 8.2 are the scoreable items
      const isStandardSubcategory = /^[3-8]\.\d+/.test(node.name);
      if (isStandardSubcategory) {
        result.push(node);
        return; // Do not traverse into user-created subfolders inside standard subcategories
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    }
  };

  if (rootFolder.children) {
    rootFolder.children.forEach(traverse);
  }

  // Sort logically (1 ..., 2 ..., 3.1 ..., 3.2 ..., 4.1 ..., 8.2)
  return result.sort((a, b) => {
    const numA = a.name.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0';
    const numB = b.name.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0';
    return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// Helper to extract category code (e.g., "1", "3.2", "4.4") from name
const getCategoryCode = (name: string): string => {
  const match = name.match(/^(\d+(?:\.\d+)?)/);
  return match ? match[1] : '';
};

// Helper to get group title based on element number
const getGroupTitle = (code: string): string => {
  const major = code.split('.')[0];
  switch (major) {
    case '1': return '1. Kepemimpinan dan Komitmen';
    case '2': return '2. Kebijakan dan Sasaran Strategis K3LL';
    case '3': return '3. Organisasi, Tanggung Jawab, Sumber Daya, Standar dan Dokumentasi';
    case '4': return '4. Manajemen Risiko';
    case '5': return '5. Prosedur Kerja K3LL';
    case '6': return '6. Implementasi dan Pemantauan Kinerja K3LL';
    case '7': return '7. Audit dan Tinjauan Manajemen K3LL';
    case '8': return '8. Manajemen K3LL – Pencapaian Lainnya';
    default: return 'Lainnya';
  }
};

export const QuickScoringModal: React.FC<QuickScoringModalProps> = ({
  isOpen,
  onClose,
  selectedRootFolder,
  refreshFolders
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [openGroupNotes, setOpenGroupNotes] = useState<Record<string, boolean>>({});
  const [groupNoteInputs, setGroupNoteInputs] = useState<Record<string, string>>({});

  const bulkAssessmentMutation = useBulkAssessmentFolder();

  // Extract all 29 leaf scoreable folders
  const leafFolders = useMemo(() => {
    return getScoreableLeafFolders(selectedRootFolder);
  }, [selectedRootFolder]);

  // Initialize state when modal opens with existing values
  useEffect(() => {
    if (isOpen && leafFolders.length > 0) {
      setStep(1);
      setOpenGroupNotes({});
      setGroupNoteInputs({});
      setSearchQuery('');
      setIsConfirmOpen(false);

      const initScores: Record<string, number> = {};
      const initStatuses: Record<string, string> = {};
      const initNotes: Record<string, string> = {};

      leafFolders.forEach(folder => {
        const rawScore = folder.score !== undefined && folder.score !== null ? parseFloat(String(folder.score)) : 0;
        initScores[folder.id] = isNaN(rawScore) ? 0 : rawScore;
        initStatuses[folder.id] = folder.status || 'accept';
        initNotes[folder.id] = folder.note || '';
      });

      setScores(initScores);
      setStatuses(initStatuses);
      setNotes(initNotes);
    }
  }, [isOpen, leafFolders]);

  // Filtered folders by search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return leafFolders;
    const q = searchQuery.toLowerCase();
    return leafFolders.filter(f => f.name.toLowerCase().includes(q));
  }, [leafFolders, searchQuery]);

  // Group folders by their major element (1 to 8)
  const groupedFolders = useMemo(() => {
    const groups: Record<string, ContractFolder[]> = {};
    filteredFolders.forEach(folder => {
      const code = getCategoryCode(folder.name);
      const title = getGroupTitle(code);
      if (!groups[title]) {
        groups[title] = [];
      }
      groups[title].push(folder);
    });
    return groups;
  }, [filteredFolders]);

  // Counts per score bucket
  const scoreCounts = useMemo(() => {
    const counts: Record<number, number> = { '-1': 0, 0: 0, 3: 0, 6: 0, 10: 0 };
    leafFolders.forEach(f => {
      const s = scores[f.id] ?? 0;
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [leafFolders, scores]);

  // Counts per status bucket
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { accept: 0, reject: 0, revision: 0, na: 0 };
    leafFolders.forEach(f => {
      if (scores[f.id] === -1) {
        counts.na++;
      } else {
        const st = statuses[f.id] || 'accept';
        if (counts[st] !== undefined) counts[st]++;
      }
    });
    return counts;
  }, [leafFolders, scores, statuses]);

  // Handlers
  const handleAssignScore = (folderId: string, scoreVal: number) => {
    setScores(prev => ({
      ...prev,
      [folderId]: scoreVal
    }));
  };

  const handleGroupAssignScore = (groupFolders: ContractFolder[], scoreVal: number) => {
    setScores(prev => {
      const next = { ...prev };
      groupFolders.forEach(f => {
        next[f.id] = scoreVal;
      });
      return next;
    });
  };

  const handleAssignStatus = (folderId: string, statusVal: string) => {
    setStatuses(prev => ({
      ...prev,
      [folderId]: statusVal
    }));
  };

  const handleGroupAssignStatus = (groupFolders: ContractFolder[], statusVal: string) => {
    setStatuses(prev => {
      const next = { ...prev };
      groupFolders.forEach(f => {
        if (scores[f.id] !== -1) {
          next[f.id] = statusVal;
        }
      });
      return next;
    });
  };

  const handleApplyGroupNote = (groupTitle: string, groupFolders: ContractFolder[]) => {
    const text = groupNoteInputs[groupTitle]?.trim();
    if (!text) return;
    setNotes(prev => {
      const next = { ...prev };
      groupFolders.forEach(f => {
        next[f.id] = text;
      });
      return next;
    });
    showNotifSuccess({ message: `Catatan berhasil diterapkan ke seluruh kategori di ${groupTitle}.` });
  };

  const toggleGroupNoteOpen = (groupTitle: string) => {
    setOpenGroupNotes(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  // Submit bulk assessment
  const handleSubmit = async () => {
    if (!selectedRootFolder) return;

    const payload: BulkAssessmentItemPayload[] = leafFolders.map(folder => {
      const isNA = scores[folder.id] === -1;
      return {
        folderId: folder.id,
        score: scores[folder.id] ?? 0,
        status: isNA ? 'pending' : (statuses[folder.id] || 'accept'),
        note: notes[folder.id]?.trim() || undefined
      };
    });

    bulkAssessmentMutation.mutate(
      {
        rootFolderId: selectedRootFolder.id,
        items: payload
      },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Penilaian massal berhasil disimpan." });
          setIsConfirmOpen(false);
          refreshFolders();
          onClose();
        },
        onError: (error: any) => {
          showNotifError({ message: error?.response?.data?.message ?? error?.message ?? "Gagal menyimpan penilaian." });
          setIsConfirmOpen(false);
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl w-[96vw] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden shadow-2xl border-border bg-card">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Zap className="h-5 w-5 fill-primary/20" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                  Quick Scoring Penilaian
                  <span className="text-xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    {leafFolders.length} Kategori Penilaian
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedRootFolder?.name || 'Penilaian Kontrak'}
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Wizard Indicator */}
            <div className="flex items-center gap-1 sm:gap-2 text-xs font-medium mr-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  step === 1
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-background/20 font-bold">1</span>
                <span>Pilih Skor</span>
              </button>
              <div className="w-3 sm:w-6 h-px bg-border" />
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  step === 2
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-background/20 font-bold">2</span>
                <span>Pilih Status</span>
              </button>
              <div className="w-3 sm:w-6 h-px bg-border" />
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  step === 3
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-background/20 font-bold">3</span>
                <span>Isi Catatan</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Sub-Header: Search Bar */}
        <div className="px-6 py-2.5 bg-muted/30 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kategori (misal: 'Logistik', '4.4', 'HIRADC')..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
            {step === 1 && "💡 Atur skor massal per kategori besar pada header masing-masing elemen di bawah"}
            {step === 2 && "💡 Atur status massal per kategori besar pada header masing-masing elemen di bawah"}
            {step === 3 && "💡 Atur catatan serentak per elemen melalui tombol Catatan Massal Grup"}
          </span>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* STEP 1: PILIH SKOR */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Score Distribution Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
                {SCORE_OPTIONS.map(opt => {
                  const count = scoreCounts[opt.value] || 0;
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs"
                    >
                      <span className="font-medium text-muted-foreground">{opt.label === 'N/A' ? 'N/A' : `Skor ${opt.label}`}:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${opt.activeClass}`}>
                        {count} kategori
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grouped Folder List */}
              <div className="space-y-4">
                {Object.entries(groupedFolders).map(([groupTitle, folders]) => (
                  <div key={groupTitle} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1.5 border-b border-border/40 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wide truncate" title={groupTitle}>
                          {groupTitle} ({folders.length})
                        </h4>
                      </div>

                      {/* Group Bulk Score Toolbar */}
                      <div className="flex items-center gap-1.5 text-xs flex-wrap flex-shrink-0 self-start sm:self-auto">
                        <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Set Skor Grup:</span>
                        {SCORE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleGroupAssignScore(folders, opt.value)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border border-border bg-background hover:bg-muted transition-all cursor-pointer shadow-2xs"
                            title={`Terapkan skor ${opt.label} ke seluruh kategori di ${groupTitle}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {folders.map(folder => {
                        const currentScore = scores[folder.id] ?? 0;
                        const code = getCategoryCode(folder.name);

                        return (
                          <div
                            key={folder.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all gap-3"
                          >
                            {/* Left: Code badge & full readable category name */}
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                              {code && (
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border flex-shrink-0">
                                  {code}
                                </span>
                              )}
                              <p className="text-sm font-medium text-foreground leading-snug break-words">
                                {folder.name}
                              </p>
                            </div>

                            {/* Right: Spacious, segmented score buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                              {SCORE_OPTIONS.map(opt => {
                                const isSelected = currentScore === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleAssignScore(folder.id, opt.value)}
                                    className={`w-11 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
                                      isSelected
                                        ? `${opt.activeClass} ring-2 ring-primary/40`
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: PILIH STATUS */}
          {step === 2 && (
            <div className="space-y-5">
              {/* N/A Notice Banner */}
              {statusCounts.na > 0 && (
                <div className="flex items-center gap-2.5 p-3 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>
                    Sebanyak <strong>{statusCounts.na} kategori</strong> memiliki skor <strong>N/A</strong> dan otomatis dikunci berstatus <strong>N/A</strong> (tidak perlu dipilih).
                  </span>
                </div>
              )}

              {/* Status Overview Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/60">
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs">
                  <span className="font-medium text-green-700 dark:text-green-400">Accept:</span>
                  <span className="font-bold text-green-800 dark:text-green-300">{statusCounts.accept} kategori</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs">
                  <span className="font-medium text-blue-700 dark:text-blue-400">Revisi:</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300">{statusCounts.revision} kategori</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs">
                  <span className="font-medium text-red-700 dark:text-red-400">Reject:</span>
                  <span className="font-bold text-red-800 dark:text-red-200">{statusCounts.reject} kategori</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-400">N/A (Terkunci):</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{statusCounts.na} kategori</span>
                </div>
              </div>

              {/* Grouped Folder List */}
              <div className="space-y-4">
                {Object.entries(groupedFolders).map(([groupTitle, folders]) => (
                  <div key={groupTitle} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1.5 border-b border-border/40 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wide truncate" title={groupTitle}>
                          {groupTitle} ({folders.length})
                        </h4>
                      </div>

                      {/* Group Bulk Status Toolbar */}
                      <div className="flex items-center gap-1.5 text-xs flex-wrap flex-shrink-0 self-start sm:self-auto">
                        <span className="text-[11px] text-muted-foreground font-medium mr-0.5">Set Status Grup:</span>
                        <button
                          type="button"
                          onClick={() => handleGroupAssignStatus(folders, 'accept')}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 hover:opacity-80 transition-all cursor-pointer shadow-2xs"
                          title={`Terapkan status Accept ke semua kategori non-N/A di ${groupTitle}`}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupAssignStatus(folders, 'revision')}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:opacity-80 transition-all cursor-pointer shadow-2xs"
                          title={`Terapkan status Revisi ke semua kategori non-N/A di ${groupTitle}`}
                        >
                          Revisi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupAssignStatus(folders, 'reject')}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:opacity-80 transition-all cursor-pointer shadow-2xs"
                          title={`Terapkan status Reject ke semua kategori non-N/A di ${groupTitle}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {folders.map(folder => {
                        const isNA = scores[folder.id] === -1;
                        const currentStatus = isNA ? 'na' : (statuses[folder.id] || 'accept');
                        const code = getCategoryCode(folder.name);
                        const scoreCfg = getScoreConfig(scores[folder.id]);

                        return (
                          <div
                            key={folder.id}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border transition-all gap-3 ${
                              isNA
                                ? 'bg-muted/20 border-dashed border-border/60 opacity-80'
                                : 'bg-card border-border/70 hover:border-primary/40'
                            }`}
                          >
                            {/* Left: Code badge, Name, and current Score badge */}
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                              {code && (
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border flex-shrink-0">
                                  {code}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug break-words">
                                  {folder.name}
                                </p>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  Skor:{' '}
                                  <span className={`px-1.5 py-0.2 rounded font-bold border text-[10px] ${scoreCfg.color}`}>
                                    {scoreCfg.label}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Right: Status buttons */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                              {isNA ? (
                                <Badge variant="outline" className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-gray-300">
                                  N/A (Otomatis)
                                </Badge>
                              ) : (
                                STATUS_OPTIONS.map(opt => {
                                  const isSelected = currentStatus === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => handleAssignStatus(folder.id, opt.value)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? `${opt.activeClass} ring-2 ring-primary/40`
                                          : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: ISI CATATAN */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Individual notes list grouped by element */}
              <div className="space-y-5">
                {Object.entries(groupedFolders).map(([groupTitle, folders]) => {
                  const isGroupNoteOpen = !!openGroupNotes[groupTitle];
                  const currentGroupNote = groupNoteInputs[groupTitle] || '';

                  return (
                    <div key={groupTitle} className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1.5 border-b border-border/40 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide truncate" title={groupTitle}>
                            {groupTitle} ({folders.length})
                          </h4>
                        </div>

                        {/* Collapsible toggle for Bulk Note in this group */}
                        <button
                          type="button"
                          onClick={() => toggleGroupNoteOpen(groupTitle)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Catatan Massal Grup</span>
                          {isGroupNoteOpen ? (
                            <ChevronUp className="w-3 h-3 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Collapsible Form for Group Bulk Note */}
                      {isGroupNoteOpen && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 shadow-2xs animate-in fade-in-50 duration-150">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              Terapkan catatan serentak ke seluruh kategori di {groupTitle}:
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApplyGroupNote(groupTitle, folders)}
                              disabled={!currentGroupNote.trim()}
                              className="h-6 text-[11px] px-2.5 font-semibold cursor-pointer"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Terapkan ({folders.length})
                            </Button>
                          </div>
                          <Input
                            type="text"
                            placeholder={`Tulis catatan untuk seluruh kategori di ${groupTitle}...`}
                            value={currentGroupNote}
                            onChange={e =>
                              setGroupNoteInputs(prev => ({
                                ...prev,
                                [groupTitle]: e.target.value
                              }))
                            }
                            className="text-xs bg-background h-8"
                          />
                        </div>
                      )}

                    <div className="grid grid-cols-1 gap-2.5">
                      {folders.map(folder => {
                        const scoreVal = scores[folder.id] ?? 0;
                        const statusVal = scoreVal === -1 ? 'N/A' : (statuses[folder.id] || 'accept');
                        const scoreConfig = getScoreConfig(scoreVal);
                        const code = getCategoryCode(folder.name);

                        return (
                          <div
                            key={folder.id}
                            className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2.5 text-xs shadow-2xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {code && (
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border flex-shrink-0">
                                    {code}
                                  </span>
                                )}
                                <span className="font-semibold text-sm text-foreground leading-snug break-words" title={folder.name}>
                                  {folder.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${scoreConfig.color}`}>
                                  Skor: {scoreConfig.label}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-muted uppercase">
                                  {statusVal}
                                </span>
                              </div>
                            </div>

                            <Input
                              type="text"
                              placeholder="Tulis catatan khusus untuk kategori ini (opsional)..."
                              value={notes[folder.id] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setNotes(prev => ({
                                  ...prev,
                                  [folder.id]: val
                                }));
                              }}
                              className="text-xs h-8 bg-muted/20"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between sm:justify-between flex-shrink-0">
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={bulkAssessmentMutation.isPending}
            >
              Batal
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((step - 1) as any)}
                disabled={bulkAssessmentMutation.isPending}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Sebelumnya
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((step + 1) as any)}
              >
                Lanjut ke {step === 1 ? 'Status' : 'Catatan'}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                disabled={bulkAssessmentMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 cursor-pointer"
              >
                {bulkAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan Penilaian...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Simpan Semua Penilaian
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-base font-bold">
                Konfirmasi Simpan Penilaian
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              Apakah anda yakin ingin mengganti semuanya? Nilai yang sudah ada sebelumnya akan tergantikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              disabled={bulkAssessmentMutation.isPending}
              onClick={() => setIsConfirmOpen(false)}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={bulkAssessmentMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {bulkAssessmentMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Ya, Simpan Perubahan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

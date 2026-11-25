import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    File,
    FileUp,
    Ellipsis,
    Trash2,
    Plus,
    Edit,
    Clock,
    CheckCircle,
    XCircle,
    RotateCcw,
    FileText,
    NotebookPen,
    Loader2,
    Sparkles,
    AlertTriangle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useAppTranslation } from "@/lib/i18n-typed";
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MdOutlineAssessment } from "react-icons/md";
import { cn } from '@/lib/utils';
import { isAdmin, isAdminOrUser, isContractor } from '@/types/auth';
import { AiReasoningView, parseAiReasoning } from './AiReasoningView';
import { useAuth } from '@/hooks/use-auth';
import { showNotifError } from '@/lib/show-notif';
import { getDropTargetState, getDropBlockedMessage, isUploadBlockedFolderName, type DropTargetState } from './drop-upload-utils';
import { formatNoteAuthorBadge, pickDefaultNoteTab, type NoteTab } from './note-panel-utils';

interface FolderTreeProps {
    folders: ContractFolder[];
    expandedFolders: Set<string>;
    onToggleFolder: (folderId: string) => void;
    onDeleteFolder: (folder: ContractFolder) => void;
    onCreateSubfolder: (folder: ContractFolder) => void;
    onEditFolder: (folder: ContractFolder) => void;
    onUploadFile: (folder: ContractFolder) => void;
    onDeleteFile: (file: ContractFolder) => void;
    onEditFile: (file: ContractFolder) => void;
    onChangeRating?: (folder: ContractFolder) => void; // Add this prop
    onViewFile?: (file: ContractFolder) => void; // Add this prop
    onChangeNote?: (folder: ContractFolder) => void; // Add this prop
    isFinal?: boolean;
    onEvaluateAi?: (folder: ContractFolder) => void; // admin: AI evaluation of one element/group
    aiChangedIds?: Set<string>; // admin: elements with files uploaded after their last AI run
    onApplyAiCategory?: (folder: ContractFolder) => void; // "Pakai rekomendasi AI" for one category (3 ... 8) or element 1/2
    onDropFiles?: (folder: ContractFolder, path: string[], files: File[]) => void; // drag & drop upload (path = folder names down to the target)
    aiActiveProgress?: {
        extractingFile: string | null;
        completedFiles: string[];
        activeSubfolderName: string | null;
    };
}

// Status configuration with icons and colors
const STATUS_CONFIG = {
    pending: {
        icon: Clock,
        color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700",
        label: "Pending"
    },
    accept: {
        icon: CheckCircle,
        color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700",
        label: "Accept"
    },
    reject: {
        icon: XCircle,
        color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700",
        label: "Reject"
    },
    revision: {
        icon: RotateCcw,
        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700",
        label: "Revisi"
    }
};

const getScoreConfig = (score: number | undefined | null) => {
    if (score === undefined || score === null || parseFloat(score.toString()) === -1) {
        return {
            color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600",
            label: "N/A"
        };
    }

    const scoreNum = parseFloat(score.toString());
    let label = score.toString();
    if (!isNaN(scoreNum)) {
        const rounded = Math.round(scoreNum * 10) / 10;
        if (score.toString().includes('.') || scoreNum % 1 !== 0) {
            label = rounded.toFixed(2);
        } else {
            label = score.toString();
        }
    }

    if (scoreNum === 0) {
        return {
            color: "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700",
            label
        };
    }

    if (scoreNum <= 3) {
        return {
            color: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700",
            label
        };
    }

    if (scoreNum <= 6) {
        return {
            color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700",
            label
        };
    }

    // Score 10 or higher
    return {
        color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700",
        label
    };
};

export const getAiScore = (node: ContractFolder): number | null => {
    // Category 1 and 2 are direct scoreable leaves themselves
    const isCat1or2 = /^([12])\s/.test(node.name) || node.name === '1 Kepemimpinan dan Komitmen' || node.name === '2 Kebijakan dan Sasaran Strategis K3LL';
    if (isCat1or2) {
        return node.aiScore !== undefined && node.aiScore !== null ? parseFloat(String(node.aiScore)) : -1;
    }

    // Standard subcategories (3.1 - 8.2) are direct scoreable leaves
    const isStandardSubcategory = /^[3-8]\.\d+/.test(node.name);
    if (isStandardSubcategory) {
        return node.aiScore !== undefined && node.aiScore !== null ? parseFloat(String(node.aiScore)) : -1;
    }

    const children = node.children || [];
    if (children.length === 0) return -1;

    // Check if Root Assessment folder (depth === 0 or name ends with - PB / - PA / - PSB)
    const isRootAssessment = node.depth === 0 || node.name.endsWith(' - PB') || node.name.endsWith(' - PA') || node.name.endsWith(' - PSB');
    if (isRootAssessment) {
        const rencanaK3LL = children.find(c => c.name === 'A. RENCANA K3LL' && c.fileType === 'folder');
        const catFolders = (rencanaK3LL?.children || children).filter(c => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));

        let totalPureScore = 0;
        let activeCount = 0;
        catFolders.forEach(cat => {
            const s = getAiScore(cat);
            if (s !== null && s !== -1) {
                totalPureScore += s;
                activeCount++;
            }
        });

        if (activeCount === 0) return -1;
        const divisor = activeCount * 10;
        const calculatedScore = (totalPureScore / divisor) * 100;
        return Math.round(calculatedScore * 10) / 10;
    }

    // Check if container "A. RENCANA K3LL"
    if (node.name === 'A. RENCANA K3LL') {
        const catFolders = children.filter(c => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));
        let totalScore = 0;
        let hasActive = false;
        catFolders.forEach(cat => {
            const s = getAiScore(cat);
            if (s !== null && s !== -1) {
                totalScore += s;
                hasActive = true;
            }
        });
        return hasActive ? Math.round(totalScore * 10) / 10 : -1;
    }

    // Check if Category 3 to 8 (/^[3-8]\s/)
    const catMatch = node.name.match(/^([3-8])\s/);
    if (catMatch) {
        const catNum = catMatch[1];
        // ONLY include standard subcategories matching ^catNum\.\d+! Ignore user-generated folders!
        const standardSubfolders = children.filter(c => 
            c.fileType === 'folder' && new RegExp(`^${catNum}\\.\\d+`).test(c.name)
        );

        if (standardSubfolders.length > 0) {
            const activeScores = standardSubfolders
                .map(c => getAiScore(c))
                .filter(s => s !== null && s !== -1) as number[];

            if (activeScores.length === 0) return -1;
            const calculatedScore = activeScores.reduce((a, b) => a + b, 0) / activeScores.length;
            return Math.round(calculatedScore * 10) / 10;
        }
    }

    return -1;
};

// all file nodes below a folder (evidence links in the AI note, "has files" check)
const collectFiles = (node: ContractFolder): ContractFolder[] =>
    (node.children || []).flatMap((c) => (c.fileType === 'file' ? [c] : collectFiles(c)));

// CSMS scale 0 / 3 / 6 / 10: AI and evaluator are "far apart" when they differ by 2+ steps
const SCALE = [0, 3, 6, 10];
const scaleGap = (a: number, b: number) => {
    const ia = SCALE.indexOf(a);
    const ib = SCALE.indexOf(b);
    return ia < 0 || ib < 0 ? 0 : Math.abs(ia - ib);
};

export const FolderTree = ({ folders, expandedFolders, onToggleFolder, onDeleteFolder, onCreateSubfolder, onEditFolder,
    onUploadFile, onDeleteFile, onEditFile, onChangeRating, onViewFile, onChangeNote, isFinal, aiActiveProgress, onEvaluateAi, aiChangedIds, onApplyAiCategory, onDropFiles }: FolderTreeProps) => {
    const { user } = useAuth();
    const { t } = useAppTranslation();
    // State to control dropdown menu visibility per row
    const [openDropdownRowId, setOpenDropdownRowId] = useState<string | null>(null);

    // Drag & drop upload: the folder row under the cursor and whether it accepts files
    const [dropHover, setDropHover] = useState<{ id: string; state: DropTargetState } | null>(null);
    const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dndEnabled = !!onDropFiles;
    const clearExpandTimer = () => {
        if (expandTimer.current) clearTimeout(expandTimer.current);
        expandTimer.current = null;
    };

    useEffect(() => {
        if (!dndEnabled) return;
        // a file dropped next to a folder row must not make the browser open it
        const prevent = (e: DragEvent) => {
            if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
        };
        const reset = () => {
            setDropHover(null);
            clearExpandTimer();
        };
        const onLeaveWindow = (e: DragEvent) => {
            if (!e.relatedTarget) reset();
        };
        window.addEventListener('dragover', prevent);
        window.addEventListener('drop', prevent);
        window.addEventListener('drop', reset);
        window.addEventListener('dragleave', onLeaveWindow);
        return () => {
            window.removeEventListener('dragover', prevent);
            window.removeEventListener('drop', prevent);
            window.removeEventListener('drop', reset);
            window.removeEventListener('dragleave', onLeaveWindow);
            clearExpandTimer();
        };
    }, [dndEnabled]);

    const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

    const getDropRowProps = (node: ContractFolder, path: string[]): React.HTMLAttributes<HTMLTableRowElement> => {
        const state = dndEnabled ? getDropTargetState(node, !!isFinal) : null;
        if (!state) return {};
        const hover = () => {
            setDropHover((cur) => (cur?.id === node.id ? cur : { id: node.id, state }));
        };
        return {
            onDragEnter: (e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                hover();
                clearExpandTimer();
                // like a file manager: hovering a closed folder opens it so a sub-folder can be reached
                if ((node.children ?? []).some((c) => c.fileType === 'folder') && !expandedFolders.has(node.id)) {
                    expandTimer.current = setTimeout(() => onToggleFolder(node.id), 800);
                }
            },
            onDragOver: (e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = state === 'ok' ? 'copy' : 'none';
                hover();
            },
            onDragLeave: (e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                setDropHover((cur) => (cur?.id === node.id ? null : cur));
                clearExpandTimer();
            },
            onDrop: (e) => {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                setDropHover(null);
                clearExpandTimer();
                if (state !== 'ok') return;
                const hasDirectory = Array.from(e.dataTransfer.items ?? []).some((it) => (it as any).webkitGetAsEntry?.()?.isDirectory);
                if (hasDirectory) {
                    showNotifError({ message: 'Folder tidak bisa dilepaskan langsung. Pilih berkas-berkas di dalamnya.' });
                    return;
                }
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) onDropFiles?.(node, [...path, node.name], files);
            },
        };
    };

    // Identify all descendant folder IDs of Category 1 and Category 2
    const category1or2DescendantIds = useMemo(() => {
        const descendantIds = new Set<string>();

        const collectDescendants = (folder: ContractFolder) => {
            if (folder.children) {
                for (const child of folder.children) {
                    descendantIds.add(child.id);
                    collectDescendants(child);
                }
            }
        };

        const findCat1or2 = (items: ContractFolder[]) => {
            for (const item of items) {
                const isCat1or2 = item.fileType === 'folder' && (
                    item.name === '1 Kepemimpinan dan Komitmen' ||
                    item.name === '2 Kebijakan dan Sasaran Strategis K3LL' ||
                    /^[12]\s/.test(item.name)
                );
                if (isCat1or2) {
                    collectDescendants(item);
                } else if (item.children) {
                    findCat1or2(item.children);
                }
            }
        };

        findCat1or2(folders);
        return descendantIds;
    }, [folders]);

    // Helper function to check if folder has no folder-type children
    const hasNoFolderChildren = (node: ContractFolder) => {
        return !node?.children?.some(child => child.fileType === 'folder');
    };

    const isScore = (node: ContractFolder) => {
        if (category1or2DescendantIds.has(node?.id)) {
            return false;
        }
        return node?.isScore || false;
    };

    const isShowScoreColumn = (node: ContractFolder) => {
        if (category1or2DescendantIds.has(node?.id)) {
            return false;
        }
        const depth = node?.depth || -1;
        return ((node?.isScore || false) || ([0, 1, 2].includes(depth)));
    };

    // Circular progress helper
    const CircularProgress = ({ value, size = 18, strokeWidth = 2.5, label }: { value: number; size?: number; strokeWidth?: number; label?: string }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (value / 100) * circumference;

        return (
            <div className="flex items-center gap-2">
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        className="text-gray-200 dark:text-gray-800"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    <circle
                        className="text-purple-600 dark:text-purple-400 transition-all duration-300 animate-pulse"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                {label && <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 animate-pulse">{label}</span>}
            </div>
        );
    };

    // Function to render status with icon and color
    const renderStatus = (node: ContractFolder) => {
        const status = node.status || 'N/A';
        const score = node.score;
        const aiReasoning = node.aiReasoning;
        const nodeName = node.name;
        
        const isParentFolder = node.fileType === 'folder' && node.children && node.children.some(c => c.fileType === 'folder');

        const isActiveFromWS = nodeName && aiActiveProgress?.activeSubfolderName && (
            nodeName.toLowerCase().includes(aiActiveProgress.activeSubfolderName.toLowerCase()) ||
            aiActiveProgress.activeSubfolderName.toLowerCase().includes(nodeName.toLowerCase())
        );

        if ((aiReasoning?.startsWith('PROCESSING:') && !isParentFolder) || isActiveFromWS) {
            const progressMessage = aiReasoning?.startsWith('PROCESSING:') 
                ? aiReasoning.replace('PROCESSING:', '').trim() 
                : 'Mengevaluasi...';
            return (
                <CircularProgress value={50} label={progressMessage} />
            );
        }

        const scoreVal = (score !== undefined && score !== null) ? parseFloat(score.toString()) : 0;
        if (!status || scoreVal === -1) {
            return <span>N/A</span>;
        }

        const statusKey = status.toLowerCase() as keyof typeof STATUS_CONFIG;
        const config = STATUS_CONFIG[statusKey];

        if (!config) {
            return <span>{status}</span>;
        }

        const Icon = config.icon;

        return (
            <Badge className={`px-2.5 py-1 text-xs font-medium rounded-lg ${config.color}`}>
                <Icon className="w-3 h-3 mr-1 inline" />
                {config.label}
            </Badge>
        );
    };

    // Function to render score with color coding
    const renderScore = (score: number | undefined | null) => {
        const config = getScoreConfig(score);

        return (
            <Badge className={`px-2.5 py-1 text-xs font-medium rounded-lg ${config.color}`}>
                {config.label}
            </Badge>
        );
    };

    const NoteAuthorBadge = ({ text }: { text: string }) => (
        <Badge variant="outline" className="mb-1.5 max-w-full truncate px-1.5 py-0 text-[10px] font-normal text-muted-foreground" title={text} data-testid="note-author">
            {text}
        </Badge>
    );

    const NoteDisplay = ({ node }: { node: ContractFolder }) => {
        const { t } = useAppTranslation();
        const { note, noteContractor, aiReasoning } = node;

        const showInternal = !!note;
        const showContractor = !!noteContractor;
        const showAi = !!aiReasoning;

        let parsedAiReasoning: any = null;
        if (showAi && aiReasoning) {
            try {
                parsedAiReasoning = JSON.parse(aiReasoning);
            } catch (e) {
                // Not JSON, fallback to plain text
            }
        }
        
        const isV3 = parsedAiReasoning?.version === "3.0";

        // open on the User / contractor note, not on the AI analysis
        const [view, setView] = useState<NoteTab>(() => pickDefaultNoteTab(showInternal, showContractor, showAi));

        if (!showInternal && !showContractor && !showAi) {
            return null;
        }

        const visibleTabsCount = [showInternal, showContractor, showAi].filter(Boolean).length;

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-70 hover:opacity-100">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("p-3 animate-in fade-in-50 duration-200 max-h-[85vh] overflow-y-auto", (isV3 || parseAiReasoning(aiReasoning)) && view === 'ai' ? "w-[90vw] sm:w-[600px] md:w-[800px]" : "w-[360px]")} align="center">
                    <div className="font-semibold mb-2 border-b pb-1">
                        {t($ => $.contractManagement.note)}
                    </div>
                    <div className="flex flex-col gap-2">
                        {visibleTabsCount > 1 && (
                            <div className="flex gap-1 border-b pb-2 overflow-x-auto">
                                {showAi && (
                                    <Button
                                        variant={view === 'ai' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setView('ai')}
                                        className="flex-1 h-7 text-[11px] px-2"
                                    >
                                        Analisis AI
                                    </Button>
                                )}
                                {showInternal && (
                                    <Button
                                        variant={view === 'internal' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setView('internal')}
                                        className="flex-1 h-7 text-[11px] px-2"
                                    >
                                        {t($ => $.contractManagement.user)}
                                    </Button>
                                )}
                                {showContractor && (
                                    <Button
                                        variant={view === 'contractor' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setView('contractor')}
                                        className="flex-1 h-7 text-[11px] px-2"
                                    >
                                        {t($ => $.contractManagement.contractor)}
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="mt-1">
                            {view === 'ai' && showAi && (
                                <div className="space-y-2">
                                    <div className="font-medium text-purple-600 dark:text-purple-400 mb-1 text-[11px] uppercase tracking-wider">
                                        Analisis AI (Read-Only)
                                    </div>
                                    {node.aiStatus && node.aiStatus !== 'pending' && (
                                        <div className={`grid ${isV3 && parsedAiReasoning?.confidence !== undefined ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-xs border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/10 p-2 rounded-lg`}>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block font-medium uppercase">Status</span>
                                                <span className="font-bold text-purple-950 dark:text-purple-200 uppercase">{node.aiStatus === 'accept' ? 'Accept' : node.aiStatus === 'reject' ? 'Reject' : node.aiStatus}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground block font-medium uppercase">Score</span>
                                                <span className="font-bold text-purple-950 dark:text-purple-200">
                                                    {parseFloat(String(node.aiScore)) === -1 ? 'N/A' : (parseFloat(String(node.aiScore)) % 1 === 0 ? Math.floor(parseFloat(String(node.aiScore))) : node.aiScore)}
                                                </span>
                                            </div>
                                            {isV3 && parsedAiReasoning?.confidence !== undefined && (
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block font-medium uppercase">Confidence</span>
                                                    <span className="font-bold text-purple-950 dark:text-purple-200">
                                                        {Math.round(parsedAiReasoning.confidence * 100)}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isV3 ? (
                                        <div className="mt-3 flex flex-col gap-3">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {parsedAiReasoning.reasoning_records?.map((record: any, idx: number) => (
                                                    <div key={idx} className="bg-white dark:bg-gray-950 rounded-lg border border-purple-200 dark:border-purple-800 p-3 shadow-sm flex flex-col">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-semibold text-purple-900 dark:text-purple-100 text-[11px]">{record.juror}</div>
                                                            <div className="flex gap-1">
                                                                {record.confidence !== undefined && (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 text-[10px] px-1.5 py-0">
                                                                        {Math.round(record.confidence * 100)}%
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[10px] px-1.5 py-0",
                                                                    record.recommended_score >= 6 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
                                                                )}>{record.recommended_score}/10</Badge>
                                                            </div>
                                                        </div>
                                                        <ul className="text-[10px] text-gray-700 dark:text-gray-300 space-y-1 pl-3 list-disc">
                                                            {Array.isArray(record.reasoning) ? record.reasoning.map((r: string, i: number) => <li key={i}>{r}</li>) : <li>{record.reasoning}</li>}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 p-3">
                                                <div className="font-semibold text-purple-900 dark:text-purple-100 text-[11px] mb-1">Consensus Reasoning</div>
                                                <div className="text-[11px] text-gray-800 dark:text-gray-200 mb-3">{parsedAiReasoning.final_reasoning}</div>
                                                
                                                {parsedAiReasoning.ai_recommendation_for_excellent_score && parsedAiReasoning.ai_recommendation_for_excellent_score.recommendations && (
                                                    <div className="mt-3 border-t border-purple-200 dark:border-purple-800/50 pt-3">
                                                        <div className="font-semibold text-purple-900 dark:text-purple-100 text-[11px] mb-2 flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Recommendations for Score 10
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                            <div>
                                                                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</div>
                                                                <ul className="text-[10px] text-gray-700 dark:text-gray-300 space-y-1 pl-3 list-disc mt-1.5">
                                                                    {(parsedAiReasoning.ai_recommendation_for_excellent_score.recommendations || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required Documents</div>
                                                                <ul className="text-[10px] text-gray-700 dark:text-gray-300 space-y-1 pl-3 list-disc mt-1.5">
                                                                    {(parsedAiReasoning.ai_recommendation_for_excellent_score.required_documents || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <AiReasoningView text={aiReasoning} files={collectFiles(node)} onViewFile={onViewFile} />
                                    )}
                                </div>
                            )}
                            {view === 'internal' && showInternal && (
                                <div>
                                    <div className="font-medium text-muted-foreground mb-1 text-[11px] uppercase tracking-wider">
                                        {t($ => $.contractManagement.user)}
                                    </div>
                                    <NoteAuthorBadge text={formatNoteAuthorBadge('internal', node.noteAuthor)} />
                                    <div className="whitespace-pre-wrap max-h-[250px] overflow-y-auto text-xs bg-muted/30 p-2.5 rounded-lg border text-foreground">
                                        {note}
                                    </div>
                                </div>
                            )}
                            {view === 'contractor' && showContractor && (
                                <div>
                                    <div className="font-medium text-muted-foreground mb-1 text-[11px] uppercase tracking-wider">
                                        {t($ => $.contractManagement.contractor)}
                                    </div>
                                    <NoteAuthorBadge text={formatNoteAuthorBadge('contractor', node.noteContractorAuthor)} />
                                    <div className="whitespace-pre-wrap max-h-[250px] overflow-y-auto text-xs bg-muted/30 p-2.5 rounded-lg border text-foreground">
                                        {noteContractor}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    };

    const isCopyNode = (node: ContractFolder) => {
        return node?.isCopy === 1 || node?.isCopy === 2;
    };

    // Render folder tree recursively
    const renderFolderTree = (nodes: ContractFolder[], level: number = 0, isUnderCategory1or2: boolean = false, parentPath: string[] = []) => {
        return nodes.map(node => {
            const isFolder = node.fileType === 'folder';
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedFolders.has(node.id);
            const indent = level * 20;

            const isCurrentCat1or2 = isFolder && (
                node.name === '1 Kepemimpinan dan Komitmen' ||
                node.name === '2 Kebijakan dan Sasaran Strategis K3LL' ||
                /^[12]\s/.test(node.name)
            );
            const isChildOfCat1or2 = isUnderCategory1or2 || category1or2DescendantIds.has(node.id);

            const dropState = dropHover?.id === node.id ? dropHover.state : null;

            return (
                <React.Fragment key={node.id}>
                    <TableRow
                        {...(isFolder ? getDropRowProps(node, parentPath) : {})}
                        data-drop-state={dropState ?? undefined}
                        className={cn(
                            'transition-colors duration-150',
                            dropState === 'ok' && 'bg-primary/10 outline outline-2 -outline-offset-2 outline-primary',
                            dropState && dropState !== 'ok' && 'bg-red-50 dark:bg-red-950/30 outline outline-2 -outline-offset-2 outline-red-400 cursor-not-allowed'
                        )}
                    >
                        <TableCell>
                            <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
                                {isFolder ? (
                                    hasChildren ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mr-2 h-6 w-6 p-0 flex-shrink-0"
                                            onClick={() => onToggleFolder(node.id)}
                                        >
                                            {isExpanded ?
                                                <ChevronDown className="h-4 w-4 flex-shrink-0" /> :
                                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                            }
                                        </Button>
                                    ) : (
                                        <div className="mr-2 h-6 w-6 flex-shrink-0" />
                                    )
                                ) : (
                                    <div className="mr-2 h-6 w-6 flex-shrink-0" />
                                )}
                                {isFolder ? (
                                    <Folder className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                                ) : (node.aiReasoning === 'COMPLETED' || aiActiveProgress?.completedFiles.includes(node.name)) ? (
                                    <CheckCircle className="h-4.5 w-4.5 text-green-500 mr-2 flex-shrink-0 animate-in fade-in zoom-in duration-300" />
                                ) : (node.aiReasoning?.startsWith('PROCESSING:') || aiActiveProgress?.extractingFile === node.name) ? (
                                    <Loader2 className="h-4 w-4 text-purple-500 mr-2 flex-shrink-0 animate-spin" />
                                ) : (
                                    <File className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                )}
                                {isFolder ? (
                                    <span className="flex flex-col">
                                        <span className={cn("line-clamp-2", isCopyNode(node) && "font-semibold")}>{node.name}</span>
                                        {dropState === 'ok' && (
                                            <span className="mt-0.5 inline-flex w-max items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground animate-pulse">
                                                <FileUp className="h-3 w-3" /> Lepas untuk unggah ke sini
                                            </span>
                                        )}
                                        {dropState && dropState !== 'ok' && (
                                            <span className="mt-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                                                {getDropBlockedMessage(dropState, node.name)}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span
                                        className={cn("line-clamp-2 cursor-pointer hover:underline flex items-center gap-2", isCopyNode(node) && "font-semibold")}
                                        onClick={() => {
                                            if (onViewFile) {
                                                onViewFile(node);
                                            }
                                        }}
                                    >
                                        {node.name}
                                        {(node.aiReasoning?.startsWith('PROCESSING:') || aiActiveProgress?.extractingFile === node.name) && (
                                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium animate-pulse">
                                                (Ekstraksi...)
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            {node.updatedAt ? new Date(node.updatedAt).toLocaleString() : 'N/A'}
                        </TableCell>
                        {isFolder ? (
                            <>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {isScore(node) && !isChildOfCat1or2 ? renderStatus(node) : null}
                                        {!isChildOfCat1or2 && node.aiStatus && node.aiStatus !== 'pending' && !node.aiReasoning?.startsWith('PROCESSING:') && (
                                            <div className="flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 px-1.5 py-0.5 rounded w-max">
                                                <Sparkles className="w-2.5 h-2.5 text-purple-500 animate-pulse" />
                                                AI: <span className="uppercase">{node.aiStatus === 'accept' ? 'Accept' : node.aiStatus === 'reject' ? 'Reject' : node.aiStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {isShowScoreColumn(node) && !isChildOfCat1or2 ? (
                                        <div className="flex flex-col gap-1">
                                            {renderScore(node.score)}
                                            {(() => {
                                                const computedScore = getAiScore(node);
                                                if (computedScore !== null && computedScore !== -1 && !node.aiReasoning?.startsWith('PROCESSING:')) {
                                                    const evaluatorScore = node.score !== undefined && node.score !== null ? parseFloat(String(node.score)) : NaN;
                                                    const farApart = isScore(node) && scaleGap(computedScore, evaluatorScore) >= 2;
                                                    return (
                                                        <div className="flex items-center gap-1">
                                                            <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 px-1.5 py-0.5 rounded w-max">
                                                                AI: {computedScore % 1 === 0 ? Math.floor(computedScore) : computedScore}
                                                            </div>
                                                            {farApart && (
                                                                <span title={`Skor AI (${computedScore}) berbeda jauh dari skor evaluator (${evaluatorScore}); perlu ditinjau`}
                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-1 py-0.5 rounded">
                                                                    <AlertTriangle className="h-2.5 w-2.5" /> Selisih
                                                                </span>
                                                            )}
                                                            {aiChangedIds?.has(node.id) && (
                                                                <span title="Ada berkas yang diunggah setelah penilaian AI terakhir; jalankan ulang evaluasi AI untuk elemen ini"
                                                                    data-testid="ai-changed-badge"
                                                                    className="inline-flex items-center text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 px-1 py-0.5 rounded">
                                                                    Berkas berubah
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    ) : null}
                                </TableCell>
                                <TableCell>
                                    {isScore(node) && !isChildOfCat1or2 ? <NoteDisplay node={node} /> : null}
                                </TableCell>
                            </>
                        ) : (
                            <>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </>
                        )}
                        <TableCell className="text-right">
                            {(() => {
                                const isStandardK3LL = isFolder && (
                                    node.name === 'A. RENCANA K3LL' || 
                                    /^[1-8]\s/.test(node.name) || 
                                    /^[1-8]\.\d+/.test(node.name)
                                );
                                const isParentWithoutUpload = isFolder && isUploadBlockedFolderName(node.name);
                                // a finalized assessment folder is read-only; only the AI evaluation stays available
                                // (it writes AI scores, never the evaluator's final scores)
                                const editable = !isFinal;
                                const canUpload = editable && isFolder && !isParentWithoutUpload;
                                const canCreateSub = editable && isFolder && !isParentWithoutUpload;
                                const canEdit = editable && isFolder && !isStandardK3LL;
                                const canDelete = editable && isFolder && !isStandardK3LL;
                                const canNote = editable && isFolder && isScore(node) && isContractor(user);
                                const canRating = editable && isFolder && isScore(node) && isAdminOrUser(user);
                                // element (1, 2, 3.1 ...) or group (3 ... 8) with at least one file
                                const canAiEvaluate = !!onEvaluateAi && isFolder && isAdmin(user)
                                    && /^[1-8](\s|\.\d+)/.test(node.name) && collectFiles(node).length > 0;

                                // category (or element 1/2) with at least one AI result: apply the AI recommendation (preview first)
                                const canApplyAi = !!onApplyAiCategory && isFolder && !isFinal && isAdminOrUser(user) && /^[1-8]\s/.test(node.name)
                                    && (/^HASIL PENILAIAN AI/.test(node.aiReasoning ?? '') || (node.children || []).some((c) => /^HASIL PENILAIAN AI/.test(c.aiReasoning ?? '')));

                                const hasAnyFolderAction = canUpload || canCreateSub || canEdit || canDelete || canNote || canRating || canAiEvaluate || canApplyAi;

                                if ((isFinal && !canAiEvaluate) || (isFolder && !hasAnyFolderAction)) {
                                    return <div></div>;
                                }

                                return (
                                    <DropdownMenu open={openDropdownRowId === node.id} onOpenChange={(isOpen) => {
                                        if (isOpen) {
                                            setOpenDropdownRowId(node.id);
                                        } else {
                                            setOpenDropdownRowId(null);
                                        }
                                    }}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="opacity-100">
                                                <Ellipsis className="h-4 w-4 flex-shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {isFolder ? (
                                                // Regular folder options
                                                <>
                                                    {canUpload && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setOpenDropdownRowId(null);
                                                                onUploadFile(node);
                                                            }}
                                                        >
                                                            <FileUp className="mr-2 h-4 w-4" />
                                                            <span>{t($ => $.contractManagement.uploadFile)}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canCreateSub && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setOpenDropdownRowId(null);
                                                                onCreateSubfolder(node);
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            <span>{t($ => $.contractManagement.createSubfolder.title)}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canEdit && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setOpenDropdownRowId(null);
                                                                onEditFolder(node);
                                                            }}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>{t($ => $.contractManagement.editFolder)}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canNote && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-primary"
                                                                onClick={() => {
                                                                    if (onChangeNote) {
                                                                        onChangeNote(node);
                                                                    }
                                                                }}
                                                            >
                                                                <NotebookPen className="mr-2 h-4 w-4" />
                                                                <span>{t($ => $.contractManagement.createNote)}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {canRating && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-primary"
                                                                onClick={() => {
                                                                    if (onChangeRating) {
                                                                        onChangeRating(node);
                                                                    }
                                                                }}
                                                            >
                                                                <MdOutlineAssessment className="mr-2 h-4 w-4" />
                                                                <span>{t($ => $.contractManagement.changeRating)}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {canAiEvaluate && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-purple-700 dark:text-purple-400"
                                                                onClick={() => {
                                                                    setOpenDropdownRowId(null);
                                                                    onEvaluateAi?.(node);
                                                                }}
                                                            >
                                                                <Sparkles className="mr-2 h-4 w-4" />
                                                                <span>{/^[1-8]\s/.test(node.name) && !/^[12]\s/.test(node.name) ? 'Evaluasi AI grup ini' : 'Evaluasi AI elemen ini'}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {canApplyAi && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-purple-700 dark:text-purple-400"
                                                                data-testid="menu-apply-ai-category"
                                                                onClick={() => {
                                                                    setOpenDropdownRowId(null);
                                                                    onApplyAiCategory?.(node);
                                                                }}
                                                            >
                                                                <Sparkles className="mr-2 h-4 w-4" />
                                                                <span>Pakai rekomendasi AI {/^[12]\s/.test(node.name) ? 'elemen ini' : 'kategori ini'}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {canDelete && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => {
                                                                    setOpenDropdownRowId(null);
                                                                    onDeleteFolder(node);
                                                                }}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>{t($ => $.contractManagement.deleteFolder)}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                // File options
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setOpenDropdownRowId(null);
                                                            onEditFile(node);
                                                        }}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>{t($ => $.contractManagement.editFile)}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => {
                                                            setOpenDropdownRowId(null);
                                                            onDeleteFile(node);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>{t($ => $.contractManagement.deleteFile)}</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })()}
                        </TableCell>
                    </TableRow>
                    {isFolder && hasChildren && isExpanded && (
                        <TableRow>
                            <TableCell colSpan={6} className="p-0">
                                <Table>
                                    <TableBody>
                                        {renderFolderTree(node.children || [], level + 1, isUnderCategory1or2 || isCurrentCat1or2, [...parentPath, node.name])}
                                    </TableBody>
                                </Table>
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
            );
        });
    };

    return <>{renderFolderTree(folders)}</>;
};
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Edit,
  ChevronRight,
  ChevronDown,
  Folder,
  Ellipsis,
  Trash2,
  Plus,
  File,
  FileUp,
  Download,
  Loader2,
  AlertTriangle,
  Lock,
  Zap
} from 'lucide-react';
import { QuickScoringModal } from './contract-detail/QuickScoringModal';
import {
  useUpdateFolder,
  useCreateSubfolder,
  useDeleteFolder,
  useUploadFileToFolder,
  useDeleteFile,
  useFileDetails,
  useDuplicateContractDir,
  useCopyPbStatus,
  useUpdateAssessmentFolder,
  useUpdateFolderFinal,
  useExportFolderAsZip,
  useAiEvaluate,
  useAiChanged,
} from '@/service/csms/contract-management-api';
import { AI_JOB_STARTED_EVENT, countElements } from './AiEvaluationButton';
import { AiModeDialog, type AiModeChoice } from './AiModeDialog';
import { AiApplyDialog } from './AiApplyDialog';
import { ContractFolder } from '@/service/csms/folder-detail';
import { FolderTree, getAiScore } from './FolderTree';
import { RootFolderSelector } from './RootFolderSelector';
import { CopyPBDialog } from './CopyPBDialog';
import type { CopyPayload } from './copy-pb-utils';
import { DropUploadDialog, type DropUploadRequest } from './DropUploadDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DialogModalForm } from '@/components/custom/components';
import { onEditFolder } from './templates/edit-folder-template';
import { EditFolderForm } from './EditFolderForm';
import { onUploadFile } from './templates/upload-file-template';
import { UploadFileForm } from './UploadFileForm';
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { onCreateSubfolder } from './templates/create-subfolder-template';
import { CreateSubfolderForm } from './CreateSubfolderForm';
import { onEditDescription } from './templates/edit-description-template';
import { EditDescriptionForm } from './EditDescriptionForm';
import { onDeleteFolder } from './templates/delete-folder-template';
import { onDeleteFile } from './templates/delete-file-template';
import { onEditFile } from './templates/edit-file-template';
import { EditFileForm } from './EditFileForm';
import { useAppTranslation } from "@/lib/i18n-typed";
import { ListUsersResponse } from '@/service/user-api'; // Update this import
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { onChangeRating } from './templates/change-rating-template';
import { ChangeRatingForm } from './ChangeRatingForm';
import { onChangeNote } from './templates/change-note-template';
import { ChangeNoteForm } from './ChangeNoteForm';
import { MdOutlineAssessment } from 'react-icons/md'; // Added missing import
import { isAdminOrUser, isAdmin } from '@/types/auth';
import { useAuth } from '@/hooks/use-auth';
import { FolderTreeEvaluation } from './FolderTreeEvaluation';

interface ContractDetailProps {
  selectedRootFolderId: string | null;
  setSelectedRootFolderId: (id: string | null) => void;
  expandedFolders: Set<string>;
  setExpandedFolders: (folders: Set<string>) => void;
  persistentExpandedFolders: Record<string, Set<string>>;
  setPersistentExpandedFolders: (folders: Record<string, Set<string>>) => void;
  folders: ContractFolder[];
  refreshFolders: () => void;
  // Add users data and loading state as props
  usersData: ListUsersResponse | undefined;
  isLoadingUsers: boolean;
}

// Helper to calculate progress percentage from message
const getProgressPercentage = (msg?: string): number => {
  if (!msg) return 5;
  const lower = msg.toLowerCase();
  
  if (lower.includes('recalculating')) return 95;
  
  // Parse "subfolder X/Y" which is present in:
  // "Extracting subfolder X/Y: ..."
  // "Embedding subfolder X/Y: ..."
  // "Evaluating subfolder X/Y: ..."
  const match = msg.match(/subfolder (\d+)\/(\d+)/i);
  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (total > 0) {
      let subStep = 0.8; // default to evaluation phase
      if (lower.includes('extracting')) subStep = 0.1;
      if (lower.includes('embedding')) subStep = 0.4;
      
      const ratio = (current - 1 + subStep) / total;
      return Math.round(10 + ratio * 85); // map ratio to 10% - 95% range
    }
  }
  
  if (lower.includes('extracting')) return 10;
  if (lower.includes('embedding')) return 20;
  
  return 15;
};

const CircularProgress = ({ value, size = 28, strokeWidth = 3 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-purple-100 dark:text-purple-950/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-purple-600 dark:text-purple-400 transition-all duration-300"
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
      <span className="absolute text-[8px] font-bold text-purple-700 dark:text-purple-400">
        {value}%
      </span>
    </div>
  );
};

export const ContractDetail = ({
  selectedRootFolderId,
  setSelectedRootFolderId,
  expandedFolders,
  setExpandedFolders,
  persistentExpandedFolders,
  setPersistentExpandedFolders,
  folders: initialFolders,
  refreshFolders,
  usersData,
  isLoadingUsers
}: ContractDetailProps) => {
  const { t } = useAppTranslation();
  const { user } = useAuth();

  // State for folders
  const [folders, setFolders] = useState<ContractFolder[]>(initialFolders);
  const [selectedRootFolder, setSelectedRootFolder] = useState<ContractFolder | null>(null);
  const [editAssessmentDateModal, setEditAssessmentDateModal] = useState<any>(null);
  const [createSubfolderModal, setCreateSubfolderModal] = useState<any>(null);
  const [editDescriptionModal, setEditDescriptionModal] = useState<any>(null);
  const [editFolderModal, setEditFolderModal] = useState<any>(null);
  const [uploadFileModal, setUploadFileModal] = useState<any>(null);
  const [deleteFolderModal, setDeleteFolderModal] = useState<any>(null);
  const [deleteFileModal, setDeleteFileModal] = useState<any>(null);
  const [editFileModal, setEditFileModal] = useState<any>(null);
  const [changeRatingModal, setChangeRatingModal] = useState<any>(null);
  const [changeNoteModal, setChangeNoteModal] = useState<any>(null);
  const [completeFolderModal, setCompleteFolderModal] = useState<{ // Added state for complete folder modal
    folder: ContractFolder;
  } | null>(null);
  const [isQuickScoringOpen, setIsQuickScoringOpen] = useState(false);

  // State to control dropdown menu visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State to track AI evaluation progress per root folder
  const [aiEvaluationProgress, setAiEvaluationProgress] = useState<Record<string, { status: string; progressMessage?: string }>>({});

  const handleStatusChange = useCallback((folderId: string, status: string, progressMessage?: string) => {
    setAiEvaluationProgress(prev => {
      const current = prev[folderId];
      if (current && current.status === status && current.progressMessage === progressMessage) {
        return prev;
      }
      return {
        ...prev,
        [folderId]: { status, progressMessage }
      };
    });
  }, []);

  // Ref to hold the latest refreshFolders callback to prevent WS reconnection loops
  const refreshFoldersRef = useRef(refreshFolders);
  useEffect(() => {
    refreshFoldersRef.current = refreshFolders;
  }, [refreshFolders]);

  // Local state for active progress to prevent HTTP refetching loops
  const [aiActiveProgress, setAiActiveProgress] = useState<{
    extractingFile: string | null;
    completedFiles: string[];
    activeSubfolderName: string | null;
  }>({
    extractingFile: null,
    completedFiles: [],
    activeSubfolderName: null,
  });

  // WebSocket Listener for real-time AI evaluation progress
  useEffect(() => {
    if (!selectedRootFolderId) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    const connectWs = () => {
      if (!isComponentMounted) return;

      try {
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const wsProto = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${baseUrl.replace(/^https?/, wsProto)}/api/v1/user/ws/notifications`;

        console.log('[WS-Client] Connecting to AI evaluation WS channel:', wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[WS-Client] Connected successfully to notifications WS');
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'notification' && message.data) {
              const info = message.data;
              // Check if notification matches the current root folder
              if (info.folderId === selectedRootFolderId) {
                if (info.type === 'ai_evaluation_progress') {
                  const msg = info.progressMessage || '';
                  console.log('[WS-Client] Received progress notification:', msg);

                  // Update header evaluation progress without triggering full HTTP reload
                  setAiEvaluationProgress(prev => ({
                    ...prev,
                    [selectedRootFolderId]: { 
                      status: 'processing', 
                      progressMessage: msg 
                    }
                  }));

                  // Update local progress states for FolderTree
                  setAiActiveProgress(prev => {
                    let nextExtracting = prev.extractingFile;
                    let nextCompleted = [...prev.completedFiles];
                    let nextSubfolder = prev.activeSubfolderName;

                    if (msg.startsWith('Extracting:') || msg.startsWith('Extracting subfolder')) {
                      let content = msg;
                      if (msg.startsWith('Extracting subfolder')) {
                        content = msg.replace(/Extracting subfolder \d+\/\d+:\s*/, '').trim();
                      } else {
                        content = msg.replace('Extracting:', '').trim();
                      }
                      
                      if (content.includes(' -> ')) {
                        const parts = content.split(' -> ');
                        const parentName = parts[0].trim();
                        const fname = parts[1].trim().replace(/\s*\(\d+\/\d+\)$/, '').trim();

                        if (nextExtracting && nextExtracting !== fname && !nextCompleted.includes(nextExtracting)) {
                          nextCompleted.push(nextExtracting);
                        }
                        nextExtracting = fname;
                        nextSubfolder = parentName;
                      } else {
                        const fname = content.replace(/\s*\(\d+\/\d+\)$/, '').trim();
                        if (nextExtracting && nextExtracting !== fname && !nextCompleted.includes(nextExtracting)) {
                          nextCompleted.push(nextExtracting);
                        }
                        nextExtracting = fname;
                        nextSubfolder = '1 Kepemimpinan dan Komitmen';
                      }
                    } else if (msg.toLowerCase().includes('embeddings') || msg.toLowerCase().includes('generating')) {
                      nextSubfolder = '1 Kepemimpinan dan Komitmen';
                      nextExtracting = null;
                    } else if (msg.includes('Evaluating subfolder')) {
                      const parts = msg.split(': ');
                      if (parts.length > 1) {
                        nextSubfolder = parts[1].trim();
                      }
                      nextExtracting = null; // Extraction is done
                    }
                    
                    return {
                      extractingFile: nextExtracting,
                      completedFiles: nextCompleted,
                      activeSubfolderName: nextSubfolder,
                    };
                  });

                } else if (info.type === 'ai_subfolder_completed') {
                  const { subfolderId, aiScore, aiStatus, aiReasoning, note } = info;
                  console.log('[WS-Client] AI Subfolder evaluation completed for subfolder:', subfolderId);
                  
                  // Helper function to recursively update a folder node in the tree
                  const updateFolderNode = (nodes: ContractFolder[]): ContractFolder[] => {
                    return nodes.map(node => {
                      if (node.id === subfolderId) {
                        return {
                          ...node,
                          score: aiScore,
                          status: aiStatus,
                          aiScore,
                          aiStatus,
                          aiReasoning,
                          note: note !== undefined && note !== null ? note : node.note,
                        };
                      }
                      if (node.children && node.children.length > 0) {
                        return {
                          ...node,
                          children: updateFolderNode(node.children),
                        };
                      }
                      return node;
                    });
                  };

                  setFolders(prev => {
                    const nextFolders = updateFolderNode(prev);
                    if (selectedRootFolderId) {
                      const nextRoot = nextFolders.find(f => f.id === selectedRootFolderId);
                      if (nextRoot) {
                        setSelectedRootFolder(nextRoot);
                      }
                    }
                    return nextFolders;
                  });

                } else if (info.type === 'ai_evaluation_failed') {
                  console.log('[WS-Client] AI Evaluation failed.');
                  setAiActiveProgress({
                    extractingFile: null,
                    completedFiles: [],
                    activeSubfolderName: null,
                  });
                  refreshFoldersRef.current();
                  showNotifError({
                    message: 'Evaluasi AI gagal',
                    description: info.errorMessage || 'Layanan AI tidak dapat menyelesaikan evaluasi. Silakan coba lagi.',
                  });
                } else if (info.type === 'ai_evaluation_complete') {
                  console.log('[WS-Client] AI Evaluation completed, refreshing folders.');
                  // Clear local progress states
                  setAiActiveProgress({
                    extractingFile: null,
                    completedFiles: [],
                    activeSubfolderName: null,
                  });
                  // Trigger final refresh to load scores
                  refreshFoldersRef.current();
                  showNotifSuccess({ 
                    message: `Evaluasi AI Selesai dengan Skor: ${info.aiScore ?? 0}` 
                  });
                }
              }
            }
          } catch (err) {
            console.error('[WS-Client] Error parsing message:', err);
          }
        };

        socket.onclose = (e) => {
          console.log('[WS-Client] WS connection closed, scheduling reconnect...', e.reason);
          if (isComponentMounted) {
            reconnectTimeout = setTimeout(connectWs, 5000);
          }
        };

        socket.onerror = (err) => {
          console.error('[WS-Client] WS connection error:', err);
          socket?.close();
        };

      } catch (err) {
        console.error('[WS-Client] Failed to setup WebSocket:', err);
      }
    };

    connectWs();

    return () => {
      isComponentMounted = false;
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [selectedRootFolderId]);

  // API hooks
  const { mutate: updateAssessmentFolder } = useUpdateAssessmentFolder();
  const { mutate: updateFolderFinal } = useUpdateFolderFinal(); // Added hook for the API
  const aiEvaluateElement = useAiEvaluate();
  const [aiElementTarget, setAiElementTarget] = useState<ContractFolder | null>(null);
  const [aiApplyTarget, setAiApplyTarget] = useState<ContractFolder | null>(null);
  // elements with files uploaded after their last AI run ("berkas berubah" badge in the tree)
  const { data: aiChanged } = useAiChanged(selectedRootFolder?.id, isAdmin(user));
  const aiChangedIds = React.useMemo(() => new Set(aiChanged?.changedIds ?? []), [aiChanged]);

  // Admin: AI evaluation of one element/group. The job runs on the assessment folder (one lock per folder),
  // so the AI panel of that folder picks it up and shows queue/progress. The mode is asked first.
  const handleEvaluateAiElement = (folder: ContractFolder) => setAiElementTarget(folder);
  const startAiElement = async (folder: ContractFolder, choice: AiModeChoice) => {
    try {
      const res: any = await aiEvaluateElement.mutateAsync({ folderId: folder.id, mode: choice.mode });
      const data = res?.data || res;
      if (data?.jobId) {
        showNotifSuccess({ message: `Evaluasi AI dimulai: ${folder.name}` });
        window.dispatchEvent(new CustomEvent(AI_JOB_STARTED_EVENT, { detail: { folderId: data.folderId } }));
      } else {
        showNotifError({ message: data?.message || 'Gagal memulai evaluasi AI' });
      }
    } catch (error: any) {
      showNotifError({ message: error?.response?.data?.message || error?.message || 'Gagal memulai evaluasi AI' });
    }
  };

  // Remove the useListUsers hook since we're getting it from props
  // const { data: usersData, isLoading: isLoadingUsers } = useListUsers({
  //   limit: 100,
  //   search: '', // Initial empty search
  //   role: ['user'] // Assuming we want users with the 'user' role
  // });

  // Ref to store the ID of the last deleted folder
  const deletedFolderIdRef = useRef<string | null>(null);

  // API hooks
  const { mutate: updateFolder } = useUpdateFolder();
  const { mutate: createSubfolder } = useCreateSubfolder();
  const { mutate: deleteFolder } = useDeleteFolder();
  const { mutate: uploadFileToFolder } = useUploadFileToFolder();
  const { mutate: deleteFile } = useDeleteFile();
  const { mutate: getFileDetails } = useFileDetails();
  const { mutate: duplicateContractDir, isPending: isDuplicateLoading } = useDuplicateContractDir();
  const { mutate: exportFolderAsZip, isPending: isExportingZip } = useExportFolderAsZip(); // Added hook for ZIP export


  // Update local state when props change
  useEffect(() => {
    // Pass the deleted folder ID if available
    refreshFolderTree(initialFolders, deletedFolderIdRef.current || undefined);
    // Clear the ref after using it
    deletedFolderIdRef.current = null;
  }, [initialFolders]);

  const showExportToZip = () => {
    return (selectedRootFolder?.isComplete ?? false);
  };

  // Handler for exporting folder as ZIP
  const handleExportFolderAsZip = () => {
    if (selectedRootFolderId) {
      const fileNameZip = `folder-${selectedRootFolder?.name.replace(/ /g, '').toLowerCase()}.zip`;
      exportFolderAsZip(selectedRootFolderId, {
        onSuccess: (response) => {
          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fileNameZip);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        },
        onError: (error) => {
          showNotifError({ message: 'Failed to export folder as ZIP' });
        }
      });
    }
  };

  // Helper function to refresh folder tree and maintain UI state
  const refreshFolderTree = (folderTree: ContractFolder[], deletedFolderId?: string) => {
    setFolders(folderTree);

    // Handle special case for deleted folder
    if (deletedFolderId && selectedRootFolderId && selectedRootFolderId === deletedFolderId) {
      // Remove the deleted folder from persistent expanded folders
      const newPersistentExpanded = { ...persistentExpandedFolders };
      delete newPersistentExpanded[selectedRootFolderId];
      setPersistentExpandedFolders(newPersistentExpanded);

      setSelectedRootFolder(null);
      setSelectedRootFolderId(null);
      setExpandedFolders(new Set());
      return;
    }

    // Update the selectedRootFolder with the updated data
    let newSelectedFolder = selectedRootFolder;
    if (selectedRootFolderId) {
      const updatedFolder = folderTree.find(folder => folder.id === selectedRootFolderId);
      if (updatedFolder) {
        setSelectedRootFolder(updatedFolder);
        newSelectedFolder = updatedFolder;
      }
    }

    // Select the first root folder by default if none selected
    if (folderTree.length > 0 && !selectedRootFolderId) {
      setSelectedRootFolder(folderTree[0]);
      setSelectedRootFolderId(folderTree[0].id);
      newSelectedFolder = folderTree[0];
    }

    // Restore expanded state for the selected folder
    if (newSelectedFolder) {
      const folderExpandedState = persistentExpandedFolders[newSelectedFolder.id];
      if (folderExpandedState) {
        setExpandedFolders(new Set(folderExpandedState));
      } else if (newSelectedFolder.children && newSelectedFolder.children.length > 0) {
        // Automatically expand all folders for the selected root
        const allFolderIds = [newSelectedFolder.id, ...getAllFolderIds(newSelectedFolder.children)];
        setExpandedFolders(new Set(allFolderIds));
      }
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const newSet = new Set(expandedFolders);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }

    setExpandedFolders(newSet);

    // Update persistent expanded folders for the selected root folder
    if (selectedRootFolderId) {
      const newPersistentExpanded = {
        ...persistentExpandedFolders,
        [selectedRootFolderId]: new Set(newSet)
      };
      setPersistentExpandedFolders(newPersistentExpanded);
    }
  };

  // Expand all folders under the selected root
  const expandAllFolders = () => {
    if (!selectedRootFolderId) return;
    // Include the root folder ID in the expanded set along with its children
    const allFolderIds = [selectedRootFolder!.id, ...getAllFolderIds(selectedRootFolder!.children || [])];
    const newExpandedSet = new Set(allFolderIds);
    setExpandedFolders(newExpandedSet);

    // Update persistent expanded folders for the selected root folder
    const newPersistentExpanded = {
      ...persistentExpandedFolders,
      [selectedRootFolderId]: newExpandedSet
    };
    setPersistentExpandedFolders(newPersistentExpanded);
  };

  // Collapse all folders
  const collapseAllFolders = () => {
    const newExpandedSet = new Set<string>();
    setExpandedFolders(newExpandedSet);

    // Update persistent expanded folders for the selected root folder
    if (selectedRootFolderId) {
      const newPersistentExpanded = {
        ...persistentExpandedFolders,
        [selectedRootFolderId]: newExpandedSet
      };
      setPersistentExpandedFolders(newPersistentExpanded);
    }
  };

  // Helper function to get all folder IDs
  const getAllFolderIds = (folders: ContractFolder[]): string[] => {
    let ids: string[] = [];
    folders.forEach(folder => {
      if (folder.fileType === 'folder') {
        ids.push(folder.id);
        if (folder.children && folder.children.length > 0) {
          ids = ids.concat(getAllFolderIds(folder.children));
        }
      }
    });
    return ids;
  };

  // Select a root folder to display
  const handleSelectRootFolder = (folder: ContractFolder) => {
    setSelectedRootFolder(folder);
    setSelectedRootFolderId(folder.id);

    // Use persistent expanded state for this folder, or initialize with all expanded
    const folderExpandedState = persistentExpandedFolders[folder.id];
    if (folderExpandedState) {
      // Restore previous expanded state for this folder
      setExpandedFolders(new Set(folderExpandedState));
    } else {
      // Default to expanding all children for newly selected folders
      if (folder.children && folder.children.length > 0) {
        // Include the root folder ID in the expanded set along with its children
        const allFolderIds = [folder.id, ...getAllFolderIds(folder.children)];
        setExpandedFolders(new Set(allFolderIds));
      } else {
        // Just reset expanded folders when switching root folders
        setExpandedFolders(new Set());
      }
    }
  };

  // Handle create subfolder
  const handleCreateSubfolder = (parentFolderId: string, body: any) => {
    createSubfolder(
      { parentFolderId, ...body },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Subfolder created successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle create subfolder click
  const handleCreateSubfolderClick = (folder: ContractFolder) => {
    onCreateSubfolder(
      t,
      folder.id,
      folder.name,
      setCreateSubfolderModal,
      handleCreateSubfolder,
      <CreateSubfolderForm />
    );
  };

  // Handle edit description
  const handleUpdateFolderDescription = (folderId: string, body: any) => {
    updateFolder(
      { folderId, ...body },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Folder description updated successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle edit description click
  const handleEditDescriptionClick = (folder: ContractFolder) => {
    // Since the ContractFolder interface doesn't have a description property,
    // we'll pass an empty string as the current description
    onEditDescription(
      t,
      folder.id,
      folder.name,
      "", // Empty string as we don't have access to the current description
      setEditDescriptionModal,
      handleUpdateFolderDescription,
      <EditDescriptionForm />
    );
  };

  // Handle delete folder
  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(
      folderId,
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Folder deleted successfully" });
          // Store the deleted folder ID in the ref
          deletedFolderIdRef.current = folderId;
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle delete folder click
  const handleDeleteFolderClick = (folder: ContractFolder) => {
    onDeleteFolder(
      t,
      folder.id,
      folder.name,
      setDeleteFolderModal,
      handleDeleteFolder
    );
  };

  // Handle edit folder
  const handleUpdateFolder = (folderId: string, body: any) => {
    updateFolder(
      { folderId, ...body },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Folder updated successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle edit folder click
  const handleEditFolderClick = (folder: ContractFolder) => {
    // Since the ContractFolder interface doesn't have a description property,
    // we'll pass an empty string as the current description
    onEditFolder(
      t,
      folder.id,
      folder.name,
      folder.name,
      "", // Empty string as we don't have access to the current description
      setEditFolderModal,
      handleUpdateFolder,
      <EditFolderForm />
    );
  };

  // Handle upload file
  const handleUploadFileToFolder = (folderId: string, body: any) => {
    // Create FormData from the file data
    const formData = new FormData();
    formData.append('folderId', folderId);

    // The body.file is an array with file metadata from the FormUpload component
    // Process all files instead of just the first one
    if (body.file && body.file.length > 0) {
      body.file.forEach((fileData: any) => {
        formData.append('file', fileData.file?.file);
      });
    }

    uploadFileToFolder(
      formData, // Pass the FormData object directly
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "File(s) uploaded successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Drag & drop upload: confirm first, then reuse the normal upload call
  const [dropUploadRequest, setDropUploadRequest] = useState<DropUploadRequest | null>(null);
  const handleDropFiles = (folder: ContractFolder, path: string[], files: File[]) => {
    const rootTitle = selectedRootFolder ? getFolderTitle(selectedRootFolder.name) : null;
    setDropUploadRequest({ folder, path: rootTitle ? [rootTitle, ...path] : path, files });
  };
  const handleDropUploadConfirm = (request: DropUploadRequest) => {
    setDropUploadRequest(null);
    handleUploadFileToFolder(request.folder.id, { file: request.files.map((file) => ({ file: { file } })) });
  };

  // Handle upload file click
  const handleUploadFileClick = (folder: ContractFolder) => {
    onUploadFile(
      t,
      folder.id,
      folder.name,
      setUploadFileModal,
      handleUploadFileToFolder,
      <UploadFileForm />
    );
  };

  // Handle delete file
  const handleDeleteFile = (file: ContractFolder) => {
    // Show confirmation dialog before deleting
    onDeleteFile(
      t,
      file.id,
      file.name,
      setDeleteFileModal,
      (fileId: string) => {
        // This function will be called when the user confirms deletion
        deleteFile(
          fileId,
          {
            onSuccess: (response: any) => {
              showNotifSuccess({ message: response?.message || "File deleted successfully" });
              // Refresh the contract folders
              refreshFolders();
            },
            onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
          }
        );
      }
    );
  };

  // Handle edit file
  const handleEditFile = (file: ContractFolder) => {
    onEditFile(
      t,
      file.id,
      file.name,
      file.name,
      setEditFileModal,
      handleUpdateFile,
      <EditFileForm />
    );
  };

  // Handle change rating click
  const handleChangeRatingClick = (folder: ContractFolder, showScore = true) => {
    const aiRecommendation = {
      aiScore: folder.aiScore,
      aiStatus: folder.aiStatus,
      aiReasoning: folder.aiReasoning,
    };
    onChangeRating(
      t,
      folder.id,
      folder.name,
      folder.status || '',
      folder.score !== undefined ? folder.score.toString() : '0',
      folder.note || '',
      setChangeRatingModal,
      handleChangeRating,
      <ChangeRatingForm showScore={showScore} aiRecommendation={aiRecommendation} />
    );
  };

  // Handle change note click
  const handleChangeNoteClick = (folder: ContractFolder) => {
    onChangeNote(
      t,
      folder.id,
      folder.name,
      folder.noteContractor || '',
      setChangeNoteModal,
      handleChangeNote,
      <ChangeNoteForm />
    );
  };

  // Handle update file
  const handleUpdateFile = (fileId: string, body: any) => {
    updateFolder(
      { folderId: fileId, ...body },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "File updated successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle change rating
  const handleChangeRating = (folderId: string, body: any) => {
    updateAssessmentFolder(
      { folderId, ...body },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Rating updated successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle change note
  const handleChangeNote = (folderId: string, body: any) => {
    updateFolder(
      { folderId, noteContractor: body.noteContractor },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Note updated successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle complete folder - Added function
  const handleCompleteFolder = (folderId: string) => {
    updateFolderFinal(
      { folderId, isFinal: true },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || "Folder marked as complete successfully" });
          // Refresh the contract folders
          refreshFolders();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    );
  };

  // Handle view file
  const handleViewFile = (file: ContractFolder) => {
    getFileDetails(file.id, {
      onSuccess: (data: any) => {
        if (data && data.url) {
          // Open file in new tab with security attributes
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
          showNotifError({ message: "File URL not found" });
        }
      },
      onError: (error: any) => {
        showNotifError({ message: error?.response?.data?.message ?? error?.message ?? "Error viewing file" });
      }
    });
  };

  // Handle copy folder operation
  const handleCopyFolder = (sourceFolder: ContractFolder, targetFolder: ContractFolder) => {
    setCopyConfirmationModal({
      sourceFolder,
      targetFolder
    });
  };

  // Handle copy confirmation (target and options come from the copy dialog)
  // The copy runs in the background on the server (202 + jobId); the dialog stays open and polls the job.
  const handleCopyConfirm = (payload: CopyPayload, targetFolder: ContractFolder) => {
    duplicateContractDir(payload, {
      onSuccess: (response: any) => {
        const jobId: string | undefined = response?.data?.jobId;
        if (!jobId) {
          showNotifError({ message: t($ => $.contractManagement.rootFolderSelector.copyError) || "Failed to copy data" });
          return;
        }
        setCopyJob({ jobId, payload, targetFolder });
      },
      onError: (error: any) => {
        // 409: a copy to this folder is already running (message from the server)
        showNotifError({ message: error?.response?.data?.message ?? error?.message ?? (t($ => $.contractManagement.rootFolderSelector.copyError) || "Failed to copy data") });
      }
    });
  };

  // Add state for copy confirmation
  const [copyConfirmationModal, setCopyConfirmationModal] = useState<{
    sourceFolder: ContractFolder;
    targetFolder: ContractFolder;
  } | null>(null);

  // Background copy job being polled (null when no copy is running)
  const [copyJob, setCopyJob] = useState<{ jobId: string; payload: CopyPayload; targetFolder: ContractFolder } | null>(null);
  const { data: copyJobStatus, error: copyJobError } = useCopyPbStatus(copyJob?.jobId ?? null);

  useEffect(() => {
    if (!copyJob) return;
    if (copyJobStatus?.status === 'completed') {
      const copied: number[] = copyJobStatus.data?.scoreCopiedCategories ?? [];
      const scoreInfo = copyJob.payload.copyScores
        ? (copied.length > 0 ? ` Skor kategori ${copied.join(', ')} ikut disalin.` : '')
        : ' Skor tujuan tidak diubah.';
      const noteInfo = (copyJob.payload.copyUserNotes || copyJob.payload.copyContractorNotes) && (copyJobStatus.data?.noteCopiedCategories?.length ?? 0) > 0
        ? ' Catatan ikut disalin.'
        : '';
      const failed = copyJobStatus.data?.failedFiles?.length ?? 0;
      const failedInfo = failed > 0 ? ` ${failed} berkas gagal disalin.` : '';
      showNotifSuccess({ message: `${t($ => $.contractManagement.rootFolderSelector.copySuccess) || "Data copied successfully"}.${scoreInfo}${noteInfo}${failedInfo}` });
      const target = copyJob.targetFolder;
      setCopyJob(null);
      setCopyConfirmationModal(null);
      refreshFolders();
      // Automatically switch selection to the target folder to show copied files
      handleSelectRootFolder(target);
    } else if (copyJobStatus?.status === 'failed' || copyJobError) {
      const message = copyJobStatus?.status === 'failed'
        ? copyJobStatus.message
        : ((copyJobError as any)?.response?.data?.message ?? (copyJobError as any)?.message);
      showNotifError({ message: message || (t($ => $.contractManagement.rootFolderSelector.copyError) || "Failed to copy data") });
      setCopyJob(null);
      refreshFolders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyJob, copyJobStatus, copyJobError]);

  const isFolderPSB = (folderName: string): boolean => {
    return folderName.endsWith(' - PSB');
  };

  // Helper function to get a more descriptive title from folder name
  const getFolderTitle = (folderName: string): string => {
    // check if it's PSB
    if (isFolderPSB(folderName)) {
      return ('PENILAIAN SEBELUM BERJALAN')
    }
    // Check if it's an assessment folder (PB or PA)
    else if (folderName.endsWith(' - PB') || folderName.endsWith(' - PA')) {
      // Extract date from folder name (first 10 characters: DD-MM-YYYY)
      const folderDateStr = folderName.substring(0, 10);
      const [day, month, year] = folderDateStr.split('-');

      // Convert to date object
      const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Get semester information
      const folderYear = folderDate.getFullYear();
      const folderMonth = folderDate.getMonth();

      // Check if it's a final assessment (PA)
      if (folderName.endsWith(' - PA')) {
        return `PENILAIAN AKHIR ${folderYear}`;
      }

      // Determine semester
      // Semester I: January - June
      // Semester II: July - December
      if (folderMonth < 6) {
        return `PENILAIAN BERJALAN SEMESTER I ${folderYear}`;
      } else {
        return `PENILAIAN BERJALAN SEMESTER II ${folderYear}`;
      }
    }

    // For non-assessment folders, return the original name
    return folderName;
  };

  const isFolderDokumenEvaluasi = (folderName: string): boolean => {
    return folderName === 'DOKUMEN EVALUASI';
  };

  return (
    <div className='flex flex-col gap-4'>
      <AiModeDialog
        open={!!aiElementTarget}
        onOpenChange={(open) => !open && setAiElementTarget(null)}
        targetLabel={aiElementTarget?.name ?? ''}
        elementCount={aiElementTarget ? Math.max(1, countElements(aiElementTarget)) : 0}
        onConfirm={(choice) => aiElementTarget && startAiElement(aiElementTarget, choice)}
      />
      <AiApplyDialog
        folderId={aiApplyTarget?.id ?? null}
        scopeLabel={aiApplyTarget ? `Kategori ${aiApplyTarget.name}` : ''}
        open={!!aiApplyTarget}
        onOpenChange={(open) => !open && setAiApplyTarget(null)}
        onApplied={refreshFolders}
      />
      <RootFolderSelector
        folders={folders}
        selectedRootFolder={selectedRootFolder}
        onSelectRootFolder={handleSelectRootFolder}
        onCopyFolder={handleCopyFolder} // Pass the copy function as prop
        onCompleteFolder={(folder: ContractFolder) => setCompleteFolderModal({ folder })} // Pass the complete folder function as prop
        refreshFolders={refreshFolders} // Pass the refresh function as prop
        usersData={usersData}
        isLoadingUsers={isLoadingUsers}
        aiEvaluationProgress={aiEvaluationProgress}
        onStatusChange={handleStatusChange}
      />

      {/* Table toolbar: Quick Scoring on left, zip & expand on right */}
      <div className="flex justify-between items-center pt-2 gap-2">
        <div>
          {isAdminOrUser(user) && selectedRootFolder && !selectedRootFolder.isFinal && !isFolderDokumenEvaluasi(selectedRootFolder.name) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuickScoringOpen(true)}
              className="flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary transition-all font-semibold shadow-xs"
            >
              <Zap className="h-4 w-4 text-primary fill-primary/20" />
              Quick Scoring
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showExportToZip() && <Button
            variant="outline"
            size="sm"
            onClick={handleExportFolderAsZip}
            disabled={!selectedRootFolderId || isExportingZip}
            className="flex items-center gap-2"
          >
            {isExportingZip ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t($ => $.contractManagement.rootFolderSelector.exporting)}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.exportZip)}
              </>
            )}
          </Button>}

          <Button
            variant="outline"
            size="sm"
            onClick={expandedFolders.size > 0 ? collapseAllFolders : expandAllFolders}
            disabled={!selectedRootFolderId}
            className="flex items-center gap-2"
          >
            {expandedFolders.size > 0 ? (
              <>
                <ChevronRight className="h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.collapseAll)}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.expandAll)}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Folder content table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t($ => $.contractManagement.name)}</TableHead>
              <TableHead>{t($ => $.contractManagement.updatedAt)}</TableHead>
              {!isFolderDokumenEvaluasi(selectedRootFolder?.name || '') && <>
                <TableHead>{t($ => $.contractManagement.status)}</TableHead>
                <TableHead>{t($ => $.contractManagement.score)}</TableHead>
                <TableHead>{t($ => $.contractManagement.note)}</TableHead>
                <TableHead>{t($ => $.contractManagement.actions)}</TableHead>
              </>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedRootFolder ? (
              <>
                {/* Render the selected root folder */}
                <TableRow>
                  <TableCell>
                    <div className="flex items-center">
                      {selectedRootFolder.children && selectedRootFolder.children.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-2 h-6 w-6 p-0"
                          onClick={() => toggleFolder(selectedRootFolder.id)}
                        >
                          {expandedFolders.has(selectedRootFolder.id) ?
                            <ChevronDown className="h-4 w-4" /> :
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      ) : (
                        <div className="mr-2 h-6 w-6" />
                      )}
                      <Folder className="h-4 w-4 text-yellow-500 mr-2" />
                      <span className="font-bold">{selectedRootFolder.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {selectedRootFolder.updatedAt ? new Date(selectedRootFolder.updatedAt).toLocaleString() : 'N/A'}
                  </TableCell>
                  {!isFolderDokumenEvaluasi(selectedRootFolder?.name) &&
                    <>
                      <TableCell>
                        {aiEvaluationProgress[selectedRootFolder.id] &&
                        (aiEvaluationProgress[selectedRootFolder.id].status === 'processing' ||
                          aiEvaluationProgress[selectedRootFolder.id].status === 'triggered') ? (
                          <CircularProgress value={getProgressPercentage(aiEvaluationProgress[selectedRootFolder.id].progressMessage)} size={26} />
                        ) : (
                          null
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {selectedRootFolder.score !== undefined ? selectedRootFolder.score : isFolderPSB(selectedRootFolder.name) ? '' : 'N/A'}
                          {(() => {
                            const computedRootAiScore = getAiScore(selectedRootFolder);
                            if (computedRootAiScore !== null && computedRootAiScore !== -1) {
                              return (
                                <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 px-1.5 py-0.5 rounded w-max">
                                  AI: {computedRootAiScore % 1 === 0 ? Math.floor(computedRootAiScore) : computedRootAiScore}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* {selectedRootFolder.note || ''} */}
                      </TableCell>
                      <TableCell>
                        {(selectedRootFolder?.isFinal ?? false) ? <div></div> : <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Ellipsis className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              {selectedRootFolder.name.endsWith(' - PSB') &&
                                <DropdownMenuItem
                                  onClick={() => {
                                    setIsDropdownOpen(false);
                                    handleUploadFileClick(selectedRootFolder);
                                  }}
                                >
                                  <FileUp className="mr-2 h-4 w-4" />
                                  <span>{t($ => $.contractManagement.uploadFile)}</span>
                                </DropdownMenuItem>}
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  handleCreateSubfolderClick(selectedRootFolder);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>{t($ => $.contractManagement.createSubfolder.title)}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  handleEditDescriptionClick(selectedRootFolder);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>{t($ => $.contractManagement.editDescription)}</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>

                            {(isFolderPSB(selectedRootFolder.name) && isAdminOrUser(user)) &&
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-primary"
                                  onClick={() => {
                                    handleChangeRatingClick(selectedRootFolder, false);
                                  }}
                                >
                                  <MdOutlineAssessment className="mr-2 h-4 w-4" />
                                  <span>{t($ => $.contractManagement.changeRating)}</span>
                                </DropdownMenuItem>
                              </>}

                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  handleDeleteFolderClick(selectedRootFolder);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t($ => $.contractManagement.deleteFolder)}</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>}
                      </TableCell>
                    </>}
                </TableRow>

                {/* Render children if expanded */}
                {expandedFolders.has(selectedRootFolder.id) && selectedRootFolder.children && selectedRootFolder.children.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <Table data-tour="folder-tree">
                        <TableBody>
                          {isFolderDokumenEvaluasi(selectedRootFolder?.name) ?
                            <FolderTreeEvaluation
                              isFinal={selectedRootFolder?.isFinal ?? false}
                              folders={selectedRootFolder.children || []}
                              expandedFolders={expandedFolders}
                              onToggleFolder={toggleFolder}
                              onViewFile={handleViewFile}
                            /> :
                            <FolderTree
                              isFinal={selectedRootFolder?.isFinal ?? false}
                              folders={selectedRootFolder.children || []}
                              expandedFolders={expandedFolders}
                              onToggleFolder={toggleFolder}
                              onDeleteFolder={handleDeleteFolderClick}
                              onCreateSubfolder={handleCreateSubfolderClick}
                              onEditFolder={handleEditFolderClick}
                              onUploadFile={handleUploadFileClick}
                              onDeleteFile={handleDeleteFile}
                              onEditFile={handleEditFile}
                              onChangeRating={handleChangeRatingClick}
                              onViewFile={handleViewFile}
                              onChangeNote={handleChangeNoteClick}
                              aiActiveProgress={aiActiveProgress}
                              onEvaluateAi={handleEvaluateAiElement}
                              aiChangedIds={aiChangedIds}
                              onApplyAiCategory={setAiApplyTarget}
                              onDropFiles={handleDropFiles}
                            />}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}

              </>
            ) : folders.length > 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t($ => $.contractManagement.selectFolderMessage)}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t($ => $.contractManagement.noFoldersMessage)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Assessment Date Modal */}
      {editAssessmentDateModal && (
        <DialogModalForm
          modal={editAssessmentDateModal}
          onDismissOutside={false}
        />
      )}

      {/* Create Subfolder Modal */}
      {createSubfolderModal && (
        <DialogModalForm
          modal={createSubfolderModal}
          onDismissOutside={false}
        />
      )}

      {/* Edit Description Modal */}
      {editDescriptionModal && (
        <DialogModalForm
          modal={editDescriptionModal}
          onDismissOutside={false}
        />
      )}

      {/* Delete Folder Modal */}
      {deleteFolderModal && (
        <DialogModalForm
          modal={deleteFolderModal}
          onDismissOutside={false}
        />
      )}

      {/* Delete File Modal */}
      {deleteFileModal && (
        <DialogModalForm
          modal={deleteFileModal}
          onDismissOutside={false}
        />
      )}

      {/* Edit File Modal */}
      {editFileModal && (
        <DialogModalForm
          modal={editFileModal}
          onDismissOutside={false}
        />
      )}

      {/* Change Rating Modal */}
      {changeRatingModal && (
        <DialogModalForm
          modal={changeRatingModal}
          onDismissOutside={false}
        />
      )}

      {changeNoteModal && (
        <DialogModalForm
          modal={changeNoteModal}
          onDismissOutside={false}
        />
      )}

      {/* Edit Folder Modal */}
      {editFolderModal && (
        <DialogModalForm
          modal={editFolderModal}
          onDismissOutside={false}
        />
      )}

      {/* Upload File Modal */}
      {uploadFileModal && (
        <DialogModalForm
          modal={uploadFileModal}
          onDismissOutside={false}
        />
      )}

      <DropUploadDialog
        request={dropUploadRequest}
        onCancel={() => setDropUploadRequest(null)}
        onConfirm={handleDropUploadConfirm}
      />

      {/* Copy dialog: any target period, optional scores per category */}
      {copyConfirmationModal && (
        <CopyPBDialog
          source={copyConfirmationModal.sourceFolder}
          initialTarget={copyConfirmationModal.targetFolder}
          folders={folders}
          isPending={isDuplicateLoading || !!copyJob}
          progress={copyJob ? (copyJobStatus?.progress ?? { done: 0, total: 0 }) : null}
          onCancel={() => setCopyConfirmationModal(null)}
          onConfirm={handleCopyConfirm}
        />
      )}

      {/* Finalize Folder Confirmation Dialog */}
      {completeFolderModal && (() => {
        const checkHasFileRecursively = (f: ContractFolder): boolean => {
          if (!f.children || f.children.length === 0) return false;
          return f.children.some(child => 
            child.fileType === 'file' || (child.fileType === 'folder' && checkHasFileRecursively(child))
          );
        };

        const getMissingFolders = (rootFolder: ContractFolder): string[] => {
          const missing: string[] = [];

          if (rootFolder.name.endsWith(' - PSB')) {
            if (!checkHasFileRecursively(rootFolder)) {
              missing.push(rootFolder.name);
            }
            return missing;
          }

          const allChildren = rootFolder.children || [];
          const rencanaK3LL = allChildren.find(c => c.name === 'A. RENCANA K3LL');
          const sourceChildren = (rencanaK3LL && rencanaK3LL.children && rencanaK3LL.children.length > 0)
            ? rencanaK3LL.children
            : allChildren;

          const elements = sourceChildren
            .filter(c => c.fileType === 'folder' && /^([1-8])\s/.test(c.name))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

          if (elements.length === 0) {
            missing.push('A. RENCANA K3LL (Struktur Belum Dibuat)');
            return missing;
          }

          for (const el of elements) {
            const subfolders = (el.children || [])
              .filter(c => c.fileType === 'folder' && /^[1-8]\.\d+/.test(c.name))
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            if (subfolders.length > 0) {
              for (const sf of subfolders) {
                if (!checkHasFileRecursively(sf)) {
                  missing.push(sf.name);
                }
              }
            } else {
              if (!checkHasFileRecursively(el)) {
                missing.push(el.name);
              }
            }
          }

          return missing;
        };

        const missingFolders = getMissingFolders(completeFolderModal.folder);
        const hasMissing = missingFolders.length > 0;

        return (
          <AlertDialog open={!!completeFolderModal} onOpenChange={() => setCompleteFolderModal(null)}>
            <AlertDialogContent className="max-w-xl">
              <AlertDialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {hasMissing ? (
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <Lock className="h-5 w-5" />
                    </div>
                  )}
                  <AlertDialogTitle className="text-lg font-bold">
                    {hasMissing ? "Berkas Penilaian Belum Lengkap" : t($ => $.contractManagement.rootFolderSelector.finalizeConfirmationTitle)}
                  </AlertDialogTitle>
                </div>

                {hasMissing ? (
                  <div className="space-y-3 pt-2 text-sm text-foreground">
                    <p className="text-muted-foreground">
                      Folder <span className="font-semibold text-foreground">{completeFolderModal.folder.name}</span> belum dapat difinalisasi karena masih terdapat folder/subfolder wajib yang belum terisi file minimal 1 berkas:
                    </p>
                    <div className="max-h-52 overflow-y-auto rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5 text-left">
                      {missingFolders.map((name, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Silakan unggah berkas yang diperlukan ke dalam masing-masing folder di atas sebelum melakukan finalisasi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 text-sm">
                    <p className="text-muted-foreground">
                      {t($ => $.contractManagement.rootFolderSelector.finalizeConfirmationDescription, {
                        folder: completeFolderModal.folder.name
                      })}
                    </p>
                    <div className="p-3.5 rounded-lg border-2 border-red-500/50 bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-200 space-y-1.5 text-left">
                      <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                        <Lock className="h-4 w-4" />
                        <span>PERINGATAN PENTING: BERKAS AKAN DIKUNCI PERMANEN</span>
                      </div>
                      <p className="text-xs leading-relaxed font-semibold">
                        Setelah difinalisasi, seluruh berkas dan folder penilaian ini akan <u>dikunci secara permanen</u>. 
                        Anda <u>tidak akan dapat menambah file baru, mengubah file, ataupun menghapus file dan folder</u> di dalam penilaian ini lagi.
                      </p>
                    </div>
                  </div>
                )}
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-2">
                <AlertDialogCancel onClick={() => setCompleteFolderModal(null)}>
                  {hasMissing ? "Tutup" : t($ => $.shared.cancel)}
                </AlertDialogCancel>
                {!hasMissing && (
                  <AlertDialogAction
                    onClick={() => {
                      handleCompleteFolder(completeFolderModal.folder.id);
                      setCompleteFolderModal(null);
                    }}
                    className="bg-primary hover:bg-primary/90 font-semibold"
                  >
                    {t($ => $.shared.confirm)}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

      {/* Quick Scoring Modal */}
      {isQuickScoringOpen && (
        <QuickScoringModal
          isOpen={isQuickScoringOpen}
          onClose={() => setIsQuickScoringOpen(false)}
          selectedRootFolder={selectedRootFolder}
          refreshFolders={refreshFolders}
        />
      )}
    </div>
  );
};
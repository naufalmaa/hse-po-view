import React from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { Lock, CheckCircle, Clock, Copy, XCircle, Loader2, ArrowUp, ArrowDown, CalendarRange } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { getFolderTitle, isAssessmentFolder, isPBFolder, isPAFolder, getFolderDateDisplay } from './utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { isAdmin } from '@/types/auth';
import { getCopyTargets, getNeighbourTarget } from '../copy-pb-utils';

// Re-opened by an admin and not finalized again yet
const isReopened = (folder: ContractFolder): boolean => {
  if (folder.isFinal) return false;
  const level = folder.approvalStatus?.currentApprovalLevel;
  const history = level ? folder.approvalStatus?.approvalHistory?.[level] : undefined;
  return !!history && history.length > 0 && history[history.length - 1].status === 'reopened';
};

// Holds files copied from another period
const hasCopiedContent = (folder: ContractFolder): boolean =>
  (folder.children ?? []).some((c) => c.isCopy === 1 || c.isCopy === 2);

interface FolderNavigationProps {
  folders: ContractFolder[];
  selectedRootFolder: ContractFolder | null;
  onSelectRootFolder: (folder: ContractFolder) => void;
  onCopyFolder?: (sourceFolder: ContractFolder, targetFolder: ContractFolder) => void;
  aiEvaluationProgress?: Record<string, { status: string; progressMessage?: string }>;
}

export const FolderNavigation: React.FC<FolderNavigationProps> = ({
  folders,
  selectedRootFolder,
  onSelectRootFolder,
  onCopyFolder,
  aiEvaluationProgress
}) => {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const canCopy = isAdmin(auth?.user) && !!onCopyFolder;

  // Check if the folder assessment has been rejected
  const isFolderRejected = (folder: ContractFolder): boolean => {
    if (!folder.approvalStatus || !folder.approvalStatus.approvalHistory || !folder.approvalStatus.currentApprovalLevel) return false;
    const approvalHistory = folder.approvalStatus.approvalHistory;
    const currentLevel = folder.approvalStatus.currentApprovalLevel;

    // Check the current approval level for rejection
    const history = approvalHistory[currentLevel];
    if (history && history.length > 0) {
      const lastItem = history[history.length - 1];
      return lastItem.status.toLowerCase() === 'rejected';
    }
    return false;
  };

  const handleCopyClick = (sourceFolder: ContractFolder, targetFolder: ContractFolder) => {
    if (onCopyFolder) {
      onCopyFolder(sourceFolder, targetFolder);
    }
  };

  return (
    <div className="md:w-1/2">
      <div className="bg-muted rounded-lg p-3 h-full overflow-y-auto">
        <nav className="space-y-2" aria-label={t($ => $.contractManagement.rootFolderSelector.folderNavigation)}>
          {folders.map((folder) => {
            const isEnabled = folder?.isEnabled ?? false;
            const displayTitle = getFolderTitle(folder.name);
            const folderDate = getFolderDateDisplay(folder.name, folder.assessmentDate);
            const isSelected = selectedRootFolder?.id === folder.id;
            const isAssessment = isAssessmentFolder(folder.name);

            // Default copy targets: the neighbouring periods; any other period can be picked in the dialog
            const prevFolder = getNeighbourTarget(folders, folder.id, 'prev');
            const nextFolder = getNeighbourTarget(folders, folder.id, 'next');
            const otherTargets = getCopyTargets(folders, folder.id);

            return (
              <button
                key={folder.id}
                onClick={() => isEnabled && onSelectRootFolder(folder)}
                disabled={!isEnabled}
                className={`
                  w-full text-left px-3 py-2.5 text-sm font-medium rounded-md transition-all
                  flex items-center justify-between
                  ${isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                  ${!isEnabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex flex-col min-w-0 text-left">
                  <span className="truncate">{displayTitle}</span>
                  {(isReopened(folder) || (isAssessment && hasCopiedContent(folder))) && (
                    <span className="flex gap-1 mt-1">
                      {isReopened(folder) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" data-testid="badge-reopened">
                          Dibuka ulang
                        </span>
                      )}
                      {isAssessment && hasCopiedContent(folder) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                          Berisi salinan
                        </span>
                      )}
                    </span>
                  )}
                  {folderDate && (
                    <span className={`text-xs mt-0.5 ${
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {folderDate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {aiEvaluationProgress?.[folder.id] &&
                  (aiEvaluationProgress[folder.id].status === 'processing' ||
                    aiEvaluationProgress[folder.id].status === 'triggered') ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${isSelected ? 'text-primary-foreground' : 'text-purple-500'}`} />
                  ) : (
                    <>
                      {isAssessment && (
                        <>
                          {folder.isComplete ? (
                            <div className='flex flex-row gap-4'>
                              {canCopy && otherTargets.length > 0 && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className={`p-1 rounded-md transition-colors hover:bg-black/10 outline-none flex items-center justify-center ${
                                        isSelected 
                                          ? 'text-primary-foreground hover:bg-white/10' 
                                          : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-72">
                                    {prevFolder && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyClick(folder, prevFolder);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <ArrowUp className="mr-2 h-4 w-4 text-orange-500" />
                                        <span>Salin ke {getFolderTitle(prevFolder.name)}</span>
                                        {prevFolder.isFinal && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                                      </DropdownMenuItem>
                                    )}
                                    {nextFolder && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyClick(folder, nextFolder);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <ArrowDown className="mr-2 h-4 w-4 text-blue-500" />
                                        <span>Salin ke {getFolderTitle(nextFolder.name)}</span>
                                        {nextFolder.isFinal && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                                      </DropdownMenuItem>
                                    )}
                                    {(prevFolder || nextFolder) && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyClick(folder, nextFolder ?? prevFolder ?? otherTargets[0]);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                                      <span>Salin ke periode lain…</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {isFolderRejected(folder) ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          ) : (isEnabled ?
                            <Clock className="h-4 w-4 text-yellow-500" /> : null
                          )}
                        </>
                      )}
                    </>
                  )}
                  {!isEnabled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
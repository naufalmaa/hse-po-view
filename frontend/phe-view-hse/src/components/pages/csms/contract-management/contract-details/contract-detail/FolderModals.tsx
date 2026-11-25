import React from 'react';
import { DialogModalForm } from '@/components/custom/components';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppTranslation } from "@/lib/i18n-typed";
import { ContractFolder } from '@/service/csms/folder-detail';
import { AlertTriangle, Lock } from 'lucide-react';

interface FolderModalsProps {
  editAssessmentDateModal: any;
  createSubfolderModal: any;
  editDescriptionModal: any;
  deleteFolderModal: any;
  deleteFileModal: any;
  editFileModal: any;
  changeRatingModal: any;
  editFolderModal: any;
  uploadFileModal: any;
  copyConfirmationModal: {
    sourceFolder: ContractFolder;
    targetFolder: ContractFolder;
  } | null;
  completeFolderModal: {
    folder: ContractFolder;
  } | null;
  isDuplicateLoading: boolean;
  setCopyConfirmationModal: (modal: {
    sourceFolder: ContractFolder;
    targetFolder: ContractFolder;
  } | null) => void;
  handleCopyConfirm: () => void;
  setCompleteFolderModal: (modal: {
    folder: ContractFolder;
  } | null) => void;
  handleCompleteFolder: (folderId: string) => void;
  getFolderTitle: (folderName: string) => string;
}

export const FolderModals: React.FC<FolderModalsProps> = ({
  editAssessmentDateModal,
  createSubfolderModal,
  editDescriptionModal,
  deleteFolderModal,
  deleteFileModal,
  editFileModal,
  changeRatingModal,
  editFolderModal,
  uploadFileModal,
  copyConfirmationModal,
  completeFolderModal,
  isDuplicateLoading,
  setCopyConfirmationModal,
  handleCopyConfirm,
  setCompleteFolderModal,
  handleCompleteFolder,
  getFolderTitle
}) => {
  const { t } = useAppTranslation();

  return (
    <>
      {/* Edit Assessment Date Modal */}
      {editAssessmentDateModal && <DialogModalForm modal={editAssessmentDateModal} />}

      {/* Create Subfolder Modal */}
      {createSubfolderModal && <DialogModalForm modal={createSubfolderModal} />}

      {/* Edit Description Modal */}
      {editDescriptionModal && <DialogModalForm modal={editDescriptionModal} />}

      {/* Delete Folder Modal */}
      {deleteFolderModal && <DialogModalForm modal={deleteFolderModal} />}

      {/* Delete File Modal */}
      {deleteFileModal && <DialogModalForm modal={deleteFileModal} />}

      {/* Edit File Modal */}
      {editFileModal && <DialogModalForm modal={editFileModal} />}

      {/* Change Rating Modal */}
      {changeRatingModal && <DialogModalForm modal={changeRatingModal} />}

      {/* Edit Folder Modal */}
      {editFolderModal && <DialogModalForm modal={editFolderModal} />}

      {/* Upload File Modal */}
      {uploadFileModal && <DialogModalForm modal={uploadFileModal} />}

      {/* Copy Confirmation Modal */}
      {copyConfirmationModal && (
        <AlertDialog open={!!copyConfirmationModal} onOpenChange={() => setCopyConfirmationModal(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t($ => $.contractManagement.rootFolderSelector.copyConfirmationTitle)}</AlertDialogTitle>
              <AlertDialogDescription>
                {t($ => $.contractManagement.rootFolderSelector.copyConfirmationDescription)
                  .replace('{{source}}', getFolderTitle(copyConfirmationModal.sourceFolder.name))
                  .replace('{{target}}', getFolderTitle(copyConfirmationModal.targetFolder.name))}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t($ => $.shared.cancel)}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCopyConfirm}
                disabled={isDuplicateLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isDuplicateLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    {t($ => $.contractManagement.rootFolderSelector.copyInProgress)}
                  </>
                ) : (
                  t($ => $.shared.copy)
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Complete Folder Modal */}
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
                    {hasMissing ? "Berkas Penilaian Belum Lengkap" : t($ => $.contractManagement.rootFolderSelector.completeConfirmationTitle)}
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
                      {t($ => $.contractManagement.rootFolderSelector.completeConfirmationDescription).replace('{{folder}}', completeFolderModal.folder.name)}
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
    </>
  );
};
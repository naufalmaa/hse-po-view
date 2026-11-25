import React, { useState } from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { User, ListUsersResponse } from '@/service/user-api';
import { useAppTranslation } from "@/lib/i18n-typed";
import { useAuditor } from '@/service/csms/folder-auditor';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showNotifError } from '@/lib/show-notif';

interface AuditorSectionProps {
  selectedRootFolder: ContractFolder | null;
  usersData: ListUsersResponse | undefined;
  isLoadingUsers: boolean;
  canManageAuditors: boolean;
  refreshFolders?: () => void;
}

export const AuditorSection: React.FC<AuditorSectionProps> = ({
  selectedRootFolder,
  usersData,
  isLoadingUsers,
  canManageAuditors,
  refreshFolders
}) => {
  const { t } = useAppTranslation();
  const [isAddAuditorDialogOpen, setIsAddAuditorDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteAuditorDialog, setDeleteAuditorDialog] = useState<{ isOpen: boolean; auditorId: string | null; auditorName: string | null }>({ isOpen: false, auditorId: null, auditorName: null });
  const auditorMutation = useAuditor();

  // Filter out users who are already auditors for this folder
  const availableUsers = usersData?.data?.filter((user: any) => {
    if (!selectedRootFolder?.auditorNames) return true;
    return !selectedRootFolder.auditorNames.some(auditor => auditor.id === user.id);
  }) || [];

  // Handler for adding an auditor
  const handleAddAuditor = (user: User) => {
    if (!selectedRootFolder) return;

    auditorMutation.mutate({
      contractId: selectedRootFolder.contractId,
      userId: user.id,
      folderId: selectedRootFolder.id,
      action: 'add'
    }, {
      onSuccess: () => {
        setIsAddAuditorDialogOpen(false);
        setSearchTerm("");
        // Refresh the folder data to update the UI with the new auditor
        if (refreshFolders) {
          refreshFolders();
        }
      },
      onError: (error) => {
        console.error("Failed to add approval:", error);
        // TODO: Show error message to user
      }
    });
  };

  // Handler for opening the delete auditor confirmation dialog
  const handleOpenDeleteAuditorDialog = (auditorId: string, auditorName: string) => {
    setDeleteAuditorDialog({ isOpen: true, auditorId: auditorId, auditorName });
  };

  // Handler for closing the delete auditor confirmation dialog
  const handleCloseDeleteAuditorDialog = () => {
    setDeleteAuditorDialog({ isOpen: false, auditorId: null, auditorName: null });
  };

  // Handler for confirming the deletion of an auditor
  const handleConfirmDeleteAuditor = () => {
    if (!selectedRootFolder || !deleteAuditorDialog.auditorId) return;

    auditorMutation.mutate({
      contractId: selectedRootFolder.contractId,
      userId: deleteAuditorDialog.auditorId,
      folderId: selectedRootFolder.id,
      action: 'remove'
    }, {
      onSuccess: () => {
        handleCloseDeleteAuditorDialog();
        // Refresh the folder data to update the UI after removing the auditor
        if (refreshFolders) {
          refreshFolders();
        }
      },
      onError: (error) => {
        handleCloseDeleteAuditorDialog();
        showNotifError({ message: "Failed to remove auditor" });
      }
    });
  };

  return (
    <>
      <div className="rounded-md bg-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t($ => $.contractManagement.rootFolderSelector.auditors)}
            </span>
          </div>
          {/* Conditionally render the add auditor button based on user role */}
          {canManageAuditors && (
            <Dialog open={isAddAuditorDialogOpen} onOpenChange={setIsAddAuditorDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                  disabled={!selectedRootFolder}
                >
                  <Plus className="h-4 w-4 text-purple-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>{t($ => $.contractManagement.rootFolderSelector.addAuditor)}</DialogTitle>
                </DialogHeader>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t($ => $.contractManagement.rootFolderSelector.searchAuditor)}
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingUsers
                        ? t($ => $.contractManagement.rootFolderSelector.loadingUsers)
                        : t($ => $.contractManagement.rootFolderSelector.noUserFound)
                      }
                    </CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-60">
                        {availableUsers.map((user: any) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => handleAddAuditor(user)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-sm text-muted-foreground">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="mt-1 ml-4">
          {selectedRootFolder?.auditorNames && selectedRootFolder.auditorNames.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedRootFolder.auditorNames.map((approval) => (
                <span
                  key={approval.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200"
                >
                  {approval.name}
                  {/* Conditionally render the delete auditor button based on user role */}
                  {canManageAuditors && (
                    <button
                      onClick={() => handleOpenDeleteAuditorDialog(approval.id, approval.name)}
                      className="ml-1 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
                      disabled={auditorMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t($ => $.contractManagement.rootFolderSelector.noAuditorsAssigned)}
            </p>
          )}
        </div>
      </div>

      {/* Conditionally render the delete auditor confirmation dialog based on user role */}
      {canManageAuditors && (
        <AlertDialog open={deleteAuditorDialog.isOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDeleteAuditorDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t($ => $.contractManagement.rootFolderSelector.deleteAuditorConfirmationTitle)}</AlertDialogTitle>
              <AlertDialogDescription>
                {t($ => $.contractManagement.rootFolderSelector.deleteAuditorConfirmationDescription, { auditorName: deleteAuditorDialog.auditorName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDeleteAuditorDialog}>
                {t($ => $.shared.cancel)}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteAuditor} className="bg-destructive hover:bg-destructive/90">
                {t($ => $.shared.delete)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
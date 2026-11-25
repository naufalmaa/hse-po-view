import { useEffect, useState } from 'react';
import { useAppTranslation } from '@/lib/i18n-typed';
import { useContracts, ListContractsResult } from '@/service/csms/contracts';
import { useSubmitApproval } from '@/service/csms/submit-approval';
import { useAuth } from '@/hooks/use-auth';
import { FolderCard } from '@/components/pages/csms/contracts/contract-list';
import {
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';
import { DataTablePagination } from '@/components/custom/table/data-table-pagination';

interface PendingTabProps {
  page: number;
  view: number;
  onPaginationChange: (page: number, view: number) => void;
  onActionSuccess?: () => void;
  onLoadSuccess?: (metrics: any) => void;
}

export function PendingTab({ page, view, onPaginationChange, onActionSuccess, onLoadSuccess }: PendingTabProps) {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const currentUser = {
    name: auth.user?.user?.name || 'User',
    role: auth.user?.user?.role || 'evaluator',
  };

  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; folderId: string; contractId: string; folderName?: string; status: 'approve' | 'reject'; note: string }>({ open: false, folderId: '', contractId: '', status: 'approve', note: '' });

  const {
    mutate: listContracts,
    data: contractsData,
    isPending: isLoading,
    isError,
    error
  } = useContracts();

  useEffect(() => {
    listContracts({
      search: "",
      subContractorId: [],
      sort: "createdAt",
      order: "asc",
      status: 'waiting',
      page: page,
      view: view,
    });
  }, [listContracts, page, view]);

  useEffect(() => {
    if (contractsData?.approvalMetrics) {
      onLoadSuccess?.(contractsData.approvalMetrics);
    }
  }, [contractsData, onLoadSuccess]);

  const contracts = (contractsData?.data || []) as ListContractsResult[];

  const pendingForUser = contracts.flatMap(c =>
    (c.nearestOngoingAssessmentDate || []).flatMap(a =>
      (a.folderInfo || []).map(f => ({
        ...f,
        contractId: c.id,
        projectInfo: {
          contractTitle: c.title,
          contractorName: c.contractorName || '',
          numberContract: c.numberContract
        }
      }))
    )
  )

  const { mutate: submitApproval, isPending: isApproving } = useSubmitApproval();

  const handleApprove = (folderId: string, contractId: string, folderName?: string) => {
    setApprovalDialog({ open: true, folderId, contractId, folderName, status: 'approve', note: '' });
  };

  const handleReject = (folderId: string, contractId: string, folderName?: string) => {
    setApprovalDialog({ open: true, folderId, contractId, folderName, status: 'reject', note: '' });
  };

  const confirmAction = () => {
    const { folderId, contractId, status, note } = approvalDialog;
    submitApproval(
      { folderId, contractId, status: status === 'approve' ? 'approved' : 'rejected', note },
      {
        onSuccess: (response) => {
          if (response.success) {
            const successMessage = status === 'approve'
              ? t($ => $.contractList.folderApprovedSuccessfully)
              : t($ => $.contractList.folderRejectedSuccessfully);
            const description = status === 'approve'
              ? t($ => $.contractList.youHaveApprovedThisAssessment, { role: currentUser.role })
              : t($ => $.contractList.youHaveRejectedThisAssessment, { role: currentUser.role });

            showNotifSuccess({ message: successMessage, description: description })

            // Refresh data
            listContracts({
              search: "",
              subContractorId: [],
              sort: "createdAt",
              order: "asc",
              status: 'waiting',
              page: 0,
              view: view,
            });
            onActionSuccess?.();
          } else {
            const failureMessage = status === 'approve'
              ? t($ => $.contractList.approvalFailed)
              : t($ => $.contractList.rejectionFailed);

            showNotifError({ message: failureMessage, description: response.message })
          }
        },
        onError: (error: any) => {
          const errorMessage = status === 'approve'
            ? t($ => $.contractList.approvalFailed)
            : t($ => $.contractList.rejectionFailed);

          showNotifError({ message: errorMessage, description: error.message || t($ => $.contractList.unexpectedErrorOccurred) })
        }
      }
    );
    setApprovalDialog({ open: false, folderId: '', contractId: '', status: 'approve', note: '' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>{t($ => $.contractList.loadingContracts)}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
        <p>{error instanceof Error ? error.message : t($ => $.contractList.unexpectedErrorOccurred)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingForUser.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">{t($ => $.contractList.allCaughtUp)}</h3>
          <p className="text-muted-foreground">{t($ => $.contractList.noFoldersPendingApproval)}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingForUser.map((folder) => (
            <FolderCard
              key={folder.folderId}
              folder={folder}
              currentUserRole={currentUser.role}
              projectInfo={folder.projectInfo}
              onApprove={(folderId) => handleApprove(folderId, folder.contractId, folder.folderName)}
              onReject={(folderId) => handleReject(folderId, folder.contractId, folder.folderName)}
            />
          ))}
        </div>
      )}

      {contractsData?.meta && contractsData.meta.totalPages > 1 && (
        <div className="flex justify-center mt-8 px-4">
          <DataTablePagination
            pageIndex={page}
            setPageIndex={(index) => onPaginationChange(index, view)}
            pageSize={view}
            setPageSize={(size) => onPaginationChange(0, size)}
            rowsCount={contractsData.meta.total}
          />
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={approvalDialog.open} onOpenChange={(open) => !open && setApprovalDialog({ open: false, folderId: '', contractId: '', status: 'approve', note: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalDialog.status === 'approve'
                ? t($ => $.contractList.approvalConfirmation)
                : t($ => $.contractList.rejectionConfirmation)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approvalDialog.status === 'approve'
                ? t($ => $.contractList.approvalConfirmationMessage, {
                  folderName: approvalDialog.folderName || t($ => $.contractList.thisFolder),
                  role: currentUser.role
                })
                : t($ => $.contractList.rejectionConfirmationMessage, {
                  folderName: approvalDialog.folderName || t($ => $.contractList.thisFolder),
                  role: currentUser.role
                })}
            </AlertDialogDescription>
            <div className="py-2">
              <h4 className="text-sm font-medium mb-2">{t($ => $.contractList.note)}</h4>
              <Textarea
                placeholder={t($ => $.contractList.addNotePlaceholder)}
                value={approvalDialog.note}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, note: e.target.value }))}
                className="resize-none"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t($ => $.contractList.cancel)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isApproving}
              className={approvalDialog.status === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {approvalDialog.status === 'approve' ? t($ => $.contractList.approving) : t($ => $.contractList.rejecting)}
                </>
              ) : (
                approvalDialog.status === 'approve' ? t($ => $.contractList.approve) : t($ => $.contractList.reject)
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

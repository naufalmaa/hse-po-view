import { useEffect } from 'react';
import { useAppTranslation } from '@/lib/i18n-typed';
import { useContracts, ListContractsResult } from '@/service/csms/contracts';
import { useAuth } from '@/hooks/use-auth';
import { FolderCard } from '@/components/pages/csms/contracts/contract-list';
import {
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DataTablePagination } from '@/components/custom/table/data-table-pagination';

interface RejectedTabProps {
  page: number;
  view: number;
  onPaginationChange: (page: number, view: number) => void;
  onLoadSuccess?: (metrics: any) => void;
}

export function RejectedTab({ page, view, onPaginationChange, onLoadSuccess }: RejectedTabProps) {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const currentUserRole = auth.user?.user?.role || 'evaluator';

  const {
    mutate: listContracts,
    data: contractsData,
    isPending: isLoading,
    isError,
    error
  } = useContracts();

  useEffect(() => {
    listContracts({
      status: 'rejected',
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

  const rejectedFolders = contracts.flatMap(c =>
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
  );

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
      {rejectedFolders.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">{t($ => $.contractList.noRejectedContracts)}</h3>
          <p className="text-muted-foreground">{t($ => $.contractList.rejectedContractsWillShowHere)}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rejectedFolders.map((folder) => (
            <FolderCard
              key={folder.folderId}
              folder={folder}
              currentUserRole={currentUserRole}
              projectInfo={folder.projectInfo}
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
    </div>
  );
}

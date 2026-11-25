import { useEffect } from 'react';
import { useAppTranslation } from '@/lib/i18n-typed';
import { useContracts, ListContractsResult } from '@/service/csms/contracts';
import { useAuth } from '@/hooks/use-auth';
import { ContractCard, Contract } from '@/components/pages/csms/contracts/contract-list';
import { Loader2 } from 'lucide-react';
import { DataTablePagination } from '@/components/custom/table/data-table-pagination';

interface AllContractsTabProps {
  page: number;
  view: number;
  onPaginationChange: (page: number, view: number) => void;
  onSelectContract: (contract: Contract) => void;
  onLoadSuccess?: (metrics: any) => void;
}

export function AllContractsTab({ page, view, onPaginationChange, onSelectContract, onLoadSuccess }: AllContractsTabProps) {
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
      status: '',
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract as unknown as Contract}
            currentUserRole={currentUserRole}
            onClick={() => onSelectContract(contract as unknown as Contract)}
          />
        ))}
      </div>

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

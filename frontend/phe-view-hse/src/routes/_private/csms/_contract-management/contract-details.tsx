import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ContractDetail } from '@/components/pages/csms/contract-management/contract-details';
import { FileText, Loader, Settings, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogUpdateContract } from '@/components/pages/csms/contract-management/management/DialogContract';
import { OngoingAssessmentDatesManager } from '@/components/pages/csms/contract-management/management/OngoingAssessmentDatesManager';
import { getRiskLevelBadgeClass } from '@/components/pages/csms/contract-management/management/CardContract';
import { getNearestOngoingAssessmentDate, getAllAssessmentDates } from '@/lib/lib-contract';
import { date_to_string } from '@/lib/my-utils';
import { cn } from '@/lib/utils';
import { useContractFolders } from '@/service/csms/folder-detail';
import { useListUsers } from '@/service/user-api';
import { useEffect, useState } from 'react';
import { useAppTranslation } from '@/lib/i18n-typed';
import { showNotifError } from "@/lib/show-notif";
import { AppRoute } from '@/constants/app-route';
import { USER_ROLE } from '@/constants/app-enum';

export const Route = createFileRoute('/_private/csms/_contract-management/contract-details')({
  component: RouteComponent,
  loader: ({ location }) => {
    const searchParams = new URLSearchParams(location.search);
    const contractId = searchParams.get('contractId');

    // Return contractId even if it's null/undefined - we'll handle this in the component
    return { contractId };
  }
});

function RouteComponent() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { contractId } = Route.useLoaderData();
  const [error, setError] = useState<string | null>(null);
  const [selectedRootFolderId, setSelectedRootFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [persistentExpandedFolders, setPersistentExpandedFolders] = useState<Record<string, Set<string>>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDatesManagerOpen, setIsDatesManagerOpen] = useState(false);

  // Move the useContractFolders hook here from ContractDetail.tsx
  const { mutate: loadContractFolders, isPending: foldersLoading, data: contractFoldersData, error: contractFoldersError } = useContractFolders();

  // Add the useListUsers hook here
  const { data: usersData, isLoading: isLoadingUsers } = useListUsers({
    limit: 100,
    search: '', // Initial empty search
    role: [USER_ROLE.user.value, USER_ROLE.evaluator.value, USER_ROLE.verifikator.value, USER_ROLE.manager.value] // Assuming we want users with the 'user' role
  });

  // Handle missing contractId
  useEffect(() => {
    if (!contractId) {
      setError(t($ => $.contractManagement.error.missingContractId));
      return;
    }

    // Load folders when contractId is valid
    loadContractFolders(contractId, {
      onSuccess: () => {
        setError(null);
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message ?? error?.message ?? t($ => $.contractManagement.error.loadingFailed);
        setError(errorMessage);
        // showNotifError({ message: errorMessage });
      }
    });
  }, [contractId]);

  // Redirect to contract management if needed
  const handleRedirect = () => {
    navigate({ to: AppRoute.csms.contractManagement.url });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.contractManagement.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.contractManagement.pageSubtitle)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center text-destructive">
              <FileText className="h-5 w-5 mr-2" />
              <span className="font-medium">{t($ => $.contractManagement.error.title)}</span>
            </div>
            <p className="mt-2 text-destructive text-sm">{error}</p>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => {
                  if (contractId) {
                    setError(null);
                    loadContractFolders(contractId, {
                      onSuccess: () => {
                        setError(null);
                      },
                      onError: (error: any) => {
                        const errorMessage = error?.response?.data?.message ?? error?.message ?? t($ => $.contractManagement.error.loadingFailed);
                        setError(errorMessage);
                        showNotifError({ message: errorMessage });
                      }
                    });
                  }
                }}
                className="mt-2 text-sm text-destructive underline hover:text-destructive/80"
                disabled={!contractId}
              >
                {t($ => $.contractManagement.error.retry)}
              </button>
              <button
                onClick={handleRedirect}
                className="mt-2 text-sm text-destructive underline hover:text-destructive/80"
              >
                {t($ => $.contractManagement.error.goBack)}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(foldersLoading || (!contractFoldersData && !error && Boolean(contractId))) && (
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t($ => $.contractManagement.loading)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show the main content if there's no error and contractId exists */}
      {!error && contractId && contractFoldersData && (
        <>
          {/* Contract Information Section */}
          {contractFoldersData?.contract && (
            <Card className="bg-card border border-border">
              <CardContent className="px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {t($ => $.contractManagement.contractTitle)}
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      {contractFoldersData.contract.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDatesManagerOpen(true)}
                      className="flex items-center gap-1.5"
                    >
                      <Calendar className="h-4 w-4" />
                      {t($ => $.contractManagement.manageOngoingDates)}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t($ => $.contractManagement.contractNumber)}</p>
                    <p className="font-medium text-sm mt-0.5">{contractFoldersData.contract.numberContract || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Assessment ID</p>
                    <p className="font-medium text-sm mt-0.5">{contractFoldersData.contract.riskAssessmentId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <div className="mt-1">
                      <Badge variant="outline" className={cn("text-xs font-medium", getRiskLevelBadgeClass(contractFoldersData.contract.riskLevel))}>
                        {contractFoldersData.contract.riskLevel || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  {contractFoldersData.contract.contractorName ? (
                    <div>
                      <p className="text-xs text-muted-foreground">{t($ => $.contractManagement.contractor)}</p>
                      <p className="font-medium text-sm mt-0.5">{contractFoldersData.contract.contractorName}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs text-muted-foreground">{t($ => $.contractManagement.startDate)}</p>
                    <p className="font-medium text-sm mt-0.5">
                      {contractFoldersData.contract.startDate ? date_to_string(new Date(contractFoldersData.contract.startDate), "dd/MM/yyyy") : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t($ => $.contractManagement.endDate)}</p>
                    <p className="font-medium text-sm mt-0.5">
                      {contractFoldersData.contract.endDate ? date_to_string(new Date(contractFoldersData.contract.endDate), "dd/MM/yyyy") : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Project Dialog */}
          {contractFoldersData?.contract && (
            <DialogUpdateContract
              open={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
              contract={contractFoldersData.contract}
              onSuccess={() => {
                if (contractId) {
                  loadContractFolders(contractId);
                }
              }}
            />
          )}

          {/* Kelola Tanggal Berjalan Dialog */}
          {contractFoldersData?.contract && (
            <Dialog open={isDatesManagerOpen} onOpenChange={setIsDatesManagerOpen}>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>{t($ => $.contractManagement.manageOngoingDates)}</DialogTitle>
                </DialogHeader>
                <OngoingAssessmentDatesManager
                  contractId={contractId}
                  initialDates={getAllAssessmentDates(contractFoldersData.data || contractFoldersData.contract)}
                  onDatesUpdated={() => {
                    if (contractId) {
                      loadContractFolders(contractId);
                    }
                  }}
                  onReloadContracts={() => {
                    if (contractId) {
                      loadContractFolders(contractId);
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Contract Detail Content */}
          <Card className="">
            <CardHeader className='px-6'>
              <CardTitle className="text-2xl flex items-center gap-2">
                <div className='flex flex-row flex-1 items-center gap-4'>
                  <FileText className="h-6 w-6" />
                  <span className=''>{t($ => $.contractManagement.contractAssessment)}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              <ContractDetail
                selectedRootFolderId={selectedRootFolderId}
                setSelectedRootFolderId={setSelectedRootFolderId}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
                persistentExpandedFolders={persistentExpandedFolders}
                setPersistentExpandedFolders={setPersistentExpandedFolders}
                folders={contractFoldersData?.data || []}
                refreshFolders={() => {
                  loadContractFolders(contractId, {
                    onSuccess: () => {
                      setError(null);
                    },
                    onError: (error: any) => {
                      const errorMessage = error?.response?.data?.message ?? error?.message ?? t($ => $.contractManagement.error.loadingFailed);
                      setError(errorMessage);
                      showNotifError({ message: errorMessage });
                    }
                  });
                }}
                usersData={usersData}
                isLoadingUsers={isLoadingUsers}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
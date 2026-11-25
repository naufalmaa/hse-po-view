import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAppTranslation } from '@/lib/i18n-typed';
import { ApprovalMetrics } from '@/service/csms/contracts';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import {
  Contract,
  StatsCard,
  ContractDetail
} from '@/components/pages/csms/contracts/contract-list';
import {
  PendingTab,
  AllContractsTab,
  CompleteTab,
  RejectedTab
} from '@/components/pages/csms/contracts/tabs';
import {
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const contractListSearchSchema = z.object({
  tab: z.enum(['pending', 'contracts', 'complete', 'rejected']).optional().catch('pending'),
  page: z.number().optional().catch(0),
  view: z.number().optional().catch(5),
})

export const Route = createFileRoute('/_private/csms/contracts/contract-list')({
  component: ContractListPage,
  validateSearch: contractListSearchSchema,
});

// Get user from auth context
const useMockUser = () => {
  const auth = useAuth();

  return {
    currentUser: {
      name: auth.user?.user?.name || 'User',
      role: auth.user?.user?.role || 'evaluator', // Defaulting to evaluator to show pending items
    }
  };
};

function ContractListPage() {
  const { t } = useAppTranslation();
  const { currentUser } = useMockUser();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  // Get the current tab from query parameters or default to 'pending'
  const currentTab = search.tab || 'pending';
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [approvalMetrics, setApprovalMetrics] = useState<ApprovalMetrics | undefined>(undefined);

  if (selectedContract) {
    return (
      <div className="w-full">
        <ContractDetail
          contract={selectedContract}
          currentUserRole={currentUser.role}
          onBack={() => setSelectedContract(null)}
        />
      </div>
    );
  }

  // Handle tab change by updating the URL
  const handleTabChange = (value: string) => {
    if (value === 'pending' || value === 'contracts' || value === 'complete' || value === 'rejected') {
      navigate({
        search: (prev: any) => ({ ...prev, tab: value, page: 0 }),
        replace: true,
      })
    }
  }

  const handlePaginationChange = (page: number, view: number) => {
    navigate({
      search: (prev: any) => ({ ...prev, page, view }),
      replace: true,
    })
  }

  return (
    <div className="w-full space-y-6 ">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title={t($ => $.contractList.pendingYourApproval)}
          value={approvalMetrics?.pendingForUser || 0}
          subtitle={t($ => $.contractList.foldersWaitingForYou)}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title={t($ => $.contractList.youHaveApproved)}
          value={approvalMetrics?.approvedByUser || 0}
          subtitle={t($ => $.contractList.inThisPeriod)}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title={t($ => $.contractList.fullyCompleted)}
          value={approvalMetrics?.fullyApproved || 0}
          subtitle={t($ => $.contractList.allApprovalsDone)}
          icon={FileText}
          variant="primary"
        />
        <StatsCard
          title={t($ => $.contractList.awaitingReview)}
          value={approvalMetrics?.awaitingReview || 0}
          subtitle={t($ => $.contractList.notYetStarted)}
          icon={AlertTriangle}
          variant="default"
        />
      </div>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              {t($ => $.contractList.pendingCount, { count: approvalMetrics?.pendingForUser || 0 })}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              {t($ => $.contractList.allContractsTab)}
            </TabsTrigger>
            <TabsTrigger value="complete" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t($ => $.contractList.completedTab)}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              {t($ => $.contractList.rejectedTab)}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-4">
          <PendingTab
            page={search.page || 0}
            view={search.view || 5}
            onPaginationChange={handlePaginationChange}
            // onActionSuccess={() => fetchStats({ status: '' })}
            onLoadSuccess={setApprovalMetrics}
          />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <AllContractsTab
            page={search.page || 0}
            view={search.view || 5}
            onPaginationChange={handlePaginationChange}
            onSelectContract={setSelectedContract}
            onLoadSuccess={setApprovalMetrics}
          />
        </TabsContent>

        <TabsContent value="complete" className="space-y-4">
          <CompleteTab
            page={search.page || 0}
            view={search.view || 5}
            onPaginationChange={handlePaginationChange}
            onLoadSuccess={setApprovalMetrics}
          />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <RejectedTab
            page={search.page || 0}
            view={search.view || 5}
            onPaginationChange={handlePaginationChange}
            onLoadSuccess={setApprovalMetrics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

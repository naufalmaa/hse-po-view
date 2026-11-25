import { createFileRoute } from '@tanstack/react-router';
import { useAppTranslation } from '@/lib/i18n-typed';
import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ValidationStatistics, ErrorGroupsSection, ValidationRelatedTools } from '@/components/pages/employee/smart-card/validation';
import { useObservationStatistics } from '@/service/employee/smart-card';
import { useUploadErrors } from '@/service/employee/smart-card-upload';
import { useContractorGet } from '@/service/contractor-api'; // Added contractor API import

export const Route = createFileRoute(
  '/_private/employee/_smart-card/smart-card-validation',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch statistics and errors data
  const { data: statisticsData, refetch: refetchStatistics } = useObservationStatistics();
  const { data: errorsData, refetch: refetchErrors } = useUploadErrors();
  // Fetch contractor data at the parent level
  const { data: contractorData, isLoading: isContractorLoading } = useContractorGet(); // Moved from ErrorGroupItem

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStatistics(),
      refetchErrors()
    ]);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleErrorsUpdate = () => {
    refetchStatistics();
    setRefreshTrigger(prev => prev + 1);
  };

  // Calculate statistics from the data
  const errorGroupsCount = errorsData?.data?.length || 0;
  const totalErrorRows = errorsData?.data?.reduce((sum, group) => sum + group.count, 0) || 0;
  const activeEmployeesCount = statisticsData?.data?.totalActiveEmployees || 0;
  const withoutObservationsCount = statisticsData?.data?.employeesWithoutObservations || 0;

  return (
    <div className="w-full space-y-6">
      {/* Header Section with Navigation */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.smartCardValidation.title)}</h1>
              <p className="text-muted-foreground mt-1">
                {t($ => $.smartCardValidation.description)}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            {/* <Link to={AppRoute.employee.smartCardUpload.url}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t($ => $.smartCardValidation.header.backToUpload')}
              </Button>
            </Link> */}
            <Button
              variant="default"
              size="sm"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t($ => $.smartCardValidation.header.refreshAllData)}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <ValidationStatistics
        errorGroupsCount={errorGroupsCount}
        totalErrorRows={totalErrorRows}
        activeEmployeesCount={activeEmployeesCount}
        withoutObservationsCount={withoutObservationsCount}
      />

      {/* Error Groups Section */}
      <ErrorGroupsSection
        onErrorsUpdate={handleErrorsUpdate}
        contractorData={contractorData}
        isContractorLoading={isContractorLoading}
      />

      {/* Related Tools */}
      {/* <ValidationRelatedTools /> */}
    </div>
  );
}
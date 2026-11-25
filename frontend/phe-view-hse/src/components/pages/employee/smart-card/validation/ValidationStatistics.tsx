import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, XCircle, Users, UserCheck } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

interface ValidationStatisticsProps {
  errorGroupsCount: number;
  totalErrorRows: number;
  activeEmployeesCount: number;
  withoutObservationsCount: number;
}

export const ValidationStatistics: React.FC<ValidationStatisticsProps> = ({
  errorGroupsCount,
  totalErrorRows,
  activeEmployeesCount,
  withoutObservationsCount,
}) => {
  const { t } = useAppTranslation();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800 p-0">
        <CardContent className="p-4">
          <div className="text-red-800 dark:text-red-200">
            <h3 className="text-lg font-semibold">{t($ => $.smartCardValidation.statistics.errorGroups)}</h3>
            <div className='flex flex-row items-center gap-4 my-2'>
              <XCircle className="h-5 w-5" />
              <p className="text-3xl font-bold">{errorGroupsCount}</p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t($ => $.smartCardValidation.statistics.requireAttention)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 p-0">
        <CardContent className="p-4">
          <div className="text-yellow-800 dark:text-yellow-200">
            <h3 className="text-lg font-semibold">{t($ => $.smartCardValidation.statistics.totalErrorRows)}</h3>
            <div className='flex flex-row items-center gap-4 my-2'>
              <AlertTriangle className="h-5 w-5" />
              <p className="text-3xl font-bold">{totalErrorRows}</p>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">{t($ => $.smartCardValidation.statistics.individualErrors)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800 p-0">
        <CardContent className="p-4">
          <div className="text-green-800 dark:text-green-200">
            <h3 className="text-lg font-semibold">{t($ => $.smartCardValidation.statistics.activeEmployees)}</h3>
            <div className='flex flex-row items-center gap-4 my-2'>
              <UserCheck className="h-5 w-5" />
              <p className="text-3xl font-bold">{activeEmployeesCount}</p>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">{t($ => $.smartCardValidation.statistics.inDatabase)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800 p-0">
        <CardContent className="p-4">
          <div className="text-purple-800 dark:text-purple-200">
            <h3 className="text-lg font-semibold">{t($ => $.smartCardValidation.statistics.belumMengisi)}</h3>
            <div className='flex flex-row items-center gap-4 my-2'>
              <Users className="h-5 w-5" />
              <p className="text-3xl font-bold">{withoutObservationsCount}</p>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{t($ => $.smartCardValidation.statistics.needToFill)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
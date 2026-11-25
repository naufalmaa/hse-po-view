import React from 'react';
import { FileText } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { to_decimal_formatted } from '@/lib/my-utils';

interface MetricsProps {
  overallMetrics: any;
  contractsCount: number;
}

export const ContractMetrics: React.FC<MetricsProps> = ({ overallMetrics, contractsCount }) => {
  const { t } = useAppTranslation();
  
  if (!overallMetrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50 mr-4">
            <div className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded-full">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t($ => $.contractManagement.metrics.ongoingAssessments)}</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{overallMetrics.ongoingAssessmentsCompleted}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50 mr-4">
            <div className="bg-green-600 dark:bg-green-500 text-white p-2 rounded-full">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t($ => $.contractManagement.metrics.finalAssessments)}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{overallMetrics.finalAssessmentsCompleted}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/50 mr-4">
            <div className="bg-purple-600 dark:bg-purple-500 text-white p-2 rounded-full">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t($ => $.contractManagement.metrics.totalAssessments)}</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{overallMetrics.totalContracts}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50 mr-4">
            <div className="bg-amber-600 dark:bg-amber-500 text-white p-2 rounded-full">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t($ => $.contractManagement.metrics.completionRate)}</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{to_decimal_formatted(overallMetrics.completionRate, 1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
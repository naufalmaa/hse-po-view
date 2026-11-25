import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Wrench } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAppTranslation } from "@/lib/i18n-typed";

export const RelatedTools: React.FC = () => {
  const { t } = useAppTranslation();

  return (
    <Card className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-900/50 dark:to-purple-950/20 border border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-lg mr-3">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t($ => $.smartCardUpload.relatedTools.title)}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t($ => $.smartCardUpload.relatedTools.description)}
            </p>
          </div>
        </div>
        
        <div className="max-w-sm">
          <Link to="/employee/smart-card">
            <div className="group bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 rounded-lg p-4 transition-all duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {t($ => $.smartCardUpload.relatedTools.employeeMonitoring.title)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t($ => $.smartCardUpload.relatedTools.employeeMonitoring.description)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
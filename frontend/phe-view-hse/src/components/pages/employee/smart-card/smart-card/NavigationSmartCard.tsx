import React from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, AlertTriangle } from 'lucide-react';
import {AppRoute} from "@/constants/app-route";
import { useAppTranslation } from "@/lib/i18n-typed";

interface NavigationSmartCardProps {
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const NavigationSmartCard: React.FC<NavigationSmartCardProps> = ({
  onRefreshData,
  isRefreshing
}) => {
  const { t } = useAppTranslation();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Back Navigation */}
        <div className="flex items-center gap-2">
          {/* <Link 
            to="/employee/smart-card-upload" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Smart Card Management
          </Link> */}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link to={AppRoute.employee.smartCardUpload.url}>
            <Button 
              variant="default" 
              size="sm"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4" />
              {t($ => $.smartCard.navigation.uploadData)}
            </Button>
          </Link>
          
          <Link to={AppRoute.employee.smartCardValidation.url}>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/20"
            >
              <AlertTriangle className="h-4 w-4" />
              {t($ => $.smartCard.navigation.errorValidation)}
            </Button>
          </Link>
          
          <Button 
            onClick={onRefreshData} 
            disabled={isRefreshing}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? t($ => $.smartCard.navigation.refreshing) : t($ => $.smartCard.navigation.refreshData)}
          </Button>
        </div>
      </div>
      
      {/* Quick Info */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {t($ => $.smartCard.navigation.info.upload)}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            {t($ => $.smartCard.navigation.info.errors)}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {t($ => $.smartCard.navigation.info.monitor)}
          </span>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Upload, FileCheck } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

export const UploadInstructions: React.FC = () => {
  const { t } = useAppTranslation();

  return (
    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
              {t($ => $.smartCardUpload.instructions.title)}
            </h3>
            <ul className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
              <li className="flex items-start space-x-2">
                <Upload className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t($ => $.smartCardUpload.instructions.item1)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <FileCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t($ => $.smartCardUpload.instructions.item2)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t($ => $.smartCardUpload.instructions.item3)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <FileCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t($ => $.smartCardUpload.instructions.item4)}</span>
              </li>
              <li className="flex items-start space-x-2">
                <Upload className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{t($ => $.smartCardUpload.instructions.item5)}</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
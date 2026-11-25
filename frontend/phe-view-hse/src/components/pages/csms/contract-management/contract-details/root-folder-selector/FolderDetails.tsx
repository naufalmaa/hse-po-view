import React from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useAppTranslation } from "@/lib/i18n-typed";
import { isAssessmentFolder, getFolderTitle } from './utils';
import { CheckCircle, Clock } from 'lucide-react';

interface FolderDetailsProps {
  selectedRootFolder: ContractFolder | null;
}

export const FolderDetails: React.FC<FolderDetailsProps> = ({ selectedRootFolder }) => {
  const { t } = useAppTranslation();

  if (!selectedRootFolder) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px]">
        <p className="text-muted-foreground text-center">
          {t($ => $.contractManagement.rootFolderSelector.selectFolderInfo)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-base font-medium text-foreground">
        {getFolderTitle(selectedRootFolder.name)}
      </h4>
      <div className='flex flex-row justify-between'>
        <p className="text-sm text-muted-foreground mt-1">
          {isAssessmentFolder(selectedRootFolder.name)
            ? t($ => $.contractManagement.rootFolderSelector.assessmentFolder)
            : t($ => $.contractManagement.rootFolderSelector.regularFolder)}
        </p>

        {isAssessmentFolder(selectedRootFolder.name) && (
          <div className="flex items-center gap-2 text-sm">
            {/* <span className="text-muted-foreground">{t($ => $.contractManagement.rootFolderSelector.status)}:</span> */}
            {selectedRootFolder.isComplete ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.completed)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-yellow-600">
                <Clock className="h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.inProgress)}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
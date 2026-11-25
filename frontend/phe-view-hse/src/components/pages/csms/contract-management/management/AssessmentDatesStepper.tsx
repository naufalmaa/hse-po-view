import React, { useState } from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { OngoinAssesmentDate, FolderInfo } from '@/service/csms/folder-detail';
import { Check } from 'lucide-react';
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperNav,
  StepperTrigger,
} from '@/components/ui/stepper';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AssessmentDatesStepperProps {
  assessmentDates: (OngoinAssesmentDate | any)[] | undefined;
}

export const AssessmentDatesStepper: React.FC<AssessmentDatesStepperProps> = ({
  assessmentDates
}) => {
  const { t } = useAppTranslation();
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);

  const getIndicatorColor = (folderInfo?: FolderInfo[]) => {
    if (!folderInfo || folderInfo.length === 0) {
      return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-500';
    }

    // Use colorType mapping if available
    const colorType = folderInfo[0].colorType;
    switch (colorType) {
      case 0: // Dark Blue
        return 'bg-blue-900 text-white dark:bg-blue-700 dark:text-blue-50 border border-blue-800';
      case 1: // Light Blue
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-500';
      case 2: // Green
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-500';
      case 3: // Yellow
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-500';
      case 4: // Gray
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-500';
      default:
        // Fallback to legacy logic if colorType is not provided
        if (folderInfo.some(folder => folder.isComplete)) {
          return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-500';
        }
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-500';
    }
  };

  if (!assessmentDates || assessmentDates.length === 0) {
    return null;
  }

  const handlePopoverOpen = (index: number) => {
    setOpenPopoverIndex(index);
  };

  const handlePopoverClose = () => {
    setOpenPopoverIndex(null);
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t($ => $.contractManagement.contractProgress)}
      </h4>
      {assessmentDates.length > 5 ? (
        // Horizontal scrolling container for more than 5 steps
        <div className="overflow-x-auto pb-4">
          <div className="min-w-max">
            <Stepper
              defaultValue={-1}
              indicators={{
                completed: <Check className="size-4" />,
              }}
              className="w-full"
            >
              <StepperNav>
                {assessmentDates.map((assessment, index) => (
                  <React.Fragment key={index}>
                    <StepperItem step={index + 1} className="relative flex-1 items-start">
                      <Popover open={openPopoverIndex === index} onOpenChange={(isOpen) => isOpen ? handlePopoverOpen(index) : handlePopoverClose()}>
                        <PopoverTrigger asChild>
                          <StepperTrigger className="flex flex-col gap-2.5">
                            <StepperIndicator
                              className={`cursor-pointer flex items-center justify-center ${getIndicatorColor(assessment.folderInfo)}`}
                            >
                              <span className="text-xs font-medium">
                                {index + 1}
                              </span>
                            </StepperIndicator>
                            {/* <StepperTitle className="text-xs">
                              {new Date(assessment.date).toLocaleDateString()}
                            </StepperTitle> */}
                          </StepperTrigger>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div>
                            <div className="p-2">
                              {assessment.folderInfo && assessment.folderInfo.length > 0 ? (
                                <div className="space-y-2">
                                  <h4 className="font-medium ">Folders:</h4>
                                  {assessment.folderInfo.map((folder: FolderInfo, folderIndex: number) => (
                                    <div key={folderIndex} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                                      <p className="text-sm font-medium">{folder.folderName}</p>
                                      {/* <p className="text-xs">
                                        Date: {new Date(folder.folderDate).toLocaleDateString()}
                                      </p> */}
                                      <div className="flex gap-2 mt-1">
                                        <span className={`text-xs px-2 py-1 rounded ${folder.isComplete ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                          {folder.isComplete ? 'Complete' : 'Incomplete'}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${folder.isCompleteAssessment ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                          {folder.isCompleteAssessment ? 'Assessed' : 'Not Assessed'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No folders associated</p>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {assessmentDates && index < assessmentDates.length - 1 && (
                        <StepperSeparator className="bg-primary/50 absolute top-3 inset-x-0 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none group-data-[state=completed]/step:bg-primary" />
                      )}
                    </StepperItem>
                  </React.Fragment>
                ))}
              </StepperNav>
            </Stepper>
          </div>
        </div>
      ) : (
        // Normal display for 5 or fewer steps
        <Stepper
          indicators={{
            completed: <Check className="size-4" />,
          }}
          className="w-full"
        >
          <StepperNav>
            {assessmentDates.map((assessment, index) => (
              <React.Fragment key={index}>
                <StepperItem step={index + 1} className="relative flex-1 items-start">
                  <Popover open={openPopoverIndex === index} onOpenChange={(isOpen) => isOpen ? handlePopoverOpen(index) : handlePopoverClose()}>
                    <PopoverTrigger asChild>
                      <StepperTrigger className="flex flex-col gap-2.5">
                        <StepperIndicator
                          className={`cursor-pointer flex items-center justify-center ${getIndicatorColor(assessment.folderInfo)}`}
                        >
                          <span className="text-xs font-medium">
                            {index + 1}
                          </span>
                        </StepperIndicator>
                        {/* <StepperTitle className="text-xs">
                          {new Date(assessment.date).toLocaleDateString()}
                        </StepperTitle> */}
                      </StepperTrigger>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div>
                        <div className="p-2">
                          {assessment.folderInfo && assessment.folderInfo.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="font-medium ">Folders:</h4>
                              {assessment.folderInfo.map((folder: FolderInfo, folderIndex: number) => (
                                <div key={folderIndex} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                                  <p className="text-sm font-medium">{folder.folderName}</p>
                                  {/* <p className="text-xs">
                                    Date: {new Date(folder.folderDate).toLocaleDateString()}
                                  </p> */}
                                  <div className="flex gap-2 mt-1">
                                    <span className={`text-xs px-2 py-1 rounded ${folder.isComplete ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                      {folder.isComplete ? 'Complete' : 'Incomplete'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded ${folder.isCompleteAssessment ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                      {folder.isCompleteAssessment ? 'Assessed' : 'Not Assessed'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No folders associated</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {assessmentDates && index < assessmentDates.length - 1 && (
                    <StepperSeparator className="bg-primary/50 absolute top-3 inset-x-0 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none group-data-[state=completed]/step:bg-primary" />
                  )}
                </StepperItem>
              </React.Fragment>
            ))}
          </StepperNav>
        </Stepper>
      )}
    </div>
  );
};
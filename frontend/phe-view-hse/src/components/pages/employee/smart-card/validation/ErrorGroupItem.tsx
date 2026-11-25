import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, AlertTriangle, User, Building, Hash, Plus } from 'lucide-react';
import { ErrorGroup } from '@/service/employee/smart-card-upload';
import { useAppTranslation } from "@/lib/i18n-typed";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { onCreateEmployee } from "./templates/employee-template";
import FormCreateEmployee from "./FormCreateEmployee";
import { useEmployeeCreate } from '@/service/employee';
import { useQueryClient } from '@tanstack/react-query';
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
// Removed local contractor API import since it's now passed as prop

interface ErrorGroupItemProps {
  errorGroup: ErrorGroup;
  index: number;
  onReprocessGroup: (groupId: string) => void;
  onReprocessGroupWithEmployee: (groupId: string, employeeId: string) => void;
  onSearchEmployee: (employeeName: string, companyName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  contractorData?: any; // Added contractorData prop
  isContractorLoading?: boolean; // Added isContractorLoading prop
}

export const ErrorGroupItem: React.FC<ErrorGroupItemProps> = ({
  errorGroup,
  index,
  onReprocessGroup,
  onReprocessGroupWithEmployee,
  onSearchEmployee,
  onDeleteGroup,
  contractorData, // Destructured contractorData
  isContractorLoading // Destructured isContractorLoading
}) => {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  
  const employeeCreateMutation = useEmployeeCreate();
  // Removed local contractor data fetching since it's now passed as prop

  const handleCreateEmployee = () => {
    // Transform contractor data to options format
    const contractorOptions = contractorData?.map((contractor: any) => ({
      value: contractor.id,
      label: contractor.name,
    })) || [];
    
    // Set default values
    const defaultValues = {
      employeeName: errorGroup.employeeName || ""
    };
    
    onCreateEmployee(
      t,
      setConfirmationCreate,
      (body: Record<string, string>) => {
        employeeCreateMutation.mutate(
          { body },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['employee-list'] });
              // showNotifSuccess({ message: t($ => $.employee.smartCard.validation.createSuccess) || "Employee created successfully" });
              // Call onReprocessGroup after successful employee creation
              onReprocessGroup(errorGroup.id);
            },
            onError: (error: any) => {
              showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message });
            },
          }
        );
      },
      FormCreateEmployee,
      contractorOptions,
      defaultValues
    );
  };

  return (
    <Card className="mb-4 shadow-sm py-1">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.employee)}:</span>
                  <div className="text-foreground font-semibold">
                    {errorGroup.employeeName || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.company)}:</span>
                  <div className="text-foreground">
                    {errorGroup.companyName || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.errorCount)}:</span>
                  <div className="text-red-600 font-bold">
                    {errorGroup.count} rows
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.errorType)}:</span>
                  <Badge variant="subtle-destructive" className="mt-1">
                    {errorGroup.errorType}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <ChevronDown className="h-4 w-4" />
                  {t($ => $.smartCardValidation.errorGroups.showDetails)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-w-md max-h-96 overflow-y-auto">
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <strong>Sample Row Data:</strong>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Close the popover by finding the trigger and clicking it
                        const trigger = document.activeElement;
                        if (trigger && trigger instanceof HTMLElement) {
                          trigger.blur();
                        }
                      }}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  <pre className="mt-2 text-xs bg-background p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(errorGroup?.sampleRow, null, 2)}
                  </pre>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {errorGroup.suggestions && errorGroup.suggestions.length > 0 && showSuggestions && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-foreground">{t($ => $.smartCardValidation.errorGroups.suggestions.title)}:</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                {showSuggestions ? t($ => $.smartCardValidation.errorGroups.suggestions.hideSuggestions) : t($ => $.smartCardValidation.errorGroups.suggestions.showSuggestions)}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {t($ => $.smartCardValidation.errorGroups.suggestions.processInfo, { count: errorGroup.count })}
            </div>
            <div className="flex flex-wrap gap-2">
              {errorGroup.suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onReprocessGroupWithEmployee(errorGroup.id, suggestion.id)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
                >
                  {suggestion.employeeName} @ {suggestion.companyName}
                  <Badge variant="secondary" className="ml-2 text-blue-600 dark:text-blue-400">
                    {t($ => $.smartCardValidation.errorGroups.suggestions.similarity, { percent: Math.round(suggestion.similarity * 100) })}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* <Button
            variant="default"
            size="sm"
            onClick={() => onReprocessGroup(errorGroup.id)}
            className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-900 dark:hover:bg-orange-800 text-white"
          >
            {t($ => $.smartCardValidation.errorGroups.actions.autoResolve, { count: errorGroup.count })}
          </Button> */}
          <Button
            variant="dark"
            size="sm"
            onClick={handleCreateEmployee}
            disabled={isContractorLoading} // Using the prop instead of local state
          >
            <Plus className="h-4 w-4 mr-2" />
            {isContractorLoading ? ( // Using the prop instead of local state
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
            ) : null}
            {t($ => $.employee.smartCard.validation.createEmployee)}
          </Button>
        </div>
        
        {/* Modals */}
        {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { ErrorGroup, useUploadErrors, useReprocessError, useReprocessGroup } from '@/service/employee/smart-card-upload';
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';
import { ValidationFilters, FilterState } from './ValidationFilters';
import { ErrorGroupItem } from './ErrorGroupItem';
import { useAppTranslation } from "@/lib/i18n-typed";

interface ErrorGroupsSectionProps {
  onErrorsUpdate?: () => void;
  contractorData?: any; // Added contractor data prop
  isContractorLoading?: boolean; // Added loading state prop
}

export const ErrorGroupsSection: React.FC<ErrorGroupsSectionProps> = ({ 
  onErrorsUpdate,
  contractorData, // Destructured contractorData
  isContractorLoading // Destructured isContractorLoading
}) => {
  const { t } = useAppTranslation();
  const [filteredErrors, setFilteredErrors] = useState<ErrorGroup[]>([]);
  const [allErrors, setAllErrors] = useState<ErrorGroup[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { data: errorsData, isLoading, refetch } = useUploadErrors();
  const reprocessError = useReprocessError();
  const reprocessGroup = useReprocessGroup();

  useEffect(() => {
    if (errorsData?.success && errorsData.data) {
      setAllErrors(errorsData.data);
      setFilteredErrors(errorsData.data);
    }
  }, [errorsData]);

  const handleFilterChange = (filters: FilterState) => {
    let filtered = allErrors;

    if (filters.errorType && filters.errorType !== 'all') {
      filtered = filtered.filter(group => group.errorType === filters.errorType);
    }

    if (filters.employeeName) {
      filtered = filtered.filter(group => 
        group.employeeName?.toLowerCase().includes(filters.employeeName.toLowerCase())
      );
    }

    if (filters.companyName) {
      filtered = filtered.filter(group => 
        group.companyName?.toLowerCase().includes(filters.companyName.toLowerCase())
      );
    }

    setFilteredErrors(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilteredErrors(allErrors);
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  const handleRefreshErrors = async () => {
    await refetch();
    onErrorsUpdate?.();
  };

  const handleReprocessGroup = async (groupId: string) => {
    try {
      await reprocessGroup.mutateAsync({ groupId });
      await handleRefreshErrors();
    } catch (error) {
      showNotifError({ message: `Failed to reprocess group: ${error}` });
    }
  };

  const handleReprocessGroupWithEmployee = async (groupId: string, employeeId: string) => {
    try {
      await reprocessGroup.mutateAsync({ groupId, employeeId });
      await handleRefreshErrors();
    } catch (error) {
      showNotifError({ message: `Failed to reprocess group: ${error}` });
    }
  };

  const handleSearchEmployee = (employeeName: string, companyName: string) => {
    // This could open a modal or navigate to employee search
    showNotifSuccess({ message: `Searching for: ${employeeName} at ${companyName}` });
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(t($ => $.smartCardValidation.errorGroups.deleteConfirm))) {
      return;
    }
    
    // This would require a new API endpoint for deleting error groups
    showNotifSuccess({ message: t($ => $.smartCardValidation.errorGroups.deleteNotImplemented) });
  };

  const handleSelectAll = () => {
    // Removed selection functionality
  };

  const handleSelectErrorGroup = (id: string) => {
    // Removed selection functionality
  };

  const handleDeleteSelected = async () => {
    // Removed selection functionality
  };

  const confirmDeleteSelected = async () => {
    // Removed selection functionality
  };

  const exportErrorsToCSV = () => {
    if (filteredErrors.length === 0) {
      showNotifError({ message: t($ => $.smartCardValidation.errorGroups.export.noErrors) });
      return;
    }

    const headers = ['Employee Name', 'Company Name', 'Error Type', 'Error Count', 'Created At'];
    const csvContent = [headers.join(',')];

    filteredErrors.forEach(errorGroup => {
      const row = [
        `"${errorGroup.employeeName || 'N/A'}"`,
        `"${errorGroup.companyName || 'N/A'}"`,
        `"${errorGroup.errorType}"`,
        errorGroup.count,
        `"${new Date().toISOString()}"`
      ];
      csvContent.push(row.join(','));
    });

    const csvString = csvContent.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `upload-errors-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    showNotifSuccess({ message: t($ => $.smartCardValidation.errorGroups.export.success) });
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredErrors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentErrors = filteredErrors.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Smart pagination with ellipsis
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <div className="text-lg font-semibold mb-2">{t($ => $.smartCardValidation.errorGroups.loading)}</div>
            <div className="text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.refreshing)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-semibold">{t($ => $.smartCardValidation.errorGroups.title)}</CardTitle>
          <div className="flex gap-2">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshErrors}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t($ => $.smartCardValidation.errorGroups.refreshErrors)}
            </Button> */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportErrorsToCSV}
              disabled={filteredErrors.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {t($ => $.smartCardValidation.errorGroups.exportCSV)}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ValidationFilters
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {filteredErrors.length == 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <div className="text-green-600 text-lg font-semibold mb-2">🎉 {t($ => $.smartCardValidation.errorGroups.noErrorsFound)}</div>
            <div className="text-muted-foreground">{t($ => $.smartCardValidation.errorGroups.noErrorsMessage)}</div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
              <div>
                {t($ => $.smartCardValidation.errorGroups.showingGroups, { 
                  count: filteredErrors.length, 
                  totalRows: filteredErrors.reduce((sum, g) => sum + g.count, 0) 
                })}
              </div>
              <div>
                {t($ => $.smartCardValidation.errorGroups.page, { 
                  currentPage: currentPage, 
                  totalPages: totalPages, 
                  start: startIndex + 1, 
                  end: Math.min(endIndex, filteredErrors.length), 
                  total: filteredErrors.length 
                })}
              </div>
            </div>
            
            <div className="space-y-4">
              {currentErrors.map((errorGroup, index) => (
                <ErrorGroupItem
                  key={errorGroup.id}
                  errorGroup={errorGroup}
                  index={startIndex + index}
                  onReprocessGroup={handleReprocessGroup}
                  onReprocessGroupWithEmployee={handleReprocessGroupWithEmployee}
                  onSearchEmployee={handleSearchEmployee}
                  onDeleteGroup={handleDeleteGroup}
                  contractorData={contractorData} // Pass contractorData to ErrorGroupItem
                  isContractorLoading={isContractorLoading} // Pass isContractorLoading to ErrorGroupItem
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t($ => $.smartCardValidation.pagination.previous)}
                </Button>
                
                <div className="flex space-x-1">
                  {getVisiblePages().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-1 text-muted-foreground">
                        {t($ => $.smartCardValidation.pagination.ellipsis)}
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    )
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t($ => $.smartCardValidation.pagination.next)}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

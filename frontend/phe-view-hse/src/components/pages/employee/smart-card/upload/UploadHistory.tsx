import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  History,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2
} from 'lucide-react';
import { useUploadHistory, useDeleteUploadHistory, type UploadHistoryParams } from '@/service/employee/smart-card-upload';
import { Link } from '@tanstack/react-router';
import { AppRoute } from "@/constants/app-route";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';

interface UploadHistoryProps {
  refreshTrigger?: number;
}

export const UploadHistory: React.FC<UploadHistoryProps> = ({ refreshTrigger = 0 }) => {
  const { t } = useAppTranslation();
  const [filters, setFilters] = useState<UploadHistoryParams>({
    limit: 10,
    page: 0,
    search: '',
    status: [],
    dateStart: '',
    dateEnd: '',
    sortBy: 'createdAt',
    orderBy: 'desc'
  });

  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: historyData, isLoading, refetch } = useUploadHistory(filters);
  const { mutateAsync: deleteUploadHistory } = useDeleteUploadHistory();

  // Trigger refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 0 }));
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchInput]);

  const handleFilterChange = (key: keyof UploadHistoryParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 0 : value
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleSelectAll = () => {
    if (selectedItems.size === historyData?.data.length) {
      // If all are selected, unselect all
      setSelectedItems(new Set());
    } else {
      // Select all current page items
      const newSelected = new Set(selectedItems);
      historyData?.data.forEach(item => newSelected.add(item.id));
      setSelectedItems(newSelected);
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    // Show confirmation dialog
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = async () => {
    try {
      const ids = Array.from(selectedItems);
      const response = await deleteUploadHistory(ids);
      
      if (response.success) {
        showNotifSuccess({ message: t($ => $.smartCardUpload.history.deleteSuccess, { count: response.data.deletedCount }) });
        setSelectedItems(new Set());
        await refetch();
      } else {
        showNotifError({ message: response.message || t($ => $.smartCardUpload.history.deleteFailed) });
      }
    } catch (error) {
      showNotifError({ message: t($ => $.smartCardUpload.history.deleteFailed) + `: ${error}` });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            {t($ => $.smartCardUpload.history.loading)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="h-5 w-5" />
            {t($ => $.smartCardUpload.history.title)}
          </CardTitle>
          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <Button
                onClick={handleDeleteSelected}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t($ => $.smartCardUpload.history.deleteSelected, { count: selectedItems.size })}
              </Button>
            )}
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t($ => $.smartCardUpload.history.refresh)}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t($ => $.smartCardUpload.history.filters.search)}:
                </label>
                <Input
                  type="text"
                  placeholder={t($ => $.smartCardUpload.history.filters.searchPlaceholder)}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t($ => $.smartCardUpload.history.filters.status)}:
                </label>
                <Select
                  value={filters.status?.[0] || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('status', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t($ => $.smartCardUpload.history.filters.statusAll)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t($ => $.smartCardUpload.history.filters.statusAll)}</SelectItem>
                    <SelectItem value="success">{t($ => $.smartCardUpload.history.filters.statusSuccess)}</SelectItem>
                    <SelectItem value="error">{t($ => $.smartCardUpload.history.filters.statusError)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t($ => $.smartCardUpload.history.filters.sortBy)}:
                </label>
                <Select
                  value={filters.sortBy || 'createdAt'}
                  onValueChange={(value) => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">{t($ => $.smartCardUpload.history.filters.sortByUploadTime)}</SelectItem>
                    <SelectItem value="filename">{t($ => $.smartCardUpload.history.filters.sortByFilename)}</SelectItem>
                    <SelectItem value="status">{t($ => $.smartCardUpload.history.filters.sortByStatus)}</SelectItem>
                    <SelectItem value="totalRows">{t($ => $.smartCardUpload.history.filters.sortByTotalRows)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t($ => $.smartCardUpload.history.filters.dateStart)}:
                </label>
                <Input
                  type="date"
                  value={filters.dateStart || ''}
                  onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t($ => $.smartCardUpload.history.filters.dateEnd)}:
                </label>
                <Input
                  type="date"
                  value={filters.dateEnd || ''}
                  onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {historyData?.data.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">{t($ => $.smartCardUpload.history.empty.title)}</div>
            <div className="text-sm">{t($ => $.smartCardUpload.history.empty.description)}</div>
          </div>
        ) : (
          <>
            {/* Select All and Pagination Info */}
            {historyData && (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedItems.size === historyData.data.length && historyData.data.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t($ => $.smartCardUpload.history.selectAll)}
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    {t($ => $.smartCardUpload.history.pagination.showing, {
                      showing: historyData.data.length,
                      total: historyData.meta.total
                    })}
                    {t($ => $.smartCardUpload.history.pagination.page, {
                      currentPage: historyData.meta.page + 1,
                      totalPages: historyData.meta.totalPages
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <label>{t($ => $.smartCardUpload.history.filters.perPage)}:</label>
                    <Select
                      value={filters.limit?.toString() || '10'}
                      onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* History Items */}
            <div className="space-y-3">
              {historyData?.data.map((item) => (
                <Card key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => handleSelectItem(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {item.status === 'success' ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 text-base">
                                {item.filename}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <Badge
                                  variant={item.status === 'success' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {item.status === 'success' ? t($ => $.smartCardUpload.history.items.success) : t($ => $.smartCardUpload.history.items.error)}
                                </Badge>
                                {item.hasErrors && (
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                                    {t($ => $.smartCardUpload.history.items.hasErrors)}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(item.createdAt)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {t($ => $.smartCardUpload.history.items.id, { id: item.id })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {item.status === 'error' && item.errorMessage && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800 mb-3">
                        <div className="text-red-800 dark:text-red-200 text-sm">
                          <strong>{t($ => $.smartCardUpload.history.items.errorMessage)}</strong> {item.errorMessage}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {(item.hasErrors || (item.errorRows && item.errorRows > 0)) && (
                        <Link to={AppRoute.employee.smartCardValidation.url} search={{ uploadId: item.id }}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {/* {t($ => $.smartCardUpload.history.items.viewErrors, { count: item.errorRows || 0 })} */}
                            {t($ => $.smartCardUpload.history.items.viewErrorsSimple)}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {historyData && historyData.meta.totalPages > 1 && (
              <div className="flex justify-between items-center">
                <Button
                  onClick={() => handleFilterChange('page', historyData.meta.page - 1)}
                  disabled={historyData.meta.page === 0}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t($ => $.smartCardUpload.history.pagination.previous)}
                </Button>

                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(5, historyData.meta.totalPages) }, (_, i) => {
                    const startPage = Math.max(0, historyData.meta.page - 2);
                    const pageNumber = startPage + i;

                    if (pageNumber >= historyData.meta.totalPages) return null;

                    return (
                      <Button
                        key={pageNumber}
                        onClick={() => handleFilterChange('page', pageNumber)}
                        variant={pageNumber === historyData.meta.page ? 'default' : 'outline'}
                        size="sm"
                        className="w-10"
                      >
                        {pageNumber + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => handleFilterChange('page', historyData.meta.page + 1)}
                  disabled={historyData.meta.page >= historyData.meta.totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  {t($ => $.smartCardUpload.history.pagination.next)}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t($ => $.smartCardUpload.history.deleteConfirmTitle)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t($ => $.smartCardUpload.history.deleteSelectedConfirm, { count: selectedItems.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t($ => $.smartCardUpload.history.deleteCancel)}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} className="bg-destructive hover:bg-destructive/90">
              {t($ => $.smartCardUpload.history.deleteConfirmAction)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
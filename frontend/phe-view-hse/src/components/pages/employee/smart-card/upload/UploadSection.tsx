import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useUploadObservations, type UploadResult } from '@/service/employee/smart-card-upload';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { useAppTranslation } from "@/lib/i18n-typed";

interface UploadSectionProps {
  onUploadComplete?: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onUploadComplete }) => {
  const { t } = useAppTranslation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[] | null>(null);
  const [hasErrors, setHasErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useUploadObservations();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setUploadResults(null);
    setHasErrors(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setUploadResults(null);
    setHasErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const fileList = new DataTransfer();
    selectedFiles.forEach(file => fileList.items.add(file));

    try {
      const result = await uploadMutation.mutateAsync(fileList.files);
      if (result.success) {
        setUploadResults(result.results);
        setHasErrors(result.hasErrors);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t($ => $.smartCardUpload.uploadSection.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t($ => $.smartCardUpload.uploadSection.selectFiles)}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileSelect}
            className="block w-full p-4 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t($ => $.smartCardUpload.uploadSection.selectedFiles, { count: selectedFiles.length })}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFiles}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <X className="h-4 w-4 mr-1" />
                {t($ => $.smartCardUpload.uploadSection.clearAll)}
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {t($ => $.smartCardUpload.uploadSection.fileName)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploadMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {uploadMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {t($ => $.smartCardUpload.uploadSection.uploadButtonProcessing, { count: selectedFiles.length })}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {t($ => $.smartCardUpload.uploadSection.uploadButton, { count: selectedFiles.length })}
            </>
          )}
        </Button>

        {/* Upload Results */}
        {uploadResults && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold text-lg">{t($ => $.smartCardUpload.uploadSection.uploadCompleted)}</span>
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 mb-4">
                {t($ => $.smartCardUpload.uploadSection.totalFilesProcessed, { count: uploadResults.length })}
              </div>

              {/* File Results */}
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {result.filename}
                        </span>
                        <Badge 
                          variant={result.status === 'success' ? 'default' : 'destructive'}
                          className={`text-xs ${result.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-300' : ''}`}
                        >
                          {result.status === 'success' ? t($ => $.smartCardUpload.uploadSection.results.success) : t($ => $.smartCardUpload.uploadSection.results.failed)}
                        </Badge>
                      </div>
                    </div>

                    {result.status === 'success' && result.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                          <div className="text-blue-600 dark:text-blue-400 font-medium">{t($ => $.smartCardUpload.uploadSection.results.totalRows)}</div>
                          <div className="text-blue-900 dark:text-blue-100 font-bold">
                            {result.summary.totalRows}
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                          <div className="text-green-600 dark:text-green-400 font-medium">{t($ => $.smartCardUpload.uploadSection.results.successRows)}</div>
                          <div className="text-green-900 dark:text-green-100 font-bold">
                            {result.summary.insertedRows}
                          </div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                          <div className="text-yellow-600 dark:text-yellow-400 font-medium">{t($ => $.smartCardUpload.uploadSection.results.skippedRows)}</div>
                          <div className="text-yellow-900 dark:text-yellow-100 font-bold">
                            {result.summary.skippedRows || 0}
                          </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          <div className="text-red-600 dark:text-red-400 font-medium">{t($ => $.smartCardUpload.uploadSection.results.errorRows)}</div>
                          <div className="text-red-900 dark:text-red-100 font-bold">
                            {result.summary.errorRows || 0}
                          </div>
                        </div>
                      </div>
                    )}

                    {result.status === 'error' && result.error && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800">
                        <div className="text-red-800 dark:text-red-200 text-sm">{result.error}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Actions */}
              {hasErrors && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-orange-700 dark:text-orange-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{t($ => $.smartCardUpload.uploadSection.results.errorsDetected)}</span>
                      </div>
                      <span className="text-sm">
                        {/* {t($ => $.smartCardUpload.uploadSection.results.errorsDetected)} */}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/employee/smart-card-validation">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          {t($ => $.smartCardUpload.uploadSection.results.reviewErrors)}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
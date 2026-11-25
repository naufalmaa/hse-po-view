import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useReportCreate } from "@/service/report";
import { AppRoute } from "@/constants/app-route";
import { showNotifError } from "@/lib/show-notif";
import { RiFileExcel2Line } from "react-icons/ri";
import { useSubTypesList } from "@/service/sub-type-api";
import { REPORT_TYPE, USER_ROLE } from "@/constants/app-enum";
import { useAuth } from "@/hooks/use-auth";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkExcelTemplateType, importMarineExcel, importProjectExcel } from "@/components/pages/daily-report/create/lib/lib-import";
import { FormCreate, FormProjectFromFile, FormMarineFromFile } from "@/components/pages/daily-report/create";
import { SkeParagraph } from "@/components/custom/skeleton";
import { FilePlus, Upload, FileText, Activity } from "lucide-react";
import { ProgressDialog } from "@/components/custom/components";
import { useAppTranslation } from '@/lib/i18n-typed';
import { isCrewString } from '@/types/auth';

export const Route = createFileRoute(
  '/_private/daily-report/create',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const navigate = useNavigate()
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? USER_ROLE.contractor.value;

  const [importedData, setImportedData] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingImport, setLoadingImport] = useState<boolean>(false);
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    title: '',
    message: '',
    progress: 0,
    status: 'processing' as 'processing' | 'success' | 'error'
  });

  const pageListSubType = useSubTypesList();
  const reportNewMutation = useReportCreate();
  const [subTypes, setSubTypes] = useState<any>(null);
  const [excelProjectType, setExcelProjectType] = useState<string>('unknown');

  const isLoading = () => {
    return (pageListSubType.isPending || reportNewMutation.isPending);
  }
  useEffect(() => {
    if (pageListSubType.data) {
      setSubTypes(pageListSubType.data.map((item: any) => ({
        value: item.id,
        label: item.name
      })));
    }
  }, [pageListSubType.isSuccess]);


  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      showNotifError({ message: t($ => $.dailyReport.create.noFileSelected) });
      return;
    }

    // Only accept Excel files
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      showNotifError({ message: t($ => $.dailyReport.create.invalidExcelFile) });
      event.target.value = ''; // Reset the input
      return;
    }

    // Show progress dialog
    setProgressDialog({
      open: true,
      title: t($ => $.dailyReport.create.uploadExcelForm),
      message: t($ => $.dailyReport.create.processingExcelFile),
      progress: 0,
      status: 'processing'
    });
    setLoadingImport(true);

    try {
      // Simulate progress for file reading
      setProgressDialog(prev => ({ ...prev, message: t($ => $.dailyReport.create.processingExcelFile), progress: 20 }));
      const fileData = await readFileAsArrayBuffer(file);

      setProgressDialog(prev => ({ ...prev, message: t($ => $.dailyReport.marine.processing), progress: 40 }));
      const workbook = XLSX.read(fileData, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setProgressDialog({
          open: true,
          title: t($ => $.dialog.error),
          message: t($ => $.dailyReport.create.noSheetsFound),
          progress: 0,
          status: 'error'
        });
        return;
      }

      setProgressDialog(prev => ({ ...prev, message: t($ => $.dailyReport.create.processingExcelFile), progress: 60 }));
      const sheetNames = workbook.SheetNames;
      const sheetName = sheetNames.find((name: string) => name.toLowerCase().includes('summary'));
      if (!sheetName) {
        setProgressDialog({
          open: true,
          title: t($ => $.dialog.error),
          message: t($ => $.dailyReport.create.summarySheetNotFound),
          progress: 0,
          status: 'error'
        });
        return;
      }

      setProgressDialog(prev => ({ ...prev, message: t($ => $.dailyReport.create.processingExcelFile), progress: 80 }));
      const sheet = workbook.Sheets[sheetName];
      const fileTypeProject = checkExcelTemplateType(sheet);

      let processedData;
      setExcelProjectType(fileTypeProject);
      if (fileTypeProject === REPORT_TYPE.project.value) {
        processedData = importProjectExcel(sheet);
      } else if (fileTypeProject === REPORT_TYPE.marine.value) {
        processedData = importMarineExcel(sheet);
      } else {
        setProgressDialog({
          open: true,
          title: t($ => $.dialog.error),
          message: t($ => $.dailyReport.create.unsupportedTemplate),
          progress: 0,
          status: 'error'
        });
        return;
      }

      setProgressDialog(prev => ({ ...prev, message: t($ => $.dailyReport.create.successCreateReport), progress: 100, status: 'success' }));
      setImportedData({
        ...processedData,
        fileName: file.name
      });

    } catch (error) {
      setProgressDialog({
        open: true,
        title: t($ => $.dialog.error),
        message: error instanceof Error ? error.message : t($ => $.dailyReport.create.fileProcessingError),
        progress: 0,
        status: 'error'
      });
      setImportedData(null);
    } finally {
      setLoadingImport(false);
      // Reset the input to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) {
          reject(new Error(t($ => $.dailyReport.marine.emlFileErrors.readError)));
          return;
        }
        resolve(e.target.result as ArrayBuffer);
      };

      reader.onerror = () => {
        reject(new Error(t($ => $.dailyReport.marine.emlFileErrors.readError)));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const onDataUpdated = (body: Record<any, any>) => {
    let newBody = { ...body };
    if (newBody?.formType === REPORT_TYPE.marine.value) {
      delete newBody?.subtype
    }
    reportNewMutation.mutate(
      { body: newBody },
      {
        onSuccess: (data) => {
          // Show success dialog instead of notification
          setProgressDialog({
            open: true,
            title: t($ => $.dialog.success),
            message: data?.message || t($ => $.dailyReport.create.successCreateReport),
            progress: 100,
            status: 'success'
          });
          navigate({
            to: AppRoute.report.dailyReport.edit.url,
            search: { project_id: data?.data?.id, step: 2 }
          }).then(() => {
          })
        },
        onError: (error: any) => {
          // Show error dialog instead of notification
          setProgressDialog({
            open: true,
            title: t($ => $.dialog.error),
            message: error?.response?.data?.message ?? error?.message,
            progress: 0,
            status: 'error'
          });
        },
      }
    )
  }

  const formClassName = "flex flex-col gap-4 justify-center";
  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FilePlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.dailyReport.create.headerTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.dailyReport.create.headerDescription)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              {t($ => $.dailyReport.create.reportCreation)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading() && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <SkeParagraph />
        </div>
      )}

      {/* Main Content */}
      {!isLoading() && (
        <div className="bg-card rounded-xl shadow-sm border border-border">
          {/* Upload Section */}
          {!importedData && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t($ => $.dailyReport.create.reportOptions)}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t($ => $.dailyReport.edit.headerDescription)}
                  </p>
                </div>
                {!isCrewString(userRole) && <Badge variant="outline" className="px-3 py-1">
                  <FileText className="h-3 w-3 mr-1" />
                  {t($ => $.dailyReport.create.uploadExcelForm)}
                </Badge>}
              </div>

              {!isCrewString(userRole) && <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="flex-1">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-card border-border hover:bg-accent/50 transition-all duration-200"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingImport}
                  >
                    {loadingImport ? (
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    ) : (
                      <RiFileExcel2Line className="h-4 w-4 mr-2" />
                    )}
                    {loadingImport ? t($ => $.dailyReport.create.processingExcelFile) : t($ => $.dailyReport.create.uploadExcelForm)}
                  </Button>
                </div>
              </div>}
            </div>
          )}

          {/* Form Content */}
          <div className="p-0">
            {!importedData && (
              <FormCreate
                loading={isLoading()}
                formClassName={formClassName}
                onDataUpdated={onDataUpdated}
                subTypes={subTypes}
                userRole={userRole}
              />
            )}

            {(importedData && excelProjectType === REPORT_TYPE.project.value) && (
              <FormProjectFromFile
                loading={isLoading()}
                data={importedData}
                formClassName={formClassName}
                onDataUpdated={onDataUpdated}
                subTypes={subTypes}
                userRole={userRole}
                fileInputRef={fileInputRef}
                handleImportFileChange={handleImportFileChange}
                loadingImport={loadingImport}
                importedData={importedData}
                setImportedData={setImportedData}
              />
            )}

            {(importedData && excelProjectType === REPORT_TYPE.marine.value) && (
              <FormMarineFromFile
                loading={isLoading()}
                data={importedData}
                formClassName={formClassName}
                onDataUpdated={onDataUpdated}
                subTypes={subTypes}
                userRole={userRole}
                fileInputRef={fileInputRef}
                handleImportFileChange={handleImportFileChange}
                loadingImport={loadingImport}
                importedData={importedData}
                setImportedData={setImportedData}
              />
            )}
          </div>
        </div>
      )}

      {/* Progress Dialog */}
      <ProgressDialog
        open={progressDialog.open}
        title={progressDialog.title}
        message={progressDialog.message}
        progress={progressDialog.progress}
        status={progressDialog.status}
        onClose={() => setProgressDialog(prev => ({ ...prev, open: false }))}
        onConfirm={() => {
          if (progressDialog.status === 'success') {
            setProgressDialog(prev => ({ ...prev, open: false }));
          } else if (progressDialog.status === 'error') {
            setProgressDialog(prev => ({ ...prev, open: false }));
            // Retry logic could be added here if needed
          }
        }}
      />
    </div>
  )
}
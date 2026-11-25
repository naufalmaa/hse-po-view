import { useMutation } from "@tanstack/react-query";
import { AppApi } from "@/constants/app-api";


export interface DailyReportExportPdfParams {
  date?: string;
  date_start?: string;
  date_end?: string;
  formTypes?: string[];
  subtypes?: string[];
  vesselId?: string[];
  reportIds?: string[];
  showInspectionTables?: boolean;
}

// Note: The export PDF functionality uses a direct fetch since it returns a PDF blob
// rather than JSON data, which is different from typical react-query patterns
export const useDailyReportExportPdf = () => {
  return useMutation({
    mutationKey: ['daily-report-export-pdf'],
    mutationFn: async (params: DailyReportExportPdfParams = {}) => {
      const query = new URLSearchParams();
      if (params.date_start) query.append('date_start', params.date_start);
      if (params.date_end) query.append('date_end', params.date_end);
      if (params.formTypes) params.formTypes.forEach(ft => query.append('formTypes', ft));
      if (params.subtypes) params.subtypes.forEach(st => query.append('subtypes', st));
      if (params.vesselId) params.vesselId.forEach(v => query.append('vesselId', v));
      if (params.reportIds) params.reportIds.forEach(id => query.append('reportIds', id));
      if (params.showInspectionTables !== undefined) query.append('showInspectionTables', String(params.showInspectionTables));

      const queryString = query.toString();
      const endpoint = params.date
        ? `${AppApi.report.exportPdf}/${params.date}${queryString ? `?${queryString}` : ''}`
        : `${AppApi.report.exportPdf}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Return the blob for PDF handling
      return await response.blob();
    },
  });
};

// Mutation for reading .msg files - handles multipart form data upload and returns parsed HTML content
export const useDailyReportReadFile = () => {
  return useMutation({
    mutationKey: ['daily-report-read-file'],
    mutationFn: async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(AppApi.report.readMail, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    },
  });
};
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch-api';
import { AppApi } from '@/constants/app-api';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';

// Types
export interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  summary?: {
    totalRows: number;
    insertedRows: number;
    errorRows: number;
    skippedRows: number;
  };
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  results: UploadResult[];
  hasErrors: boolean;
  error?: string;
}

export interface UploadHistoryItem {
  id: string;
  filename: string;
  status: 'success' | 'error';
  hasErrors: boolean;
  totalRows?: number;
  validRows?: number;
  insertedRows?: number;
  errorRows?: number;
  skippedRows?: number;
  firstId?: string;
  lastId?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface UploadHistoryParams {
  limit?: number;
  page?: number;
  search?: string;
  status?: string[];
  dateStart?: string;
  dateEnd?: string;
  sortBy?: string;
  orderBy?: 'asc' | 'desc';
}

export interface UploadHistoryResponse {
  success: boolean;
  data: UploadHistoryItem[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}

export interface ErrorGroup {
  id: string;
  employeeName?: string;
  companyName?: string;
  count: number;
  errorType: string;
  sampleRow?: string;
  suggestions?: Array<{
    id: string;
    employeeName: string;
    companyName: string;
    similarity: number;
  }>;
}

export interface ErrorResponse {
  success: boolean;
  data: ErrorGroup[];
  count: number;
  error?: string;
}

export interface ReprocessResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Upload files mutation
export const useUploadObservations = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<UploadResponse> => {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetchApi({
        method: 'POST',
        url: AppApi.employee.smartCard.upload,
        body: formData,
        headers: {'Content-Type': 'multipart/form-data'},
        withCredentials: true
      });

      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        showNotifSuccess({ 
          message: `Upload completed successfully! ${data.results.length} file(s) processed.` 
        });
      } else {
        showNotifError({ message: data.error || 'Upload failed' });
      }
    },
    onError: (error) => {
      showNotifError({ message: `Upload failed: ${error.message}` });
    }
  });
};

// Upload history query
export const useUploadHistory = (params: UploadHistoryParams) => {
  return useQuery({
    queryKey: ['uploadHistory', params],
    queryFn: async (): Promise<UploadHistoryResponse> => {
      const queryParams: Record<string, any> = {};
      
      if (params.limit) queryParams.limit = params.limit;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.search) queryParams.search = params.search;
      if (params.status && params.status.length > 0) {
        queryParams.status = params.status;
      }
      if (params.dateStart) queryParams.date_start = params.dateStart;
      if (params.dateEnd) queryParams.date_end = params.dateEnd;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.orderBy) queryParams.orderBy = params.orderBy;

      const response = await fetchApi({
        method: "GET",
        url: AppApi.employee.smartCard.uploadHistory,
        params: queryParams,
      });
      
      return response;
    }
  });
};

// Upload errors query
export const useUploadErrors = () => {
  return useQuery({
    queryKey: ['uploadErrors'],
    queryFn: async (): Promise<ErrorResponse> => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.employee.smartCard.errors,
      });
      
      return response;
    }
  });
};

// Reprocess single error mutation
export const useReprocessError = () => {
  return useMutation({
    mutationFn: async ({ errorId, employeeId }: { errorId: string; employeeId?: string }): Promise<ReprocessResponse> => {
      const response = await fetchApi({
        method: "POST",
        url: `${AppApi.employee.smartCard.reprocessError}/${errorId}`,
        body: employeeId ? { employeeId } : {},
      });

      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        showNotifSuccess({ message: data.message });
      } else {
        showNotifError({ message: data.error || 'Reprocess failed' });
      }
    },
    onError: (error) => {
      showNotifError({ message: `Reprocess failed: ${error.message}` });
    }
  });
};

// Reprocess group mutation
export const useReprocessGroup = () => {
  return useMutation({
    mutationFn: async ({ groupId, employeeId }: { groupId: string; employeeId?: string }): Promise<ReprocessResponse> => {
      const response = await fetchApi({
        method: "POST",
        url: `${AppApi.employee.smartCard.reprocessGroup}/${groupId}`,
        body: employeeId ? { employeeId } : {},
      });

      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        showNotifSuccess({ message: data.message });
      } else {
        showNotifError({ message: data.error || 'Group reprocess failed' });
      }
    },
    onError: (error) => {
      showNotifError({ message: `Group reprocess failed: ${error.message}` });
    }
  });
};

// Delete upload history mutation
export const useDeleteUploadHistory = () => {
  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ success: boolean; message: string; data: { deletedCount: number } }> => {
      const response = await fetchApi({
        method: "DELETE",
        url: AppApi.employee.smartCard.deleteUploadHistory,
        body: { ids },
      });

      return response;
    }
  });
};

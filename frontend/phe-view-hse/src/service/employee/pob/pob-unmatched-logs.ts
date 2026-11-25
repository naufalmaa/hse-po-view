import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch-api';
import { AppApi } from '@/constants/app-api';

export interface UnmatchedLog {
    id: string;
    uploadedAt?: string | null;
    unmatchedCount?: number | null;
    filename?: string | null;
}

export interface PobUnmatchedLogsResponse {
    success: boolean;
    message?: string;
    data: UnmatchedLog[];
}

export const usePobUnmatchedLogs = () => {
    return useQuery({
        queryKey: ['pobUnmatchedLogs'],
        queryFn: async (): Promise<PobUnmatchedLogsResponse> => {
            const response = await fetchApi({
                method: 'GET',
                url: AppApi.employee.pobUnmatchedLogs,
                withCredentials: true
            });

            return response;
        }
    });
};

export const usePobUnmatchedLogDelete = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetchApi({
                method: 'DELETE',
                url: `${AppApi.employee.pobUnmatchedLogs}/${id}`,
                withCredentials: true
            });
            return response;
        }
    });
};

export interface UnmatchedLogSuggestion {
    id: string;
    similarity: number;
    companyName: string;
    employeeName: string;
}

export interface UnmatchedLogEntry {
    excelData: {
        NAME?: string;
        COMPANY?: string;
        "E-PASPORT"?: string;
        DEPARTMENT?: string;
        [key: string]: any;
    };
    suggestions: UnmatchedLogSuggestion[];
}

export interface UnmatchedLogSummary {
    totalUnmatched: number;
    withSuggestion: number;
    highCertainty: number;
    withoutSuggestion: number;
}

export interface UnmatchedLogMeta {
    total: number;
    page: number;
    view: number;
    totalPages: number;
}

export interface UnmatchedLogDetail extends UnmatchedLog {
    data: UnmatchedLogEntry[];
    summary?: UnmatchedLogSummary;
}

export interface PobUnmatchedLogDetailResponse {
    success: boolean;
    message?: string;
    data: UnmatchedLogDetail;
    meta?: UnmatchedLogMeta;
}

export interface PobUnmatchedLogDetailParams {
    page?: number;
    limit?: number;
    filter?: 'all' | 'with_suggestion' | 'without_suggestion';
    sortBy?: 'similarity' | 'name';
    orderBy?: 'asc' | 'desc';
}

export const usePobUnmatchedLogDetail = (id: string, params?: PobUnmatchedLogDetailParams) => {
    return useQuery({
        queryKey: ['pobUnmatchedLogDetail', id, params],
        queryFn: async (): Promise<PobUnmatchedLogDetailResponse> => {
            const response = await fetchApi({
                method: 'GET',
                url: `${AppApi.employee.pobUnmatchedLogs}/${id}`,
                params: params,
                withCredentials: true
            });

            return response;
        },
        enabled: !!id
    });
};

export interface ResolvePobSuggestionParams {
    logId: string;
    passportNumber: string;
    employeeId: string;
}

export const usePobResolveSuggestion = () => {
    return useMutation({
        mutationFn: async (data: ResolvePobSuggestionParams) => {
            const response = await fetchApi({
                method: 'POST',
                url: AppApi.employee.resolvePobSuggestion,
                body: data,
                withCredentials: true
            });
            return response;
        }
    });
};

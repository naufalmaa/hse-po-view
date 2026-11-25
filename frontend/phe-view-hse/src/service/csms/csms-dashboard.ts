import { useMutation } from "@tanstack/react-query";
import { fetchApi, axiosInstance } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Types based on backend response
export interface CsmsDashboardRequest {
  year?: number | number[];
  contractorId?: string | string[];
  page?: number;
  limit?: number;
}

export interface AssessmentObject {
  date: string,
  name: string,
  isComplete: boolean
}

export interface CompletionRateItem {
  contractId: string;
  contractTitle: string;
  contractfolderName: string;
  dateAssessment: string;
  isComplete: boolean;
}

export interface SemesterCompletionRate {
  completionRate: number;
  items: CompletionRateItem[];
}

export interface YearCompletionRateBreakdown {
  year: number;
  semester1: SemesterCompletionRate;
  semester2: SemesterCompletionRate;
}
export interface TimelineContract {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  onGoingAssessmentDates?: AssessmentObject[];
  finalAssessmentDate?: AssessmentObject;
}

export interface CsmsDashboardResponse {
  success: boolean;
  message: string;
  data: {
    totalFilesUploaded: number;
    qualificationAssessments: {
      notExpired: number;
      expired: number;
    };
    contracts: {
      withOngoingAssessments: number;
      withAllFoldersComplete: number;
    };
    totalContractors: number;
    completionPercentage: number;
    ongoingActivitiesCount: number;
    incomingActivitiesCount: number;
    completionRateBreakdown: YearCompletionRateBreakdown[];
    performanceMetrics: {
      pbSemester1: number;
      pbSemester2: number;
      paYearly: number;
      totalPerformance: number;
    };
    elementBreakdown: {
      elements: string[];
      semester1: {
        id: string;
        vendorName: string;
        vesselName: string;
        score: number | null;
        elementScores: Record<string, number | null>;
      }[];
      semester2: {
        id: string;
        vendorName: string;
        vesselName: string;
        score: number | null;
        elementScores: Record<string, number | null>;
      }[];
      penilaianAkhir?: {
        id: string;
        vendorName: string;
        vesselName: string;
        score: number | null;
        elementScores: Record<string, number | null>;
      }[];
    };
    timeline: {
      data: TimelineContract[],
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    };
  };
}

// Types for activities response
export interface Activity {
  id: string;
  contractId: string;
  contractName: string;
  startDate: string;
  endDate: string;
  status: string;
  daysRemaining?: number;
  assessmentType?: string;
}

export interface ActivitiesResponse {
  success: boolean;
  message: string;
  data: Activity[];
  "meta": {
    "total": number,
    "page": number,
    "view": number,
    "totalPages": number,
    "folderCount": number
  }
}

// CSMS Dashboard API
export const useCsmsDashboard = () => {
  return useMutation({
    mutationKey: ['csms-dashboard'],
    mutationFn: async (body: CsmsDashboardRequest) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.dashboard.dashboard,
        body,
        withCredentials: true
      });
      return response as CsmsDashboardResponse;
    },
  });
};

export const useCsmsDashboardExport = () => {
  return useMutation({
    mutationKey: ['csms-dashboard-export'],
    mutationFn: async (body: CsmsDashboardRequest) => {
      const response = await axiosInstance({
        method: "POST",
        url: AppApi.csms.dashboard.export,
        data: body,
        responseType: 'blob',
        withCredentials: true
      });
      return response.data as Blob;
    },
  });
};
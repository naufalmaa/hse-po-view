import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Types based on the backend service
export interface ListContractsParams {
  search?: string;
  subContractorId?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  view?: number;
  status?: '' | 'waiting' | 'complete' | 'rejected'
}

export interface ApprovalAction {
  status: 'accept' | 'rejected' | 'pending' | 'reopened';
  approvedAt: string;
  userName: string;
  note?: string;
}

export interface ApprovalHistory {
  evaluator?: ApprovalAction[];
  verifikator?: ApprovalAction[];
  manager?: ApprovalAction[];
}

export interface ApprovalStatus {
  currentApprovalLevel: 'evaluator' | 'verifikator' | 'manager' | null;
  nextRequiredLevel: 'evaluator' | 'verifikator' | 'manager' | null;
  isFullyApproved: boolean;
  approvalHistory: ApprovalHistory;
}

export interface OngoingAssessmentFolder {
  folderId: string;
  folderName: string;
  folderDate: string;
  isFinal: boolean;
  note: string | null;
  score: string;
  approvalStatus: ApprovalStatus;
}

export interface OngoingAssessmentDate {
  date: string;
  folderInfo: OngoingAssessmentFolder[];
}

export interface ListContractsResult {
  id: string;
  category?: string;
  vesselId?: string;
  vesselName?: string;
  contractorId: string;
  contractorName?: string;
  title: string;
  numberContract: string;
  startDate: string;
  endDate: string;
  nearestOngoingAssessmentDate?: OngoingAssessmentDate[];
  finalAssessmentDate?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    ongoingAssessmentsCompleted: number;
    finalAssessmentsCompleted: number;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  view: number;
  totalPages: number;
}

export interface OverallMetrics {
  ongoingAssessmentsCompleted: number;
  finalAssessmentsCompleted: number;
  totalContracts: number;
  completionRate: number;
}

export interface ApprovalMetrics {
  pendingForUser?: number;
  approvedByUser?: number;
  fullyApproved?: number;
  awaitingReview?: number;
}

export interface ListContractsResponse {
  success: true;
  data: ListContractsResult[];
  meta: PaginationMeta;
  overallMetrics: OverallMetrics;
  approvalMetrics?: ApprovalMetrics;
}

// List all contracts API - based on the listAllContracts function in list.service.ts
export const useContracts = () => {
  return useMutation({
    mutationKey: ['contracts'],
    mutationFn: async (params: ListContractsParams) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contract.contracts,
        body: params,
        withCredentials: true
      });
      return response as ListContractsResponse;
    },
  });
};
import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";
import { ApprovalStatus } from "./contracts";

export interface FolderInfo {
    folderId: string;
    folderName: string;
    folderDate: string;
    isComplete: boolean;
    isCompleteAssessment: boolean;
    colorType?: number;
}
export interface OngoinAssesmentDate {
    date: string;
    folderInfo: FolderInfo[];
}

export interface Contract {
    id: string;
    title: string;
    numberContract: string;
    riskAssessmentId?: string;
    riskLevel?: string;
    startDate: string;
    endDate: string;
    contractorId: string;
    contractorName?: string;
    category?: string;
    vesselId?: string;
    vesselName?: string;
    nearestOngoingAssessmentDate?: (OngoinAssesmentDate | string)[];
    finalAssessmentDate?: string;
    metrics?: {
        ongoingAssessmentsCompleted: number;
        finalAssessmentsCompleted: number;
    };
}
export interface Auditor {
    id: string;
    name: string;
}

// Email Sending Summary Interfaces
export interface EmailRecipient {
    email: string;
    status: string;
}

export interface EmailSendingSummary {
    sentAt: string;
    recipients: EmailRecipient[];
    totalSent: number;
    totalFailed: number;
}

export interface ContractFolder {
    id: string;
    name: string;
    fileType: 'folder' | 'file';
    contractId: string;
    parentId?: string;
    updatedAt?: string;
    children?: ContractFolder[];
    isComplete?: boolean;
    isEnabled?: boolean;
    status?: string;
    score?: number;
    note?: string;
    noteContractor?: string;
    /** who last changed the User note / the contractor note (null for older notes) */
    noteAuthor?: { name: string | null; role: string | null; at: string | null } | null;
    noteContractorAuthor?: { name: string | null; role: string | null; at: string | null } | null;
    isCompleteAssessment?: boolean;
    isFinal?: boolean | null;
    auditorNames?: Auditor[];
    approvalStatus?: ApprovalStatus;
    emailSendingSummary?: EmailSendingSummary[];
    isCopy?: number;
    isScore?: boolean;
    depth?: number;
    assessmentDate?: string;
    aiScore?: number;
    aiStatus?: string;
    aiReasoning?: string;
    aiProcessedAt?: string;
    exportStatistics?: {
        totalAssessmentFolders: number;
        fullyApprovedFolders: number;
        exportedFiles: number;
    };
}

export interface ContractDetails {
    contract: Contract;
    data: ContractFolder[];
}

// Contract Folders API
export const useContractFolders = () => {
    return useMutation({
        mutationKey: ['contract-folders'],
        mutationFn: async (contractId: string) => {
            const response = await fetchApi({
                method: "GET",
                url: `${AppApi.csms.contractManagement.contractFolders}?contractId=${encodeURIComponent(contractId)}`,
                withCredentials: true
            });
            return response as ContractDetails;
        },
    });
};

// Update assessment date
export const useUpdateAssessmentDate = () => {
    return useMutation({
        mutationKey: ['update-assessment-date'],
        mutationFn: async (data: { contractId: string, folderId?: string, assessmentDate: string }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.csms.contractManagement.assessmentDate,
                body: data,
                withCredentials: true
            });
            return response;
        },
    });
};

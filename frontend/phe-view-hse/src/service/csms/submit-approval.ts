import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Submit Folder Approval API
export interface SubmitApprovalParams {
    folderId: string;
    contractId: string;
    status: 'approved' | 'rejected';
    note?: string;
}

export interface SubmitApprovalResult {
    approvalId: string;
    folderId: string;
    approvalLevel: string;
    status: string;
    approvedAt: string;
    currentSummary: {
        currentApprovalLevel: 'evaluator' | 'verifikator' | 'manager' | null;
        nextRequiredLevel: 'evaluator' | 'verifikator' | 'manager' | null;
        isFullyApproved: boolean;
    };
}

export const useSubmitApproval = () => {
    return useMutation({
        mutationKey: ['submit-approval'],
        mutationFn: async (params: SubmitApprovalParams) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.csms.contract.submitApproval,
                body: params,
                withCredentials: true
            });
            return response as {
                success: boolean;
                message: string;
                data: SubmitApprovalResult;
            };
        },
    });
};

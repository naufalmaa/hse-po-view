import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";
// Types for the approval API
export interface AuditorRequest {
  contractId: string;
  userId: string;
  folderId?: string;
  action: 'add' | 'remove';
}

export interface AuditorResponse {
  success: boolean;
  message: string;
  affectedFolders: number;
}

// Approval API hook
export const useAuditor = () => {
  return useMutation<AuditorResponse, Error, AuditorRequest>({
    mutationKey: ['approval'],
    mutationFn: async (body) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.auditor,
        body,
        withCredentials: true
      });
      return response as AuditorResponse;
    },
  });
};
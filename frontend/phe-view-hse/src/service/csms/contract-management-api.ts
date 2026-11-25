import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchApi, axiosInstance } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Create Contract API
export const useCreateContract = () => {
  return useMutation({
    mutationKey: ['create-contract'],
    mutationFn: async (body: any) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.createContract,
        body,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

// Update Contract API
export const useUpdateContract = () => {
  return useMutation({
    mutationKey: ['update-contract'],
    mutationFn: async (body: { id: string;[key: string]: any }) => {
      const { id, ...updateData } = body;
      const response = await fetchApi({
        method: "PUT",
        url: `${AppApi.csms.contract.contracts}/${encodeURIComponent(id)}`,
        body: updateData,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

// Update Assessment Folder API
export const useUpdateAssessmentFolder = () => {
  return useMutation({
    mutationKey: ['update-assessment-folder'],
    mutationFn: async (body: { folderId: string; status: string; score: string; note: string; send_notif: boolean }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.updateAssessmentFolder,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

export interface BulkAssessmentItemPayload {
  folderId: string;
  status: string;
  score: number;
  note?: string;
}

// Bulk Update Assessment Folders API
export const useBulkAssessmentFolder = () => {
  return useMutation({
    mutationKey: ['bulk-assessment-folder'],
    mutationFn: async (body: { rootFolderId: string; items: BulkAssessmentItemPayload[] }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.bulkAssessmentFolder,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Update Folder API
export const useUpdateFolder = () => {
  return useMutation({
    mutationKey: ['update-folder'],
    mutationFn: async (body: { folderId: string; name?: string; description?: string, noteContractor?: string }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.updateFolder,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Generate Assessment Folder API
export const useGenerateAssessmentFolder = () => {
  return useMutation({
    mutationKey: ['generate-assessment-folder'],
    mutationFn: async (body: { contractId: string; assessmentType: string; assessmentDate: string }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.generateAssessmentFolder,
        body,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

// Delete Folder API
export const useDeleteFolder = () => {
  return useMutation({
    mutationKey: ['delete-folder'],
    mutationFn: async (folderId: string) => {
      const response = await fetchApi({
        method: "DELETE",
        url: `${AppApi.csms.contractManagement.deleteFolder}?folderId=${encodeURIComponent(folderId)}`,
        withCredentials: true
      });
      return response;
    },
  });
};

// Create Subfolder API
export const useCreateSubfolder = () => {
  return useMutation({
    mutationKey: ['create-subfolder'],
    mutationFn: async (body: { parentFolderId: string; folderName: string }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.createSubfolder,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Upload File to Folder API
export const useUploadFileToFolder = () => {
  return useMutation({
    mutationKey: ['upload-file-to-folder'],
    mutationFn: async (formData: FormData) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.uploadFileToFolder,
        body: formData,
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response;
    },
  });
};

// Update Assessment Dates API
export const useUpdateAssessmentDates = () => {
  return useMutation({
    mutationKey: ['update-assessment-dates'],
    mutationFn: async (body: { contractId: string; finalAssessmentDate?: string; nearestOngoingAssessmentDate: string[]; psbAssessmentDate?: string; folderDates?: { folderId: string; date: string }[] }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.updateAssessmentDates,
        body,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

// Delete Contract API
export const useDeleteContract = () => {
  return useMutation({
    mutationKey: ['delete-contract'],
    mutationFn: async (contractId: string) => {
      const response = await fetchApi({
        method: "DELETE",
        url: `${AppApi.csms.contractManagement.deleteContract}/${encodeURIComponent(contractId)}`,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

// Delete File API
export const useDeleteFile = () => {
  return useMutation({
    mutationKey: ['delete-file'],
    mutationFn: async (fileId: string) => {
      const response = await fetchApi({
        method: "DELETE",
        url: `${AppApi.csms.contractManagement.deleteFile}?fileId=${encodeURIComponent(fileId)}`,
        withCredentials: true
      });
      return response;
    },
  });
}

// File Details API
export const useFileDetails = () => {
  return useMutation({
    mutationKey: ['file-details'],
    mutationFn: async (fileId: string) => {
      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.csms.contractManagement.fileDetails}?folderId=${encodeURIComponent(fileId)}`,
        withCredentials: true
      });
      return response?.data;
    },
  });
};

export const useDuplicateContractDir = () => {
  return useMutation({
    mutationKey: ['file-details'],
    mutationFn: async (body: { sourceFolderId: string, targetFolderId: string, copyScores?: boolean, categoryNumbers?: number[] }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.duplicateContractDir,
        body: body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Admin: re-open a finalized assessment folder so the contractor can upload again
export const useDefinalizeFolder = () => {
  return useMutation({
    mutationKey: ['definalize-folder'],
    mutationFn: async (body: { folderId: string; reason: string }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.definalizeFolder,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

export const useUpdateFolderFinal = () => {
  return useMutation({
    mutationKey: ['update-folder-final'],
    mutationFn: async (body: { folderId: string; isFinal: boolean }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.updateFolderFinal,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Export Evaluation PDF API
export const useExportEvaluation = () => {
  return useMutation({
    mutationKey: ['export-evaluation'],
    mutationFn: async ({ contractId, folderId }: { contractId: string; folderId: string }) => {
      // For PDF downloads, we need to use axios directly to get the blob response
      const response = await axiosInstance({
        method: "GET",
        url: `${AppApi.csms.contractManagement.exportEvaluation}/${encodeURIComponent(contractId)}/${encodeURIComponent(folderId)}`,
        withCredentials: true,
        responseType: 'blob'
      });
      return response;
    },
  });
};

// Export Catatan Perbaikan PDF API
export const useExportCatatanPerbaikan = () => {
  return useMutation({
    mutationKey: ['export-catatan-perbaikan'],
    mutationFn: async ({ contractId, folderId }: { contractId: string; folderId: string }) => {
      // For PDF downloads, we need to use axios directly to get the blob response
      const response = await axiosInstance({
        method: "GET",
        url: `${AppApi.csms.contractManagement.exportWithNote}/${encodeURIComponent(contractId)}/${encodeURIComponent(folderId)}`,
        withCredentials: true,
        responseType: 'blob'
      });
      return response;
    },
  });
};

// Export E-CHSMS Excel API
export const useExportEchsms = () => {
  return useMutation({
    mutationKey: ['export-echsms'],
    mutationFn: async ({ contractId, folderId }: { contractId: string; folderId: string }) => {
      // For Excel downloads, we need to use axios directly to get the blob response
      const response = await axiosInstance({
        method: "GET",
        url: `${AppApi.csms.contractManagement.exportEchsms}/${encodeURIComponent(contractId)}/${encodeURIComponent(folderId)}`,
        withCredentials: true,
        responseType: 'blob'
      });
      return response;
    },
  });
};

// Export Folder as ZIP API
export const useExportFolderAsZip = () => {
  return useMutation({
    mutationKey: ['export-folder-as-zip'],
    mutationFn: async (folderId: string) => {
      // For ZIP downloads, we need to use axios directly to get the blob response
      const response = await axiosInstance({
        method: "GET",
        url: `${AppApi.csms.contractManagement.exportFolderAsZip}/${encodeURIComponent(folderId)}`,
        withCredentials: true,
        responseType: 'blob'
      });
      return response;
    },
  });
};

// Send Evaluation Report via Email API
export const useSendEmailEvaluation = () => {
  return useMutation({
    mutationKey: ['send-email-evaluation'],
    mutationFn: async (body: { contractId: string; folderId: string; recipientUserIds: string[] }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.sendEmailEvaluation,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// AI Evaluation - Trigger
export const useAiEvaluate = () => {
  return useMutation({
    mutationKey: ['ai-evaluate'],
    mutationFn: async (body: { folderId: string; retryFailed?: boolean; priorityOnly?: boolean; mode?: AiMode }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.aiEvaluate,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// AI Evaluation - Check Status (for polling)
export const useAiEvaluateStatus = () => {
  return useMutation({
    mutationKey: ['ai-evaluate-status'],
    mutationFn: async (jobId: string) => {
      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.csms.contractManagement.aiEvaluateStatus}?jobId=${encodeURIComponent(jobId)}`,
        withCredentials: true
      });
      return response;
    },
  });
};

// AI Evaluation - Get Active Job
export const useAiActiveJob = () => {
  return useMutation({
    mutationKey: ['ai-active-job'],
    mutationFn: async (folderId: string) => {
      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.csms.contractManagement.aiEvaluateActive}?folderId=${encodeURIComponent(folderId)}`,
        withCredentials: true
      });
      return response;
    },
  });
};

// AI Evaluation - Cancel a queued/processing job
export const useAiCancelJob = () => {
  return useMutation({
    mutationKey: ['ai-cancel-job'],
    mutationFn: async (body: { jobId: string }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.aiEvaluateCancel,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// AI Evaluation - Engine health (badge), refreshed every minute
export const useAiEngineHealth = () => {
  return useQuery({
    queryKey: ['ai-engine-health'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.csms.contractManagement.aiEngineHealth,
        withCredentials: true
      });
      return response;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export type AiMode = 'fast' | 'thorough';

// AI Evaluation - elements with files uploaded after their last AI run, and how many elements the
// "priority" option (not final for the evaluator / changed) would evaluate
export const useAiChanged = (folderId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['ai-changed', folderId],
    enabled: !!folderId && enabled,
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.csms.contractManagement.aiEvaluateChanged}?folderId=${encodeURIComponent(folderId!)}`,
        withCredentials: true
      });
      return response?.data as { changedIds: string[]; priorityCount: number };
    },
    staleTime: 30000,
  });
};

// AI quality (admin): agreement AI vs evaluator per element + recent corrections
export type AiQuality = {
  total: number;
  exactPct: number;
  nearPct: number;
  elements: { code: string; element: string; count: number; exactPct: number; nearPct: number; avgDiff: number }[];
  corrections: { id: string; elementCode: string; aiScore: number; evaluatorScore: number; reason: string; createdAt: string; userName?: string; contractTitle?: string; source: 'evaluator' | 'sintetis' }[];
};
export const useAiQuality = (contractId?: string) => {
  return useQuery({
    queryKey: ['ai-quality', contractId ?? 'all'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.csms.contractManagement.aiQuality,
        params: contractId ? { contractId } : {},
        withCredentials: true
      });
      return response?.data as AiQuality;
    },
  });
};

// AI rubric (admin)
export type AiRubricVersion = { id: string; version: number; label: string; sourceFilename?: string; isActive: boolean; createdAt: string; createdBy?: string; items: number };
export type AiRubricItem = Record<string, string>;
export const useAiRubricVersions = () => {
  return useQuery({
    queryKey: ['ai-rubric-versions'],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: AppApi.csms.contractManagement.aiRubricVersions, withCredentials: true });
      return response?.data as AiRubricVersion[];
    },
  });
};
export const useAiRubricItems = (versionId?: string) => {
  return useQuery({
    queryKey: ['ai-rubric-items', versionId ?? 'active'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.csms.contractManagement.aiRubricItems,
        params: versionId ? { versionId } : {},
        withCredentials: true
      });
      return response?.data as { versionId: string | null; items: AiRubricItem[]; columns: string[] };
    },
  });
};
export const useAiRubricUpdateItem = () => {
  return useMutation({
    mutationKey: ['ai-rubric-update-item'],
    mutationFn: async ({ no, fields }: { no: string; fields: Record<string, string> }) =>
      fetchApi({ method: "PUT", url: `${AppApi.csms.contractManagement.aiRubricItems}/${encodeURIComponent(no)}`, body: fields, withCredentials: true }),
  });
};
// P4: trial of a rubric version on reference (final) assessment folders
const AI_ADMIN = () => AppApi.csms.contractManagement.aiQuality.replace('/quality', '');
export type AiRubricTrial = {
  id: string; status: string; mode: string; progress?: string; createdAt: string; completedAt?: string;
  version?: number; label?: string; rootName: string;
  trial: { n: number; exactPct: number; nearPct: number }; baseline: { n: number; exactPct: number; nearPct: number }; lowConfidence: number;
};
export const useAiReferenceFolders = (enabled = true) =>
  useQuery({
    queryKey: ['ai-reference-folders'],
    enabled,
    queryFn: async () => (await fetchApi({ method: "GET", url: `${AI_ADMIN()}/reference-folders`, withCredentials: true }))?.data as
      { id: string; name: string; contractTitle: string; assessed: number }[],
  });
export const useAiRubricTrials = () =>
  useQuery({
    queryKey: ['ai-rubric-trials'],
    queryFn: async () => (await fetchApi({ method: "GET", url: `${AI_ADMIN()}/rubric/trials`, withCredentials: true }))?.data as AiRubricTrial[],
    refetchInterval: (q) => ((q.state.data as AiRubricTrial[] | undefined)?.some((t) => t.status === 'queued' || t.status === 'processing') ? 15000 : false),
  });
export const useAiRubricTrialStart = () =>
  useMutation({
    mutationKey: ['ai-rubric-trial-start'],
    mutationFn: async ({ versionId, rootIds, mode }: { versionId: string; rootIds: string[]; mode: AiMode }) =>
      fetchApi({ method: "POST", url: `${AI_ADMIN()}/rubric/versions/${versionId}/trial`, body: { rootIds, mode }, withCredentials: true }),
  });

export const useAiFeedbackDelete = () => {
  return useMutation({
    mutationKey: ['ai-feedback-delete'],
    mutationFn: async (id: string) =>
      fetchApi({ method: "DELETE", url: `${AppApi.csms.contractManagement.aiQuality.replace('/quality', '/feedback')}/${id}`, withCredentials: true }),
  });
};
export const useAiRubricActivate = () => {
  return useMutation({
    mutationKey: ['ai-rubric-activate'],
    mutationFn: async (versionId: string) =>
      fetchApi({ method: "POST", url: `${AppApi.csms.contractManagement.aiRubricVersions}/${versionId}/activate`, withCredentials: true }),
  });
};
export const useAiRubricImport = () => {
  return useMutation({
    mutationKey: ['ai-rubric-import'],
    mutationFn: async ({ file, label }: { file: File; label?: string }) => {
      const form = new FormData();
      if (label) form.append('label', label);
      form.append('file', file);
      const res = await axiosInstance.post(AppApi.csms.contractManagement.aiRubricImport, form, { withCredentials: true });
      return res.data;
    },
  });
};
/** Downloads the rubric version (active by default) as Excel, same columns as the import format. */
export const downloadAiRubricExcel = async (versionId?: string, label = 'aktif') => {
  const res = await axiosInstance.get(AppApi.csms.contractManagement.aiRubricExport, {
    params: versionId ? { versionId } : {},
    responseType: 'blob',
    withCredentials: true,
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rubrik-ai-marine-${label}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

// Apply AI Recommendation
export const useApplyAiRecommendation = () => {
  return useMutation({
    mutationKey: ['apply-ai-recommendation'],
    // preview: what applying would change; apply: elementIds; undo: restore the last apply
    mutationFn: async (body: { folderId: string; action: 'preview' | 'apply' | 'undo'; elementIds?: string[] }) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.csms.contractManagement.applyAi,
        body,
        withCredentials: true
      });
      return response;
    },
  });
};

// Export AI Evaluation Excel API
export const useExportAiEvaluation = () => {
  return useMutation({
    mutationKey: ['export-ai-evaluation'],
    mutationFn: async ({ contractId, folderId }: { contractId: string; folderId: string }) => {
      const response = await axiosInstance({
        method: "GET",
        url: `${AppApi.csms.contractManagement.exportAiEvaluation}?contractId=${encodeURIComponent(contractId)}&folderId=${encodeURIComponent(folderId)}`,
        withCredentials: true,
        responseType: 'blob'
      });
      return response;
    },
  });
};

// Copy PB to another period runs in the background: POST duplicateContractDir answers 202 { data: { jobId } },
// then this polls the job every 2 s until it is completed or failed.
export type CopyPbJobStatus = {
  success: boolean;
  status: 'running' | 'completed' | 'failed';
  progress: { done: number; total: number };
  message: string;
  data?: { copiedFiles?: unknown[]; failedFiles?: { fileName: string; error: string }[]; scoreCopiedCategories?: number[]; noteCopiedCategories?: number[] };
};

export const useCopyPbStatus = (jobId: string | null) => {
  return useQuery<CopyPbJobStatus>({
    queryKey: ['copy-pb-files-status', jobId],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.csms.contractManagement.copyPbFilesStatus}/${encodeURIComponent(jobId as string)}`,
        withCredentials: true
      });
      return response as CopyPbJobStatus;
    },
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data?.status === 'completed' || q.state.data?.status === 'failed' ? false : 2000),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    gcTime: 0,
    retry: 2,
  });
};

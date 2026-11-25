// src/types/contract.ts

export interface ListContractsParams {
  search?: string;
  vesselId?: string[];
  subContractorId?: string[];
  sort?: 'title' | 'contractorName' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  page?: number;
  view?: number;
  status?: 'waiting' | 'complete' | 'rejected' | '';
}

export interface ListContractsResult {
  id: string;
  contractorId: string;
  contractorName: string | null;
  category: string | null;
  vesselId: string | null;
  vesselName: string | null;
  title: string;
  numberContract: string;
  startDate: string | null;
  endDate: string | null;
  nearestOngoingAssessmentDate: any;
  finalAssessmentDate: string | null;
  note: string | null;
  extra: any;
  createdAt: Date;
  updatedAt: Date;
  metrics: {
    ongoingAssessmentsCompleted: number;
    finalAssessmentsCompleted: number;
  };
}

export interface OverallMetrics {
  ongoingAssessmentsCompleted: number;
  finalAssessmentsCompleted: number;
  totalContracts: number;
  completionRate: number;
}

// Define folder type based on the contractFolder schema
export interface BaseFolder {
  id: string;
  contractId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  path: string;
  depth: number | null;
  fileType: string | null;
  filePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean | null;
  isEnabled: boolean;
  isScore?: boolean;
  isEnabledEdit?: boolean; // Add this property to control edit/delete permissions
  isCompleteAssessment?: boolean; // For depth 0 folders: true if all children are assessed with values
  status?: string;
  score?: number | string;
  note?: string;
  isFinal?: boolean; // Add isFinal property
  isCopy?: number; // Track if folder/file is a copy (0: original, 1: copy, 2: modified copy)
  auditorNames?: Array<{ id: string; name: string }>; // Auditor names for depth 0 folders
  approvalStatus?: { // Approval status for depth 0 folders
    currentApprovalLevel: 'evaluator' | 'verifikator' | 'manager' | null;
    nextRequiredLevel: 'evaluator' | 'verifikator' | 'manager' | null;
    isFullyApproved: boolean;
    approvalHistory: Array<{
      level: string;
      status: 'approved' | 'rejected';
      note?: string;
      approvedAt: string;
      userName?: string;
    }>;
  };
}

// Extended folder type with children for the tree structure
export interface Folder extends BaseFolder {
  children: Folder[];
}
// src/types/user.ts

export interface ListContractorsVesselsParams {
  contractorId?: string;
  vesselId?: string;
  search?: string;
  sortBy?: 'vesselName' | 'type' | 'personnelCount' | 'contractorName';
  orderBy?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
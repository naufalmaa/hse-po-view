// src/types/report.ts

export interface ListDailyReportsParams {
  date_start?: string;
  date_end?: string;
  formTypes?: string[];
  instansi?: string[];
  subtypes?: string[];
  workLocations?: string[];
  vesselId?: string[];
  search?: string;
  sort?: 'reportDate' | 'formType' | 'instansi' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  page?: number;
  view?: number;
  showDetails?: boolean;
  groupByDate?: boolean;
  reportIds?: string[];
}

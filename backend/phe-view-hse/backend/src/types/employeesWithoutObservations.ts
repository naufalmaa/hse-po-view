// src/types/employeesWithoutObservations.ts
export interface EmployeeWithoutObservation {
  id: string;
  employeeName: string | null;
  companyName: string | null;
  position: string | null;
  category: string | null;
  statusOnDuty: boolean | null;
}

export interface ListEmployeesWithoutObservationsParams {
  limit?: number;
  page?: number;
  search?: string;
  company?: string | string[];
  position?: string[];
  category?: string[];
  statusOnDuty?: boolean[];
  date_start?: string;
  date_end?: string;
  sortBy?: string;
  orderBy?: 'asc' | 'desc';
  projectId?: string; // Add projectId parameter
  vesselId?: string; // Add vesselId parameter
}

export interface ObservationStatistics {
  totalActiveEmployees: number;
  totalAllEmployees: number;
  employeesWithObservations: number;
  employeesWithoutObservations: number;
}
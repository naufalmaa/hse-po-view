import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Types
export interface Company {
  id: string;
  name: string;
}

export interface Employee {
  employeeName: string;
  companyName: string;
  position: string;
  category: string;
  statusOnDuty: boolean;
}

export interface ObservationStatistics {
  totalAllEmployees: number;
  totalActiveEmployees: number;
  employeesWithObservations: number;
  employeesWithoutObservations: number;
}

export interface EmployeesWithoutObservationsParams {
  search?: string;
  company?: string;
  position?: string;
  category?: string;
  projectId?: string;
  vesselId?: string;
  date_start?: string;
  date_end?: string;
  sortBy?: string;
  orderBy?: string;
  limit?: number;
  page?: number;
}

export interface EmployeesWithoutObservationsResponse {
  success: boolean;
  message: string;
  data: Employee[];
  meta: {
    page: number;
    view: number;
    total: number;
    totalPages: number;
  };
  statistics: ObservationStatistics;
}

// Hooks
export const useObservationStatistics = () => {
  return useQuery({
    queryKey: ['observation-statistics'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.employee.smartCard.observationStatistics,
      });
      return response;
    },
  });
};

export const useEmployeesWithoutObservations = () => {
  return useMutation({
    mutationKey: ['employees-without-observations'],
    mutationFn: async (params: EmployeesWithoutObservationsParams) => {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.company) queryParams.append('company', params.company);
      if (params.position) queryParams.append('position', params.position);
      if (params.category) queryParams.append('category', params.category);
      if (params.projectId) queryParams.append('projectId', params.projectId);
      if (params.vesselId) queryParams.append('vesselId', params.vesselId);
      if (params.date_start) queryParams.append('date_start', params.date_start);
      if (params.date_end) queryParams.append('date_end', params.date_end);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.orderBy) queryParams.append('orderBy', params.orderBy);
      if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
      if (params.page !== undefined) queryParams.append('page', String(params.page));
      
      const url = `${AppApi.employee.smartCard.employeesWithoutObservations}?${queryParams.toString()}`;
      
      const response = await fetchApi({
        method: "GET",
        url,
        withCredentials: true,
      });
      return response as EmployeesWithoutObservationsResponse;
    },
  });
};

export interface Month {
  key: string;
  label: string;
}

export interface SmartCardDashboardEmployee {
  id: string;
  employeeName: string;
  companyName: string;
  category: string;
  position: string;
  monthlySubmissions: Record<string, number>;
  totalSubmissions: number;
  target: number;
  rate: number;
  companyId?: string;
  vesselId?: string;
  vesselName?: string;
  projectId?: string;
  projectName?: string;
}

export interface SmartCardDashboardResponse {
  success: boolean;
  message: string;
  data: SmartCardDashboardEmployee[];
  summary: {
    monthlyTotals: Record<string, number>;
    grandTotal: number;
  };
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
    date_start: string;
    date_end: string;
    months: Month[];
  };
}

export interface SmartCardDashboardParams {
  search?: string;
  company?: string;
  category?: string;
  position?: string;
  projectId?: string;
  vesselId?: string;
  date_start?: string;
  date_end?: string;
  sortBy?: string;
  orderBy?: string;
  limit?: number;
  page?: number;
  targetPerMonth?: number;
  employeeStatus?: string;
}

export const useSmartCardDashboard = () => {
  return useMutation({
    mutationKey: ['smart-card-dashboard'],
    mutationFn: async (params: SmartCardDashboardParams) => {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.company) queryParams.append('company', params.company);
      if (params.position) queryParams.append('position', params.position);
      if (params.category) queryParams.append('category', params.category);
      if (params.projectId) queryParams.append('projectId', params.projectId);
      if (params.vesselId) queryParams.append('vesselId', params.vesselId);
      if (params.date_start) queryParams.append('date_start', params.date_start);
      if (params.date_end) queryParams.append('date_end', params.date_end);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.orderBy) queryParams.append('orderBy', params.orderBy);
      if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
      if (params.page !== undefined) queryParams.append('page', String(params.page));
      if (params.targetPerMonth !== undefined) queryParams.append('targetPerMonth', String(params.targetPerMonth));
      if (params.employeeStatus) queryParams.append('employeeStatus', params.employeeStatus);
      
      const url = `${AppApi.employee.smartCard.dashboard}?${queryParams.toString()}`;
      
      const response = await fetchApi({
        method: "GET",
        url,
        withCredentials: true,
      });
      return response as SmartCardDashboardResponse;
    },
  });
};
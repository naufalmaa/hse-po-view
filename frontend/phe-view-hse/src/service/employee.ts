import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchApi, axiosInstance } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Define response type for employee deletion
interface EmployeeDeleteResponse {
  success: boolean;
  message: string;
  data?: {
    employeeId: string[];
    connections?: Record<string, any>;
  };
}


export interface EmployeeCreateResponse {
  success: boolean;
  message: string;
  data: {
    employee: {
      id: string;
      subContractorId: string;
      category: string;
      employeeName: string;
      dateOfBirth: string | null;
      position: string | null;
      image: string | null;
      vesselId: string | null;
      projectId: string | null;
      projectName: string;
      location: string | null;
      identityNumber: string;
      hssePassportNumber: string | null;
      statusOnDuty: boolean;
      linkDataEmployee: string | null;
      verifiedBy: string | null;
      verifiedDate: string | null;
      remarks: string | null;
      validationStatus: string;
      createdAt: string;
      updatedAt: string;
      subContractorName: string;
      vesselName: string;
      imageUrl: string;
    };
    contracts: any[];
    mcus: any[];
    bpjs: any[];
    vaccinations: any[];
    certificates: any[];
    sika: any[];
    files: any[];
  }
}

export const useEmployeeCreate = () => {
  return useMutation({
    mutationKey: ['employee-create'],
    mutationFn: async ({ body }: { body: any }) => {
      const data = await fetchApi({ method: "POST", url: AppApi.employee.create, body: body, withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
      return data as EmployeeCreateResponse;
    },
  });
}

export const useEmployeePut = () => {
  return useMutation({
    mutationKey: ['employee-put'],
    mutationFn: async ({ id, body }: { id: string, body: any }) => {
      return await fetchApi({
        method: "PUT",
        url: `${AppApi.employee.crud}/${id}`,
        body: body,
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
  });
}


export const useEmployeeDelete = () => {
  return useMutation({
    mutationKey: ['employee-delete'],
    mutationFn: async ({ body }: { body: any }) => {
      const data = await fetchApi({ method: "POST", url: AppApi.employee.delete, body: body, withCredentials: true });
      return data as EmployeeDeleteResponse;
    },
  });
}

export const useEmployeeDeleteSection = () => {
  return useMutation({
    mutationKey: ['employee-delete-section'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "POST", url: AppApi.employee.deleteSection, body: body, withCredentials: true });
    },
  });
}

export const useEmployeeDeleteFiles = () => {
  return useMutation({
    mutationKey: ['employee-delete-file'],
    mutationFn: async ({ body }: { body: any }) => {
      const data = await fetchApi({ method: "POST", url: AppApi.employee.deleteFiles, body: body, withCredentials: true });
      return data?.data;
    },
  });
}



export const useEmployeeCompanyRank = () => {
  return useMutation({
    mutationKey: ['employee-company-rank'],
    mutationFn: async ({ body }: { body: any }) => {
      const response = await fetchApi({ method: "POST", url: `${AppApi.employee.companyRank}`, body: body, withCredentials: true });
      return (response)
    },
  });
}


export const useEmployeeImportTemplate = () => {
  return useQuery({
    queryKey: ['employee-import-template'],
    queryFn: async () => {
      // For file downloads, we need to use axios directly to handle blob responses
      const response = await axiosInstance({
        method: "GET",
        url: AppApi.employee.importExcelTemplate,
        responseType: 'blob',
        withCredentials: true,
      });
      return response.data;
    },
  });
}
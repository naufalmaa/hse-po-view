import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export const useReportList = () => {
  return useMutation({
    mutationKey: ['report-list'],
    mutationFn: async ({ body }: { body: any }) => {
      const data = await fetchApi({ method: "POST", url: AppApi.report.list, body: body, withCredentials: true });
      return data;
    },
  });
}

export const useReportCreate = () => {
  return useMutation({
    mutationKey: ['report-create'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "POST", url: AppApi.report.create, body: body, withCredentials: true });
    },
  });
}

export const useReportGet = (project_id: string) => {
  return useQuery({
    queryKey: ['report-detail', project_id],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: `${AppApi.report.detail}/${project_id}`, withCredentials: true });
      return (response?.data)
    },
    enabled: !!project_id,
    // Add this to ensure fresh data
    // staleTime: 0,
  });
}

export const useReportCrud = () => {
  return useMutation({
    mutationKey: ['report-crud'],
    mutationFn: async ({ project_id, body }: { project_id: string, body: any }) => {
      return await fetchApi({ method: "PUT", url: `${AppApi.report.crud}/${project_id}`, body: body, withCredentials: true });
    },
  });
}

export const useReportCrudWithUpload = () => {
  return useMutation({
    mutationKey: ['report-crud-with-upload'],
    mutationFn: async ({ project_id, body }: { project_id: string, body: any }) => {
      return await fetchApi({ method: "PUT", url: `${AppApi.report.crudWithUpload}/${project_id}`, body: body, withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
    },
  });
}

export const useReportSectionDelete = () => {
  return useMutation({
    mutationKey: ['report-delete-section'],
    mutationFn: async ({ project_id, section_id, section_type }: { project_id: string, section_id: string, section_type: string }) => {
      return await fetchApi({ method: "DELETE", url: `${AppApi.report.sectionDelete}/${section_id}?reportId=${project_id}&type=${section_type}`, withCredentials: true });
    },
  });
}

export const useReportCrudFiles = () => {
  return useMutation({
    mutationKey: ['report-crud-files'],
    mutationFn: async ({ project_id, body }: { project_id: string, body: any }) => {
      return await fetchApi({ method: "POST", url: `${AppApi.report.crud}/file/${project_id}`, body: body, withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
    },
  });
}

export const useReportPatchFiles = () => {
  return useMutation({
    mutationKey: ['report-patch-files'],
    mutationFn: async ({ file_id, body }: { file_id: string, body: any }) => {
      return await fetchApi({ method: "PATCH", url: `${AppApi.report.crud}/file/${file_id}`, body: body, withCredentials: true });
    },
  });
}

export const useReportDeleteFiles = () => {
  return useMutation({
    mutationKey: ['report-delete-files'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "DELETE", url: `${AppApi.report.crud}/file`, body: body, withCredentials: true });
    },
  });
}

export const useReportDelete = () => {
  return useMutation({
    mutationKey: ['report-delete'],
    mutationFn: async ({ item }: { item: any }) => {
      return await fetchApi({ method: "DELETE", url: `${AppApi.report.crud}/${item?.id}`, withCredentials: true });
    },
  });
}

export const useReportWeather = (date: string, options: {}) => {
  return useQuery({
    queryKey: ['report-weather'],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: `${AppApi.report.weather}?date=${date}`, withCredentials: true });
      return (response)
    },
    ...options,
  });
}

export const useReportCategory = ({
  date,
  category,
  page = 0,
  limit = 10,
  options
}: {
  date: string;
  category: string;
  page?: number;
  limit?: number;
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>;
}) => {
  return useQuery({
    queryKey: ['report-category', date, category, page, limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        date,
        category,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.report.reportCategory}?${queryParams.toString()}`,
        withCredentials: true
      });

      return response;
    },
    ...options,
  });
};

export const useReportDuplicate = () => {
  return useMutation({
    mutationKey: ['report-duplicate'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({
        method: "POST",
        url: AppApi.report.duplicate,
        body: body,
        withCredentials: true,
      });
    },
  });
};

export const useReportDutyList = ({
  reportId,
  category,
  pobType,
  search,
  page = 0,
  limit = 10,
  options
}: {
  reportId: string;
  category?: string;
  pobType?: 'all' | 'phe' | 'contr';
  search?: string;
  page?: number;
  limit?: number;
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>;
}) => {
  return useQuery({
    queryKey: ['report-duty-list', reportId, category, pobType, search, page, limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        reportId,
        page: page.toString(),
        limit: limit.toString()
      });

      if (category) queryParams.append('category', category);
      if (pobType) queryParams.append('pobType', pobType);
      if (search) queryParams.append('search', search);

      const response = await fetchApi({
        method: "GET",
        url: `${AppApi.report.reportDutyList}?${queryParams.toString()}`,
        withCredentials: true
      });

      return response;
    },
    ...options,
  });
};

export const useReportSyncPob = () => {
  return useMutation({
    mutationKey: ['report-sync-pob'],
    mutationFn: async ({ reportId }: { reportId: string }) => {
      return await fetchApi({
        method: "POST",
        url: `${AppApi.report.syncPob}/${reportId}`,
        withCredentials: true,
      });
    },
  });
};
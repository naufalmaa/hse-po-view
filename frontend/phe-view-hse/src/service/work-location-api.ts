import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface WorkLocation {
  id: string;
  projectId: string;
  name: string;
  latitude: number | string | null;
  longitude: number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkLocationPayload {
  projectId: string;
  name: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export const useWorkLocations = (
  projectId?: string | null,
  options?: Partial<UseQueryOptions<WorkLocation[], Error>>
) => {
  return useQuery({
    queryKey: ['work-locations', projectId || 'all'],
    queryFn: async () => {
      const url = projectId
        ? `${AppApi.subTypes.workLocations}?projectId=${projectId}`
        : AppApi.subTypes.workLocations;
      const response = await fetchApi({
        method: "GET",
        url,
        withCredentials: true,
      });
      return (response?.data ?? []) as WorkLocation[];
    },
    enabled: projectId !== null && projectId !== undefined ? !!projectId : true,
    ...options,
  });
};

export const useCreateWorkLocation = () => {
  return useMutation({
    mutationKey: ['create-work-location'],
    mutationFn: async (payload: CreateWorkLocationPayload) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.subTypes.workLocations,
        body: {
          ...payload,
          latitude: payload.latitude !== '' && payload.latitude != null ? Number(payload.latitude) : null,
          longitude: payload.longitude !== '' && payload.longitude != null ? Number(payload.longitude) : null,
        },
        withCredentials: true,
      });
      return response?.data;
    },
  });
};

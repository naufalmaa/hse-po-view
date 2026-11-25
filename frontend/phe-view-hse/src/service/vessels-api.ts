import {useMutation, useQuery, UseQueryOptions} from "@tanstack/react-query";
import {fetchApi} from "@/lib/fetch-api";
import {AppApi} from "@/constants/app-api";


export const useVesselGet = (params?: { unassigned?: boolean }, options?: Partial<UseQueryOptions<any, Error>>) => {
  return useQuery({
    queryKey: ['vessel-list', params],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: AppApi.vessel.list, params, withCredentials: true });
      return(response?.data);
    },
    ...options
  });
}

export const useVesselCreate = () => {
  return useMutation({
    mutationKey: ['vessel-create'],
    mutationFn: async ({body}: { body: any }) => {
      return await fetchApi({method: "POST", url: AppApi.vessel.add, body: body, withCredentials: true});
    },
  });
}

export const useVesselCrud = () => {
  return useMutation({
    mutationKey: ['vessel-crud'],
    mutationFn: async ({id, body}: { id: string, body: any }) => {
      return await fetchApi({method: "PUT", url: `${AppApi.vessel.crud}/${id}`, body: body, withCredentials: true});
    },
  });
}

export const useVesselDelete = () => {
  return useMutation({
    mutationKey: ['vessel-delete'],
    mutationFn: async ({body}: { body: any }) => {
      return await fetchApi({method: "DELETE", url: `${AppApi.vessel.crud}/${body.id}`, body: body, withCredentials: true});
    },
  });
}
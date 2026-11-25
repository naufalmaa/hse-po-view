import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";


export const useSubTypesList = (options?: Partial<UseQueryOptions<any, Error>>) => {
  return useQuery({
    queryKey: ['sub-types-list'],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: `${AppApi.subTypes.list}`, withCredentials: true });
      return (response?.data);
    },
  });
}



export const useSubTypesCrud = () => {
  return useMutation({
    mutationKey: ['sub-types-crud'],
    mutationFn: async ({ id, body }: { id: string, body: any }) => {
      return await fetchApi({ method: "PUT", url: `${AppApi.subTypes.crud}/${id}`, body: body, withCredentials: true });
    },
  });
}

export const useSubTypesDelete = () => {
  return useMutation({
    mutationKey: ['sub-types-delete'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "DELETE", url: `${AppApi.subTypes.crud}/${body.id}`, body: body, withCredentials: true });
    },
  });
}

export const useSubTypesDisableAllAuto = () => {
  return useMutation({
    mutationKey: ['sub-types-disable-all-auto'],
    mutationFn: async () => {
      return await fetchApi({
        method: "POST",
        url: `${AppApi.subTypes.disableAllAuto}`,
        body: {},
        withCredentials: true,
      });
    },
  });
};
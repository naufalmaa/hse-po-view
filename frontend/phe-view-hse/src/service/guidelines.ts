import {useMutation, useQuery} from "@tanstack/react-query";
import {fetchApi} from "@/lib/fetch-api";
import {AppApi} from "@/constants/app-api";

export const useGuidelinesGet = () => {
  return useQuery({
    queryKey: ['guidelines-list'],
    queryFn: async () => {
      const response = await fetchApi({method: "GET", url: `${AppApi.csms.guidelines.list}`, withCredentials: true});
      return(response?.data)
    },
  });
}

export const useGuidelinesPost = () => {
  return useMutation({
    mutationKey: ['guidelines-post'],
    mutationFn: async ({body}: {body: any }) => {
      return await fetchApi({method: "POST", url: `${AppApi.csms.guidelines.create}`, body: body, withCredentials: true, headers: {'Content-Type': 'multipart/form-data'}});
    },
  });
}

export const useGuidelinesCrud = () => {
  return useMutation({
    mutationKey: ['guidelines-crud'],
    mutationFn: async ({id, body}: { id: string, body: any }) => {
      return await fetchApi({method: "PUT", url: `${AppApi.csms.guidelines.crud}/${id}`, body: body, withCredentials: true, headers: {'Content-Type': 'multipart/form-data'}});
    },
  });
}

export const useGuidelinesDelete = () => {
  return useMutation({
    mutationKey: ['guidelines-delete'],
    mutationFn: async ({id}: {id: string}) => {
      return await fetchApi({method: "DELETE", url: `${AppApi.csms.guidelines.crud}/${id}`, withCredentials: true});
    },
  });
}

export const useGuidelinesDeleteAssets = () => {
  return useMutation({
    mutationKey: ['guidelines-delete-assets'],
    mutationFn: async ({body}: {body: Record<string, any>}) => {
      return await fetchApi({method: "DELETE", url: `${AppApi.csms.guidelines.deleteAssets}`, body: body, withCredentials: true});
    },
  });
}
import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";


export const useContractorGet = (params?: { page?: number; limit?: number; search?: string; category?: string }, options?: Partial<UseQueryOptions<any, Error>>) => {
  return useQuery({
    queryKey: ['contractor-list', params],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: AppApi.contractor.list, params });
      return (response?.data);
    },
    ...options
  });
}

export const useContractorGetV2 = (params?: { page?: number; limit?: number; search?: string; category?: string }, options?: Partial<UseQueryOptions<any, Error>>) => {
  return useQuery({
    queryKey: ['contractor-list-v2', params],
    queryFn: async () => {
      const response = await fetchApi({ method: "GET", url: AppApi.contractor.list, params });
      return (response);
    },
    ...options
  });
}

export const useContractorGetV3 = (params?: { page?: number; limit?: number; search?: string; category?: string }, options?: Partial<UseQueryOptions<any, Error>>) => {
  return useQuery({
    queryKey: ['contractor-list-v3', params],
    queryFn: async () => {
      // Create URLSearchParams for proper query parameter serialization
      const queryParams = new URLSearchParams();
      
      // Add standard parameters
      if (params?.page !== undefined) queryParams.append('page', String(params.page));
      if (params?.limit !== undefined) queryParams.append('limit', String(params.limit));
      if (params?.search !== undefined) queryParams.append('search', params.search);
      
      // Handle category parameter splitting
      if (params?.category) {
        const categories = params.category.split(',');
        // Add each category as a separate parameter with the same key
        categories.forEach(category => {
          const trimmedCategory = category.trim();
          if (trimmedCategory === 'null') {
            queryParams.append('category', 'null');
          } else {
            queryParams.append('category', trimmedCategory);
          }
        });
      }
      
      // Construct URL with query parameters
      const urlWithParams = `${AppApi.contractor.list}?${queryParams.toString()}`;
      
      const response = await fetchApi({ method: "GET", url: urlWithParams });
      return response;
    },
    ...options
  });
}

export const useContractorCreate = () => {
  return useMutation({
    mutationKey: ['contractor-create'],
    mutationFn: async ({body }: { body: Record<string, any> }) => {
      return await fetchApi({ method: "POST", url: AppApi.contractor.add, body: body});
    },
  });
}

export const useContractorUpdate = () => {
  return useMutation({
    mutationKey: ['contractor-update'],
    mutationFn: async ({body }: { body: Record<string, any> }) => {
      return await fetchApi({ method: "PUT", url: AppApi.contractor.update, body: body});
    },
  });
}

export const useContractorDelete = () => {
  return useMutation({
    mutationKey: ['contractor-delete'],
    mutationFn: async ({body }: { body: Record<string, any> }) => {
      return await fetchApi({ method: "DELETE", url: AppApi.contractor.delete, body: body});
    },
  });
}
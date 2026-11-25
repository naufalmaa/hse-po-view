import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export type ListContractorVesselsParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  contractorId?: string;
};

export const useContractorVesselList = () => {
  return useMutation({
    mutationKey: ['contractor-vessel-list'],
    mutationFn: async ({ body }: { body: ListContractorVesselsParams }) => {
      return await fetchApi({ 
        method: "POST", 
        url: `${AppApi.contractorVessel.list}`, 
        body: body, 
        withCredentials: true 
      });
    },
  });
};

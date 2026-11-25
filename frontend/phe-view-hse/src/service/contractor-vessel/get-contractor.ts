import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export const useContractorVesselGetContractor = () => {
  return useQuery({
    queryKey: ['contractor-vessel-get-contractor'],
    queryFn: async () => {
      const response = await fetchApi({ 
        method: "GET", 
        url: `${AppApi.contractorVessel.getContractor}`, 
        withCredentials: true 
      });
      return response;
    },
  });
};

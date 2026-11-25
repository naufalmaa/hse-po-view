import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export const useContractorVesselAssign = () => {
  return useMutation({
    mutationKey: ['contractor-vessel-assign'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ 
        method: "POST", 
        url: `${AppApi.contractorVessel.assign}`, 
        body: body, 
        withCredentials: true 
      });
    },
  });
};

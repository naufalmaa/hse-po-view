import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export const useContractorVesselRemove = () => {
  return useMutation({
    mutationKey: ['contractor-vessel-remove'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ 
        method: "POST", 
        url: `${AppApi.contractorVessel.remove}`, 
        body: body, 
        withCredentials: true 
      });
    },
  });
};

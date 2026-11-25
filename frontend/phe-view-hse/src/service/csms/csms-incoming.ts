import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";
import { CsmsDashboardRequest, ActivitiesResponse } from "./csms-dashboard";

// CSMS Incoming Activities API
export const useCsmsIncomingActivities = () => {
    return useMutation({
        mutationKey: ['csms-incoming-activities'],
        mutationFn: async (body: CsmsDashboardRequest) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.csms.dashboard.incoming,
                body,
                withCredentials: true
            });
            return response as ActivitiesResponse;
        },
    });
};

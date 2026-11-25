import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";
import { CsmsDashboardRequest, ActivitiesResponse } from "./csms-dashboard";

// CSMS Ongoing Activities API
export const useCsmsOngoingActivities = () => {
    return useMutation({
        mutationKey: ['csms-ongoing-activities'],
        mutationFn: async (body: CsmsDashboardRequest) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.csms.dashboard.ongoing,
                body,
                withCredentials: true
            });
            return response as ActivitiesResponse;
        },
    });
};

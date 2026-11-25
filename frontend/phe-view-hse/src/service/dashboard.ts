import {useMutation} from "@tanstack/react-query";
import {fetchApi} from "@/lib/fetch-api";
import {AppApi} from "@/constants/app-api";

export const useDashboardMetrics = () => {
  return useMutation({
    mutationKey: ['dashboard-metrics'],
    mutationFn: async ({body}: { body: any }) => {
      const response = await fetchApi({method: "POST", url: AppApi.dashboard.metrics, body: body, withCredentials: true});
      return(response?.data);
    },
  });
};

export const useDashboardExportPdf = () => {
  return useMutation({
    mutationKey: ['dashboard-export-pdf'],
    mutationFn: async (params: any = {}) => {
      const response = await fetch(AppApi.dashboard.exportPdf, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    },
  });
};
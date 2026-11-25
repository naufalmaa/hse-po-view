import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {fetchApi} from "@/lib/fetch-api";
import {AppApi} from "@/constants/app-api";

interface NotificationQueryParams {
  onlyUnread?: boolean;
  orderBy?: 'asc' | 'desc';
  limit?: number;
  page?: number;
}

export const useNotificationGet = (params: NotificationQueryParams = {}) => {
  const queryParams = new URLSearchParams();

  if (params.onlyUnread !== undefined) queryParams.append('onlyUnread', String(params.onlyUnread));
  if (params.orderBy) queryParams.append('orderBy', params.orderBy);
  if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
  if (params.page !== undefined) queryParams.append('page', String(params.page));

  const queryString = queryParams.toString();
  const url = queryString ? `${AppApi.notification.list}?${queryString}` : AppApi.notification.list;

  return useQuery({
    queryKey: ['notification-list', params],
    queryFn: async () => {
      return await fetchApi({
        method: "GET",
        url,
        withCredentials: true
      });
    },
  });
}

export const useNotificationMark = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      return await fetchApi({
        method: "PATCH",
        url: `${AppApi.notification.crud}/${notificationId}`,
        withCredentials: true
      });
    },
    onSuccess: () => {
      // Invalidate all notification queries to refresh them
      queryClient.invalidateQueries({ queryKey: ['notification-list'] });
    },
  });
}

export const useNotificationMarkAll = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return await fetchApi({
        method: "PATCH",
        url: AppApi.notification.markAll,
        withCredentials: true
      });
    },
    onSuccess: () => {
      // Invalidate all notification queries to refresh them
      queryClient.invalidateQueries({ queryKey: ['notification-list'] });
    },
  });
}
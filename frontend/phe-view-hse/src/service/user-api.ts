import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface ChangePasswordPayload {
  CurrentPassword: string;
  newPassword: string;
}

export const useChangePassword = () => {
  return useMutation({
    mutationKey: ['change-password'],
    mutationFn: async ({ body }: { body: ChangePasswordPayload }) => {
      const response = await fetchApi({
        method: "PUT",
        url: AppApi.user.changePassword,
        body: body
      });
      return response;
    },
  });
};

// User type based on backend response
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  banned: boolean;
  image: string | null;
  signature: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  subContractors?: any[]; // Optional for contractor users
  vessel?: any; // Optional for crew users
}

// Response type for user info
export interface UserInfoResponse {
  success: boolean;
  message: string;
  data: User;
}

// Payload for updating user
export interface UpdateUserPayload {
  name?: string;
  email?: string;
  image?: string | null;
  signature?: string | null;
}

export const useGetUserInfo = () => {
  return useQuery<UserInfoResponse>({
    queryKey: ['user-info'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.user.userInfo
      });
      return response as UserInfoResponse;
    },
  });
};

export const useUpdateUser = () => {
  return useMutation({
    mutationKey: ['update-user'],
    mutationFn: async ({ body }: { body: UpdateUserPayload }) => {
      const response = await fetchApi({
        method: "PUT",
        url: AppApi.user.update,
        body: body,
        headers: {'Content-Type': 'multipart/form-data'}
      });
      return response;
    },
  });
};

export interface ListUsersResponse {
  success: boolean;
  message: string;
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string | string[];
}

export const useListUsers = (params?: ListUsersParams) => {
  return useQuery<ListUsersResponse>({
    queryKey: ['list-users', params],
    queryFn: async () => {
      // Build query string from params
      const queryParams = new URLSearchParams();
      
      if (params?.page !== undefined) {
        queryParams.append('page', params.page.toString());
      }
      
      if (params?.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      
      if (params?.role) {
        if (Array.isArray(params.role)) {
          params.role.forEach(role => queryParams.append('role', role));
        } else {
          queryParams.append('role', params.role);
        }
      }
      
      const queryString = queryParams.toString();
      const url = queryString 
        ? `${AppApi.auth.listUsers}?${queryString}` 
        : AppApi.auth.listUsers;
        
      const response = await fetchApi({
        method: "GET",
        url: url
      });
      
      return response as ListUsersResponse;
    },
  });
};

export interface UserSession {
  id: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  token: string; // Added token field to match backend response
}

export const useUserSessionsQuery = () => {
  return useQuery<UserSession[]>({
    queryKey: ['userSessions'],
    queryFn: async () => {
      const response = await fetchApi({method: "GET", url: AppApi.user.sessionsList});
      return response.data;
    },
  });
}

// Add the revoke other sessions mutation
export interface RevokeOtherSessionsPayload {
  token: string;
}

export interface RevokeOtherSessionsResponse {
  success: boolean;
  message: string;
}

export const useRevokeOtherSessions = () => {
  return useMutation<RevokeOtherSessionsResponse, Error, RevokeOtherSessionsPayload>({
    mutationKey: ['revoke-other-sessions'],
    mutationFn: async (payload: RevokeOtherSessionsPayload) => {
      const response = await fetchApi({
        method: "POST",
        url: AppApi.user.revokeOtherSessionsV1,
        body: payload
      });
      return response;
    },
  });
}

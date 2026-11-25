import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface AdminUser {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: boolean;
    image: string | null;
    role: string;
    banned: boolean;
    banReason: string | null;
    banExpires: string | null;
    createdAt: string;
    updatedAt: string;
    hssePassportNumber: string | null;
}

export interface AdminUserListResponse {
    success: boolean;
    message: string;
    data: AdminUser[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    summary: {
        admin: number;
        user: number;
        contractor: number;
        crew: number;
        employee: number;
    };
}

export const useAdminUserList = (params?: { page?: number; limit?: number; search?: string }) => {
    return useQuery<AdminUserListResponse>({
        queryKey: ['admin-user-list', params],
        queryFn: async () => {
            const response = await fetchApi({ method: "GET", url: `${AppApi.admin.user.list}`, params });
            return response as AdminUserListResponse;
        },
    });
}

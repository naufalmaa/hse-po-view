import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";



export const useAdminUserCreate = () => {
  return useMutation({
    mutationKey: ['admin-user-create'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "POST", url: `${AppApi.admin.user.create}`, body: body });
    },
  });
}

export const useAdminUserPut = () => {
  return useMutation({
    mutationKey: ['admin-user-put'],
    mutationFn: async ({ id, body }: { id: string, body: any }) => {
      return await fetchApi({ method: "PUT", url: `${AppApi.admin.user.crud}/${id}`, body: body });
    },
  });
}

export const useAdminUserDelete = () => {
  return useMutation({
    mutationKey: ['admin-user-delete'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "DELETE", url: `${AppApi.admin.user.delete}`, body: body });
    },
  });
}

export const useAdminChangePassword = () => {
  return useMutation({
    mutationKey: ['admin-user-change-password'],
    mutationFn: async ({ body }: { body: any }) => {
      return await fetchApi({ method: "PUT", url: `${AppApi.admin.user.changePassword}`, body: body });
    },
  });
}
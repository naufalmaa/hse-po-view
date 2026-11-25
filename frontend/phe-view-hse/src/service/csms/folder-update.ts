import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface UpdateFolderBody {
    folderId: string;
    name?: string;
    description?: string;
    noteContractor?: string;
}

export const useUpdateFolder = () => {
    return useMutation({
        mutationKey: ['update-folder'],
        mutationFn: async (body: UpdateFolderBody) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.csms.contractManagement.updateFolder,
                body,
                withCredentials: true
            });
            return response;
        },
    });
};

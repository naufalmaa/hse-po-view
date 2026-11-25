import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export type SubTypesCreatePayload = {
    name: string;
    location?: string | null;
    hoursPobPheOses?: number;
    hoursPobContractor?: number;
    target?: number;
    autoCalculateManhours?: boolean;
    workLocations?: Array<{
        id?: string;
        name: string;
        latitude?: number | string | null;
        longitude?: number | string | null;
    }>;
    [key: string]: any;
};

export type SubTypesCreateResponse = {
    success: boolean;
    message: string;
    data: any;
};

export const useSubTypesCreate = () => {
    return useMutation<SubTypesCreateResponse, Error, SubTypesCreatePayload>({
        mutationKey: ["sub-types-create"],
        mutationFn: async (body) => {
            return await fetchApi({
                method: "POST",
                url: AppApi.subTypes.crud,
                body: body,
                withCredentials: true,
            });
        },
    });
};

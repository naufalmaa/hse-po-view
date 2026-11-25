import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch-api';
import { AppApi } from '@/constants/app-api';


export interface PobItem {
    employeeName?: string;
    projectName?: string;
    identityNumber?: string;
    hssePassportNumber?: string;
    statusOnDuty?: boolean;
}

export interface PobData {
    marine?: PobItem[];
    project?: PobItem[];
    mitra?: PobItem[];
    logId?: string;
    [key: string]: any;
}

export interface PobUpdateResponse {
    success: boolean;
    message: string;
    data: PobData;
}

export interface PobUpdateParams {
    file: File;
    updates?: boolean;
    category?: string;
}

export const usePobUpdate = () => {
    return useMutation({
        mutationKey: ['pobUpdate'],
        mutationFn: async ({ file, updates, category }: PobUpdateParams): Promise<PobUpdateResponse> => {
            const formData = new FormData();
            formData.append('file', file);
            if (updates !== undefined) {
                formData.append('updates', String(updates));
            }
            if (category) {
                formData.append('category', category);
            }

            const response = await fetchApi({
                method: 'POST',
                url: AppApi.employee.pobUpdate,
                body: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });

            return response;
        }
    });
};

import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface EmployeeImportExcelResponse {
    success: boolean;
    message: string;
    data: {
        totalRows: number;
        insertedRows: number;
        errorRows: number;
        errors: {
            row: number;
            errors: string[];
            data: {
                "Employee Name": string;
                "Positions": string;
                "Company Name": string;
                [key: string]: any;
            };
            skipped: boolean;
        }[];
    };
}

export const useEmployeeImportExcel = () => {
    return useMutation({
        mutationKey: ['employee-import-excel'],
        mutationFn: async ({ body }: { body: any }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employee.importExcel,
                body: body,
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response as EmployeeImportExcelResponse;
        },
    });
}

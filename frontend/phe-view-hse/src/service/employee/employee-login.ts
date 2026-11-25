import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

interface EmployeeLoginPayload {
    hssePassportNumber: string;
    password: string;
}

interface EmployeeLoginResponse {
    token: string;
    user: any;
    message?: string;
}

export const useEmployeeLogin = () => {
    return useMutation({
        mutationKey: ['employee-login'],
        mutationFn: async ({ body }: { body: EmployeeLoginPayload }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.auth.loginHssePassport,
                body: body,
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' },
                skipErrorHandling: true
            });
            return response as EmployeeLoginResponse;
        },
    });
}

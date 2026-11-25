import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface AttendanceUpdateData {
    id: string;
    employeeId: string;
    attendanceDate: string;
    statusAfter: string;
    photoEvidence?: string;
    notes?: string;
    createdAt: string;
}

export interface AttendanceUpdateResponse {
    success: boolean;
    message: string;
    data?: AttendanceUpdateData;
}

export interface UpdateAttendanceParams {
    status: 'on_duty' | 'off_duty';
    notes?: string;
    position?: Record<string, any>;
    photoEvidence?: File;
}

export const useAttendanceUpdate = () => {
    return useMutation({
        mutationKey: ['attendance-update'],
        mutationFn: async (body: FormData) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employees.attendance.update,
                body: body,
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response as AttendanceUpdateResponse;
        },
    });
}

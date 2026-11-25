import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

export interface AttendanceListParams {
    employeeId?: string;
    date_start?: string;
    date_end?: string;
    limit?: number;
    page?: number;
    status?: ('on_duty' | 'off_duty')[];
}

export interface Attendance {
    id: string;
    employeeId: string;
    attendanceDate?: string | undefined;
    statusAfter?: string;
    photoEvidence?: string | null;
    notes?: string;
    coordinate?: string | null;
    locationName?: string | null;
    createdAt: string;
    position?: string;
    employeeName?: string;
    subContractorName?: string;
    daysOnBoard?: number;
    locationAttendance?: {
        latitude?: string;
        longitude?: string;
        [key: string]: any;
    };
    locationAttendanceName?: string;
    workLocationId?: string | null;
    workLocationName?: string | null;
}

export interface AttendanceListResponse {
    success: boolean;
    data: Attendance[];
    message: string;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const useAttendanceList = () => {
    return useMutation({
        mutationKey: ['attendance-list'],
        mutationFn: async ({ body }: { body: AttendanceListParams }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employees.attendance.list,
                body: body,
                withCredentials: true
            });
            return response as AttendanceListResponse;
        },
    });
}

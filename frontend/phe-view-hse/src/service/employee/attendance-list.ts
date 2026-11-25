
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Employee interface
export interface Employee {
    id: string;
    subContractorId: string;
    category: string;
    employeeName: string;
    dateOfBirth: string | null;
    position: string | null;
    image: string | null;
    vesselId: string | null;
    projectId: string | null;
    projectName: string;
    location: string | null;
    identityNumber: string;
    hssePassportNumber: string | null;
    statusOnDuty: boolean;
    linkDataEmployee: string | null;
    verifiedBy: string | null;
    verifiedDate: string | null;
    remarks: string | null;
    validationStatus: string;
    createdAt: string;
    updatedAt: string;
    subContractorName: string;
    vesselName: string;
    imageUrl: string;
    ohihReview: string | null;
}

// Attendance interface
export interface Attendance {
    id: string;
    employeeId: string;
    attendanceDate?: string;
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
    lastStatusUpdate?: string;
    locationAttendance?: string | {
        latitude?: number;
        longitude?: number;
        [key: string]: any;
    };
    locationAttendanceName?: string;
    workLocationId?: string | null;
    workLocationName?: string | null;
}

export type AttendanceStatus = 'on_duty' | 'off_duty';

// Employee with Attendance History
export interface EmployeeWithAttendance extends Employee {
    attendanceHistory: Attendance[];
    lastOnDuty: Attendance | null;
    lastOffDuty: Attendance | null;
}

// Params interface
export interface AttendanceListParams {
    employeeId?: string;
    date_start?: string;
    date_end?: string;
    limit?: number;
    page?: number;
    status?: AttendanceStatus[];
    search?: string;
    sortBy?: string;
    orderBy?: 'asc' | 'desc';
    category?: ('marine' | 'mitra' | 'project')[];
    position?: string[];
    subContractorId?: string[];
    vesselId?: string[];
    projectId?: string[];
    location?: string[] | string;
}

// Pagination meta interface
export interface AttendanceListMeta {
    page: number;
    totalEmployees: number;
    totalAttendanceRecords: number;
    totalPages: number;
    view?: number;
    date_start?: string;
    date_end?: string;
}

// Complete response interface
export interface AttendanceListResponse {
    success: boolean;
    message: string;
    data: EmployeeWithAttendance[];
    meta?: AttendanceListMeta;
}

export const useAttendanceList = () => {
    return useMutation({
        mutationKey: ['attendance-list'],
        mutationFn: async ({ body }: { body: AttendanceListParams }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employee.attendanceList,
                body: body,
                withCredentials: true
            });
            return response as AttendanceListResponse;
        },
    });
}

export interface ManageAttendanceBody {
    action: 'create' | 'update' | 'delete';
    employeeId?: string;
    attendanceId?: string;
    statusAfter?: 'on_duty' | 'off_duty';
    attendanceDate?: string;
    createdAt?: string;
    notes?: string;
    position?: any;
    workLocationId?: string | null;
}

export const useManageAttendance = () => {
    return useMutation({
        mutationKey: ['attendance-manage'],
        mutationFn: async (body: ManageAttendanceBody) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employee.attendanceManage,
                body: body,
                withCredentials: true
            });
            return response;
        },
    });
}

export const useEmployeeLocations = () => {
    return useQuery({
        queryKey: ['employee-locations'],
        queryFn: async () => {
            const response = await fetchApi({
                method: "GET",
                url: AppApi.employee.locations,
                withCredentials: true
            });
            return response?.data || [];
        },
    });
}


export const exportAttendanceExcel = async (body: AttendanceListParams) => {
    const { axiosInstance } = await import("@/lib/fetch-api");
    const { AppApi } = await import("@/constants/app-api");
    
    const response = await axiosInstance({
        method: "POST",
        url: AppApi.employee.attendanceList,
        data: { ...body, convertExcel: true },
        responseType: 'blob',
        withCredentials: true
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_List_${new Date().getTime()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

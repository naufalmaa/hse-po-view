import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";
import { WorkLocation } from "@/service/work-location-api";

export interface EmployeeAttendanceProfile {
  id: string;
  employeeName: string;
  category?: string;
  projectId?: string | null;
  projectName?: string | null;
  location?: string | null;
  position?: string | null;
  hssePassportNumber: string;
  workLocations: WorkLocation[];
}

export interface EmployeeProfileResponse {
  success: boolean;
  message: string;
  data: EmployeeAttendanceProfile;
}

export const useEmployeeAttendanceProfile = () => {
  return useQuery({
    queryKey: ['employee-attendance-profile'],
    queryFn: async () => {
      const response = await fetchApi({
        method: "GET",
        url: AppApi.employees.attendance.profile,
        withCredentials: true,
      });
      return response as EmployeeProfileResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
};

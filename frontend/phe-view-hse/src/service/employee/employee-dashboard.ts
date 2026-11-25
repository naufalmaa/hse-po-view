import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Define types for compliance per document
export interface CompliancePerDocument {
    key: string;
    pct: number;
    count: number;
    total: number;
}

// Define types for health risk per category
export interface HealthRiskPerCategory {
    category: string;
    pct: number;
    count?: number;
    total?: number;
}

// Define types for CrewOnDutyByProject
export interface CrewOnDutyByProject {
    subContractorId: string;
    subContractorName: string;
    projectId: string;
    projectName: string;
    crewOnDuty: number;
}

// Define types for CrewOnDutyByVessel
export interface CrewOnDutyByVessel {
    subContractorId: string;
    subContractorName: string;
    vesselId: string;
    vesselName: string;
    crewOnDuty: number;
}

// Define the main dashboard data structure
export interface EmployeeDashboardData {
    totalEmployees: number;
    employeesOnDuty: number;
    overallCompliancePct: number | {
        pct: number;
        count: number;
        total: number;
    };
    overallHealthRiskAboveP3Pct: {
        pct: number;
        count: number;
        total: number;
    };
    compliancePerDocument: CompliancePerDocument[];
    healthRiskPerCategory: HealthRiskPerCategory[];
    crewOnDutyByProject: CrewOnDutyByProject[];
    crewOnDutyByVessel: CrewOnDutyByVessel[];
    contractorCategories?: string[];
    allowedContractorIds?: string[];
}

// Define the complete response structure
export interface EmployeeDashboardResponse {
    success: boolean;
    message: string;
    data: EmployeeDashboardData;
}

export const useEmployeeDashboard = () => {
    return useMutation({
        mutationKey: ['employee-dashboard'],
        mutationFn: async ({ body }: { body: any }) => {
            const response = await fetchApi({
                method: "POST",
                url: `${AppApi.employee.dashboard}`,
                body: body,
                withCredentials: true
            });
            return response as EmployeeDashboardResponse;
        },
    });
}

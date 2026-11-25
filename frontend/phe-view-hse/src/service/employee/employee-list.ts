import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

// Contract interface
export interface EmployeeContract {
    id: string;
    employeeId: string;
    contractCode: string;
    expiredDate: string;
    expiredDateCompany: string | null;
}

// MCU (Medical Check-Up) interface
export interface EmployeeMcu {
    id: string;
    employeeId: string;
    mcuDate: string;
    mcuExpiredDate: string;
    mcuHospitalName: string;
    mcuDeviationNotes: string;
    mcuFollowUp: string;
    ohihReview: string;
    statusKelaikanBekerja: string;
    skjScore: string;
}

// BPJS interface
export interface EmployeeBpjs {
    id: string;
    employeeId: string;
    type: string;
    number: string;
}

// Vaccination interface
export interface EmployeeVaccination {
    id: string;
    employeeId: string;
    vaccineDate: string;
    vaccineStatus: string;
}

// Certificate interface
export interface EmployeeCertificate {
    id: string;
    employeeId: string;
    name: string;
    expiredDate: string;
    isPermanent: boolean;
    status: string | null;
    lastValidatedAt: string | null;
    aliases: string | null;
}

// SIKA interface
export interface EmployeeSika {
    id: string;
    employeeId: string;
    type: string;
    status: string;
    expiredDate: string;
}

// File interface
export interface EmployeeFile {
    id: string;
    employeeId: string;
    contractId: string | null;
    mcuId: string | null;
    bpjsId: string | null;
    vaccinationId: string | null;
    certificateId: string | null;
    sikaId: string | null;
    type: string;
    fileName: string;
    filePath: string;
    fileType: string;
    uploadedAt: string;
    url: string;
    thumbnailUrl: string;
}

// Main Employee interface
export interface Employee {
    id: string;
    subContractorId: string;
    category: string;
    employeeName: string;
    dateOfBirth: string;
    position: string;
    image: string | null;
    vesselId: string | null;
    projectId: string | null;
    projectName: string;
    location: string;
    identityNumber: string | null;
    hssePassportNumber: string;
    statusOnDuty: boolean;
    linkDataEmployee: string | null;
    verifiedBy: string | null;
    verifiedDate: string | null;
    remarks: string | null;
    otherHealthAssurance: string | null;
    ppe: string | null;
    validationStatus: string;
    createdAt: string;
    updatedAt: string;
    subContractorName: string;
    vesselName: string;
    imageUrl: string;
    contracts: EmployeeContract[];
    mcus: EmployeeMcu[];
    bpjs: EmployeeBpjs[];
    vaccinations: EmployeeVaccination[];
    certificates: EmployeeCertificate[];
    sika: EmployeeSika[];
    files: EmployeeFile[];
    lastStatusUpdate: string | null;
    daysOnBoard: number;
}

// Pagination meta interface
export interface EmployeeListMeta {
    page: number;
    view: number; // API uses 'view' instead of 'limit'
    limit: number;
    total: number;
    totalPages: number;
}

// Complete response interface
export interface EmployeeListResponse {
    success: boolean;
    message: string;
    data: Employee[];
    meta?: EmployeeListMeta;
}

export const useEmployeeList = () => {
    return useMutation({
        mutationKey: ['employee-list'],
        mutationFn: async ({ body }: { body: any }) => {
            const response = await fetchApi({
                method: "POST",
                url: AppApi.employee.list,
                body: body,
                withCredentials: true
            });
            return response as EmployeeListResponse;
        },
    });
}

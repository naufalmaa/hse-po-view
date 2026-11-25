import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch-api";
import { AppApi } from "@/constants/app-api";

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
    identityNumber: string | null;
    hssePassportNumber: string | null;
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
}

export interface Contract {
    id: string;
    employeeId: string;
    contractCode: string;
    expiredDate: string | null;
    expiredDateCompany: string | null;
}

export interface Mcu {
    id: string;
    employeeId: string;
    mcuDate: string;
    mcuExpiredDate: string;
    mcuHospitalName: string;
    mcuDeviationNotes: string;
    mcuFollowUp: string;
    ohihReview: string;
    statusKelaikanBekerja: string | null;
    skjScore: string | null;
}

export interface Bpjs {
    id?: string;
    employeeId?: string;
    bpjsEmployment?: string;
    bpjsHealth?: string;
    [key: string]: any;
}

export interface Vaccination {
    id: string;
    employeeId: string;
    vaccineDate?: string | null;
    vaccineStatus?: string;
}

export interface Certificate {
    id: string;
    employeeId: string;
    name: string;
    expiredDate: string | null;
    isPermanent?: boolean;
    status?: string | null;
    lastValidatedAt?: string | null;
    aliases?: string | null;
}

export interface Sika {
    id: string;
    employeeId: string;
    type?: string | null;
    status?: string | null;
    expiredDate?: string | null;
}

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

export interface NavigationNode {
    id: string;
    employeeName: string;
    category: string;
}

export interface Navigation {
    previous: NavigationNode | null;
    next: NavigationNode | null;
}

export interface EmployeeDetailData {
    employee: Employee;
    contracts: Contract[];
    mcus: Mcu[];
    bpjs: Bpjs[];
    vaccinations: Vaccination[];
    certificates: Certificate[];
    sika: Sika[];
    files: EmployeeFile[];
    navigation: Navigation;
}

export interface EmployeeDetailResponse {
    success: boolean;
    message: string;
    data: EmployeeDetailData;
}

export const useEmployeeDetail = () => {
    return useMutation({
        mutationKey: ['employee-detail'],
        mutationFn: async ({ id, body }: { id: string, body: any }) => {
            const response = await fetchApi({
                method: "POST",
                url: `${AppApi.employee.detail}/${id}`,
                body: body,
                withCredentials: true
            });
            return response as EmployeeDetailResponse;
        },
    });
}

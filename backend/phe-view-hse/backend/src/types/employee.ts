// src/types/employee.ts
import { employees, smartCardObservations } from "../db/schema/employee.schema.ts";
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export interface ListEmployeeParams {
  userId?: string;
  role?: 'admin' | 'user' | 'contractor' | 'crew';
  employeeId?: string;
  date_start?: string;
  date_end?: string;
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: keyof typeof employees;
  orderBy?: 'asc' | 'desc';
  showDetails?: boolean;
  category?: ('marine' | 'mitra' | 'project')[];
  position?: string[];
  statusOnDuty?: boolean[];
  subContractorId?: string[];
  vesselId?: string[];
  projectId?: string[];
  location?: string[] | string;
  onlyVerified?: boolean;
  complianceDocKey?: 'BPJS' | 'Contract' | 'Vaccine' | 'SIKA' | 'MCU' | 'BSS' | 'BST' | 'Competency Certificate' | 'all' | string[];
  documentStatus?: 'empty' | 'expired' | 'near_expiry' | 'filled';
  ohihReview?: string[];
}

export interface DeleteByEmployeeIdInput {
  employeeId: string | string[];
  hardDelete?: boolean;
}

export interface DeleteSectionInput {
  section: 'contracts' | 'mcus' | 'bpjs' | 'vaccinations' | 'sika' | 'certificates';
  sectionId: string | string[];
}

export interface DeleteFileInput {
  fileId: string | string[];
}

// Smart Card Types
export type SmartCardObservation = InferSelectModel<typeof smartCardObservations>;
export type SmartCardObservationInsert = InferInsertModel<typeof smartCardObservations>;

// Attendance Types
export type AttendanceStatus = 'on_duty' | 'off_duty';

export interface ListAttendanceParams {
  employeeId?: string | string[];
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
  location?: string[] | string;
  subContractorId?: string[];
  vesselId?: string[];
  projectId?: string[];
}


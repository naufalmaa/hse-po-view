import { db } from '../../db/index.ts';
import { employees, employeeStatus, attendance } from '../../db/schema/employee.schema.ts';
import { subContractors } from '../../db/schema/auth.schema.ts'; // Import subcontractors table
import { subtypes, workLocations } from '../../db/schema/report.schema.ts'; // Import subtypes table
import { eq, desc, inArray, and, lte, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// Define the return type for our service
export interface OnDutyEmployee extends InferSelectModel<typeof employees> {
  dob: number;
  lastStatusUpdate: Date;
  subContractorName?: string; // Added subcontractor name
  projectName: string | null; // Added project (subtype) name
  name?: string; // alias for employeeName
  company?: string; // alias for subContractorName
  companyName?: string;
}

// Define the parameters for our service
export interface GetOnDutyEmployeesParams {
  projectId?: string; // Filter by project (subtype) ID
  category?: string[];
  vesselId?: string; // Filter by vessel ID
  workLocationId?: string | null; // Filter by work location ID
  targetDate?: string | Date; // Reference date for DOB and attendance
  minDob?: number; // Filter minimum DOB
  pobType?: 'all' | 'phe' | 'contr';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all employees who are on duty on targetDate (or currently on duty if targetDate not provided)
 */
export async function getOnDutyEmployeesService(params?: GetOnDutyEmployeesParams): Promise<{
  data: OnDutyEmployee[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const { projectId, category, vesselId, workLocationId, targetDate, minDob, pobType, search, page = 0, limit = 10 } = params || {};
  const offset = page * limit;

  // Determine reference date for DOB calculation and attendance filtering
  const refDate = targetDate ? new Date(targetDate) : new Date();
  const refDateStr = refDate.toISOString().split('T')[0];

  // Optional target work location details for name matching fallback
  let targetLocationName: string | null = null;
  if (workLocationId) {
    const [loc] = await db
      .select({ name: workLocations.name })
      .from(workLocations)
      .where(eq(workLocations.id, workLocationId));
    if (loc?.name) {
      targetLocationName = loc.name.trim().toLowerCase();
    }
  }

  // Build query conditions
  // When targetDate is provided, on-duty status is determined historically by attendance on targetDate,
  // NOT by live employees.statusOnDuty (which only tracks status today)
  const conditions: any[] = [];
  if (!targetDate) {
    conditions.push(eq(employees.statusOnDuty, true));
  }
  
  // Add vesselId filter if provided
  if (vesselId) {
    conditions.push(eq(employees.vesselId, vesselId));
  }
  
  // Add category filter if provided
  if (category && category.length > 0) {
    conditions.push(inArray(employees.category, category));
  }

  // Add projectId filter if provided (matching assigned project or mitra applicable to project)
  if (projectId) {
    conditions.push(
      sql`(${employees.projectId} = ${projectId} OR (${employees.category} = 'mitra' AND (${employees.projectId} = ${projectId} OR ${employees.projectId} IS NULL)))`
    );
  }

  // Get employees matching project/category filters
  // Join with subcontractors table to get the company name
  // Join with subtypes table to get the project name
  const onDutyEmployees = await db
    .select({
      employee: employees,
      subContractorName: subContractors.name,
      projectName: subtypes.name
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .leftJoin(subtypes, eq(employees.projectId, subtypes.id))
    .where(conditions.length > 0 ? (conditions.length > 1 ? and(...conditions) : conditions[0]) : undefined);

  // For each employee, check their latest attendance status on or before targetDate
  const results: OnDutyEmployee[] = [];
  
  for (const record of onDutyEmployees) {
    const employee = record.employee;
    
    // Always check attendance - employee must have attendance record with status 'on_duty' on or before refDate
    const attendanceConditions = [
      eq(attendance.employeeId, employee.id),
      lte(attendance.attendanceDate, refDateStr)
    ];

    const [latestAttendance] = await db
      .select()
      .from(attendance)
      .where(and(...attendanceConditions))
      .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt))
      .limit(1);
    
    // Employee must have latest attendance record with status 'on_duty' on or before refDate
    if (!latestAttendance || latestAttendance.statusAfter !== 'on_duty') {
      continue;
    }

    // Filter by workLocationId if specified
    if (workLocationId) {
      let effectiveWorkLocId = latestAttendance.workLocationId;
      // Fallback: If no workLocationId on attendance, check employee's location string
      if (!effectiveWorkLocId && employee.location && targetLocationName) {
        if (employee.location.trim().toLowerCase() === targetLocationName) {
          effectiveWorkLocId = workLocationId;
        }
      }

      if (effectiveWorkLocId !== workLocationId) {
        continue;
      }
    }
    
    // Get the most recent status update for this employee
    const [latestStatusUpdate] = await db
      .select()
      .from(employeeStatus)
      .where(eq(employeeStatus.employeeId, employee.id))
      .orderBy(desc(employeeStatus.updatedAt))
      .limit(1);

    // Calculate Days On Board (DOB) using currentCycleStartDate or attendance date
    let daysOnBoard = 0;
    if (latestStatusUpdate?.currentCycleStartDate) {
      const startDate = new Date(latestStatusUpdate.currentCycleStartDate);
      const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const refUtc = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
      const diffDays = Math.floor((refUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
      daysOnBoard = Math.max(1, diffDays);
    } else if (latestAttendance?.attendanceDate) {
      const startDate = new Date(latestAttendance.attendanceDate);
      const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const refUtc = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
      const diffDays = Math.floor((refUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
      daysOnBoard = Math.max(1, diffDays);
    }

    // Apply minDob filter if provided
    if (minDob !== undefined && daysOnBoard < minDob) {
      continue;
    }

    const isMitra = (employee.category || '').toLowerCase().trim() === 'mitra';
    const companyDisplayName = record.subContractorName || (isMitra ? 'PHE OSES' : undefined);
    
    // Include employee in results
    results.push({
      ...employee,
      name: employee.employeeName || undefined,
      company: companyDisplayName,
      companyName: companyDisplayName,
      subContractorName: companyDisplayName,
      projectName: record.projectName ?? null,
      dob: daysOnBoard,
      lastStatusUpdate: latestStatusUpdate?.updatedAt || new Date()
    });
  }

  // Helper to identify PHE OSES workers
  const isPheWorker = (emp: any) => {
    const cat = emp.category ? emp.category.toLowerCase().trim() : '';
    const comp = (emp.company || emp.subContractorName || '').toLowerCase().trim();
    return cat === 'mitra' || emp.subContractorId === '4861d25a-2c31-417e-bb55-277251606f8d' || comp.includes('phe');
  };

  // Filter by pobType if specified
  let filteredResults = results;
  if (pobType === 'phe') {
    filteredResults = filteredResults.filter(emp => isPheWorker(emp));
  } else if (pobType === 'contr') {
    filteredResults = filteredResults.filter(emp => !isPheWorker(emp));
  }

  // Filter by search keyword if specified
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filteredResults = filteredResults.filter(emp => {
      const name = (emp.name || emp.employeeName || '').toLowerCase();
      const comp = (emp.company || emp.subContractorName || '').toLowerCase();
      const pos = (emp.position || '').toLowerCase();
      const hsse = (emp.hssePassportNumber || '').toLowerCase();
      return name.includes(term) || comp.includes(term) || pos.includes(term) || hsse.includes(term);
    });
  }

  // Sort by days on duty (descending)
  const sortedResults = filteredResults.sort((a, b) => b.dob - a.dob);
  
  // Apply pagination
  const paginatedResults = sortedResults.slice(offset, offset + limit);
  
  return {
    data: paginatedResults,
    meta: {
      total: filteredResults.length,
      page,
      limit,
      totalPages: Math.ceil(filteredResults.length / limit)
    }
  };
}
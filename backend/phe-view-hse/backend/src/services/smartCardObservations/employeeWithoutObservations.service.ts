import type { AnyColumn } from 'drizzle-orm';
import type { EmployeeWithoutObservation, ListEmployeesWithoutObservationsParams, ObservationStatistics } from '../../types/employeesWithoutObservations.ts';
import { db } from '../../db/index.ts';
import { employees, smartCardObservations } from '../../db/schema/employee.schema.ts';
import { subContractors, userContractors } from '../../db/schema/auth.schema.ts';
import { eq, notExists, and, ne, gte, lte, between, ilike, or, desc, asc, count, inArray } from 'drizzle-orm';

const sortByColumns: Record<string, AnyColumn> = {
  employeeName: employees.employeeName,
  position: employees.position,
  category: employees.category,
  statusOnDuty: employees.statusOnDuty,
  companyName: subContractors.name,
};

/**
 * Standardized list service for employees without observations
 * Follows the same pattern as employee list service
 */
export async function listEmployeesWithoutObservationsService(params: ListEmployeesWithoutObservationsParams): Promise<{
  data: EmployeeWithoutObservation[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
    date_start: string;
    date_end: string;
  };
}> {
  const {
    limit = 10,
    page = 0,
    search,
    company,
    position,
    category,
    statusOnDuty,
    date_start,
    date_end,
    sortBy = 'employeeName',
    orderBy = 'asc',
    projectId, // Add projectId parameter
    vesselId, // Add vesselId parameter
  } = params;

  const offset = page * limit;
  const whereConditions: any[] = [];

  // Build the observation filter conditions for NOT EXISTS
  const observationConditions = [eq(smartCardObservations.employeeId, employees.id)];
  
  if (date_start && date_end) {
    observationConditions.push(
      between(smartCardObservations.observationDate, date_start, date_end)
    );
  } else if (date_start) {
    observationConditions.push(
      gte(smartCardObservations.observationDate, date_start)
    );
  } else if (date_end) {
    observationConditions.push(
      lte(smartCardObservations.observationDate, date_end)
    );
  }

  // Core condition: employees without observations
  whereConditions.push(
    notExists(
      db.select()
        .from(smartCardObservations)
        .where(and(...observationConditions))
    )
  );

  // Only include active employees
  whereConditions.push(eq(employees.statusOnDuty, true));

  // Exclude crew marine category by default
  whereConditions.push(ne(employees.category, 'crew marine'));

  // ProjectId filter - only apply for 'project' category or when no category is specified
  if (projectId) {
    // If category is specified and is 'project', or if no category is specified, apply projectId filter
    const shouldApplyProjectFilter = !category || 
      (Array.isArray(category) && category.includes('project')) || 
      (typeof category === 'string' && category === 'project');
    
    if (shouldApplyProjectFilter) {
      whereConditions.push(eq(employees.projectId, projectId));
    }
  }

  // VesselId filter - only apply for 'marine' category or when no category is specified
  if (vesselId) {
    const shouldApplyVesselFilter = !category || 
      (Array.isArray(category) && (category.includes('marine') || category.includes('crew marine'))) || 
      (typeof category === 'string' && (category === 'marine' || category === 'crew marine'));
    
    if (shouldApplyVesselFilter) {
      whereConditions.push(eq(employees.vesselId, vesselId));
    }
  }

  // Search functionality
  if (search) {
    const like = `%${search}%`;
    whereConditions.push(
      or(
        ilike(employees.employeeName, like),
        ilike(employees.position, like),
        ilike(subContractors.name, like)
      )
    );
  }

  // Multiple filters
  if (Array.isArray(company) && company.length > 0) {
    whereConditions.push(inArray(subContractors.id, company));
  } else if (typeof company === 'string') {
    whereConditions.push(eq(subContractors.id, company));
  }

  if (Array.isArray(position) && position.length > 0) {
    whereConditions.push(inArray(employees.position, position));
  }

  if (Array.isArray(category) && category.length > 0) {
    whereConditions.push(inArray(employees.category, category));
  }

  if (Array.isArray(statusOnDuty) && statusOnDuty.length > 0) {
    whereConditions.push(inArray(employees.statusOnDuty, statusOnDuty));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count for pagination
  const totalResult = await db
    .select({ count: count() })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .where(whereClause);
  
  const total = Number(totalResult[0].count);
  const totalPages = Math.ceil(total / limit);

  // Apply sorting
  const sortColumn = sortByColumns[sortBy] ?? employees.employeeName;

  // Get paginated results
  const rows = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
      companyName: subContractors.name,
      position: employees.position,
      category: employees.category,
      statusOnDuty: employees.statusOnDuty,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .where(whereClause)
    .orderBy(orderBy === 'desc' ? desc(sortColumn) : asc(sortColumn))
    .limit(limit)
    .offset(offset);

  // Calculate date range
  const finalStart = date_start ?? '';
  const finalEnd = date_end ?? '';

  return {
    data: rows,
    meta: {
      total,
      page,
      view: limit,
      totalPages,
      date_start: finalStart,
      date_end: finalEnd,
    },
  };
}

/**
 * Find all employees who don't have any smart card observations
 * Filters out employees with category 'crew marine' as they might not need observations
 * @param date_start - Optional start date to filter observations (YYYY-MM-DD)
 * @param date_end - Optional end date to filter observations (YYYY-MM-DD)
 */
export async function getEmployeesWithoutObservations(
  date_start?: string,
  date_end?: string
): Promise<EmployeeWithoutObservation[]> {
  // Use the standardized list service for backward compatibility
  const result = await listEmployeesWithoutObservationsService({ 
    date_start, 
    date_end, 
    limit: 1000, // High limit for backward compatibility
    page: 0 
  });
  return result.data;
}

/**
 * Get statistics about employees and their observation status
 * @param date_start - Optional start date to filter observations (YYYY-MM-DD)
 * @param date_end - Optional end date to filter observations (YYYY-MM-DD)
 */
export async function getObservationStatistics(
  date_start?: string,
  date_end?: string,
  userId?: string,
  role?: string
): Promise<ObservationStatistics> {
  try {
    let allowedIds: string[] = [];
    let allowedVesselIds: string[] = [];
    let isMarineCategory = false;

    if (role === 'contractor' && userId) {
      const contractorAccess = await db
        .select({
          contractorId: userContractors.contractorId,
          vesselId: userContractors.vesselId,
          category: subContractors.category
        })
        .from(userContractors)
        .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
        .where(eq(userContractors.userId, userId));

      allowedIds = contractorAccess.map(row => row.contractorId).filter(Boolean) as string[];
      allowedVesselIds = contractorAccess.map(row => row.vesselId).filter((v): v is string => !!v);
      isMarineCategory = contractorAccess.some(row => row.category?.toLowerCase() === 'marine');
    }

    // Build the query conditions
    const activeConditions: any[] = [
      eq(employees.statusOnDuty, true),
      ne(employees.category, 'crew marine')
    ];

    const allConditions: any[] = [];

    // Build observation conditions for date filtering (same logic as main list)
    const observationConditions = [eq(smartCardObservations.employeeId, employees.id)];
    
    if (date_start && date_end) {
      observationConditions.push(
        between(smartCardObservations.observationDate, date_start, date_end)
      );
    } else if (date_start) {
      observationConditions.push(
        gte(smartCardObservations.observationDate, date_start)
      );
    } else if (date_end) {
      observationConditions.push(
        lte(smartCardObservations.observationDate, date_end)
      );
    }

    const withoutConditions: any[] = [
      eq(employees.statusOnDuty, true),
      ne(employees.category, 'crew marine'),
      notExists(
        db.select()
          .from(smartCardObservations)
          .where(and(...observationConditions))
      )
    ];

    if (role === 'contractor' && userId) {
      if (allowedIds.length === 0) {
        const fallbackCondition = eq(subContractors.id, '00000000-0000-0000-0000-000000000000');
        activeConditions.push(fallbackCondition);
        allConditions.push(fallbackCondition);
        withoutConditions.push(fallbackCondition);
      } else {
        const companyCondition = inArray(subContractors.id, allowedIds);
        activeConditions.push(companyCondition);
        allConditions.push(companyCondition);
        withoutConditions.push(companyCondition);
      }

      if (allowedVesselIds.length > 0) {
        const vesselCondition = inArray(employees.vesselId, allowedVesselIds);
        activeConditions.push(vesselCondition);
        allConditions.push(vesselCondition);
        withoutConditions.push(vesselCondition);
      }

      if (isMarineCategory) {
        const categoryCondition = eq(employees.category, 'marine');
        activeConditions.push(categoryCondition);
        allConditions.push(categoryCondition);
        withoutConditions.push(categoryCondition);
      }
    }

    // Get total active employees (excluding crew marine)
    const totalActiveEmployeesResult = await db
      .select({ count: count() })
      .from(employees)
      .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
      .where(and(...activeConditions));

    // Get total employees (all employees in database)
    const totalAllEmployeesResult = await db
      .select({ count: count() })
      .from(employees)
      .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
      .where(allConditions.length > 0 ? and(...allConditions) : undefined);

    // Count employees WITHOUT observations (same logic as main list)
    const employeesWithoutObservationsResult = await db
      .select({ count: count() })
      .from(employees)
      .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
      .where(and(...withoutConditions));

    const totalActiveCount = Number(totalActiveEmployeesResult[0].count);
    const totalAllCount = Number(totalAllEmployeesResult[0].count);
    const withoutObservationsCount = Number(employeesWithoutObservationsResult[0].count);
    const withObservationsCount = totalActiveCount - withoutObservationsCount;

    const statistics = {
      totalActiveEmployees: totalActiveCount,
      totalAllEmployees: totalAllCount,
      employeesWithObservations: withObservationsCount,
      employeesWithoutObservations: withoutObservationsCount
    };

    return statistics;
  } catch (error) {
    throw new Error(`Failed to get observation statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
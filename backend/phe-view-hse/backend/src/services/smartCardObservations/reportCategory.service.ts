import { db } from '../../db/index.ts';
import { employees, smartCardObservations } from '../../db/schema/employee.schema.ts';
import { and, eq, inArray, gte, lte, between } from 'drizzle-orm';
import { listEmployeesWithoutObservationsService } from './employeeWithoutObservations.service.ts';

export interface ReportCategorySummary {
  category: string;
  count: number;
  descriptions: string[];
}

export interface GetReportCategoryDataParams {
  category?: string | string[];
  date_start?: string;
  date_end?: string;
  observationTime?: string;
  projectId?: string; // Add projectId parameter
}

/**
 * Get report category data from smart card observations
 * Groups by report category and provides counts and descriptions
 */
export async function getReportCategoryData(
  params: GetReportCategoryDataParams
): Promise<ReportCategorySummary[]> {
  try {
    const { category, date_start, date_end, observationTime, projectId } = params;
    
    // Build conditions for employees
    const employeeConditions = [];
    
    // Category filter
    if (category) {
      if (Array.isArray(category)) {
        employeeConditions.push(inArray(employees.category, category));
      } else {
        employeeConditions.push(eq(employees.category, category));
      }
    }
    
    // ProjectId filter - only apply for 'project' category or when no category is specified
    if (projectId) {
      // If category is specified and is 'project', or if no category is specified, apply projectId filter
      const shouldApplyProjectFilter = !category || 
        (Array.isArray(category) && category.includes('project')) || 
        (typeof category === 'string' && category === 'project');
      
      if (shouldApplyProjectFilter) {
        employeeConditions.push(eq(employees.projectId, projectId));
      }
    }
    
    // Build conditions for smart card observations
    const observationConditions = [];
    
    // Date range filter
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
    
    // Time filter
    if (observationTime) {
      observationConditions.push(
        eq(smartCardObservations.observationTime, observationTime)
      );
    }
    
    // Join employees and smartCardObservations
    const query = db
      .select({
        reportCategory: smartCardObservations.reportCategory,
        unsafeBehaviorDescription: smartCardObservations.unsafeBehaviorDescription,
        findingDescription: smartCardObservations.findingDescription,
      })
      .from(smartCardObservations)
      .innerJoin(employees, eq(smartCardObservations.employeeId, employees.id))
      .where(
        and(
          ...employeeConditions,
          ...observationConditions
        )
      );
    
    const results = await query;
    
    // Group by report category and count
    const categoryMap: Record<string, ReportCategorySummary> = {};
    
    for (const row of results) {
      const category = row.reportCategory;
      if (!category) continue;
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          count: 0,
          descriptions: [],
        };
      }
      
      categoryMap[category].count += 1;
      
      // Add descriptions if they exist
      if (row.unsafeBehaviorDescription) {
        categoryMap[category].descriptions.push(row.unsafeBehaviorDescription);
      }
      
      if (row.findingDescription) {
        categoryMap[category].descriptions.push(row.findingDescription);
      }
    }
    
    // Convert to array
    return Object.values(categoryMap);
  } catch (error) {
    throw new Error(`Failed to get report category data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get employees without smart card observations for a given date
 * This can be used to populate nonParticipants in smartCards
 * Uses pagination service for better performance
 */
export async function getEmployeesWithoutObservations(
  date?: string
): Promise<Array<{ name: string; company: string }>> {
  try {
    // Use the standardized list service with high limit for backward compatibility
    const result = await listEmployeesWithoutObservationsService({ 
      date_start: date,
      date_end: date,
      limit: 1000, // High limit for backward compatibility
      page: 0 
    });
    
    // Transform to the expected format and filter out null values
    return result.data
      .filter(emp => emp.employeeName !== null && (emp.companyName !== null || emp.category !== null))
      .map(emp => ({
        name: emp.employeeName || '',
        company: emp.companyName || emp.category || ''
      }));
  } catch (error) {
    throw new Error(`Failed to get employees without observations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
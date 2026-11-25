import { db } from '../../db/index.ts';
import {
  dailyReports,
  dailyReportSubtypes,
  subtypes,
  workLocations,
  supportingFiles,
} from '../../db/schema/report.schema.ts';
import {
  and, or, eq, ilike, inArray,
  gte, lte, asc, desc, count, sql,
} from 'drizzle-orm';
import { getDailyReportDetail } from './detail.service.ts';
import type { ListDailyReportsParams } from '../../types/report.ts';
import type { User } from '../../auth.ts';
type SessionUser = User;
import env from '../../config/env.config.ts';
import { userContractors, contractorVessels, vessels } from '../../db/schema/auth.schema.ts';

function isValidDateInput(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// Helper function to safely execute queries
async function safeQuery(queryFn: () => Promise<any>, defaultValue: any = null) {
  try {
    const result = await queryFn();
    return Array.isArray(result) ? result : (result ? [result] : []);
  } catch (e) {
    console.error('Query error:', e);
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  }
}

export async function listAllDailyReports(
  input: ListDailyReportsParams,
  user: SessionUser
): Promise<{
  data: any[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
    date_start: string;
    date_end: string;
  };
}> {
  try {
    let {
      date_start,
      date_end,
      formTypes = ['project', 'marine'],
      instansi = [],
      subtypes: filterSubtypes = [],
      workLocations: filterWorkLocations = [],
      vesselId: filterVesselIds = [],
      search = '',
      sort = 'reportDate',
      order = 'desc',
      page = 0,
      view = 10,
      showDetails = false,
      groupByDate = false,
      reportIds = [],
    } = input;

    const offset = page * view;
    const conditions: any[] = [];

    // Filters
    if (reportIds.length > 0) {
      conditions.push(inArray(dailyReports.id, reportIds));
    }

    if (formTypes.length) {
      conditions.push(inArray(dailyReports.formType, formTypes));
    }

    if (instansi.length > 0) {
      conditions.push(inArray(dailyReports.instansi, instansi));
    }

    if (formTypes.includes('project') && filterSubtypes.length > 0) {
      conditions.push(inArray(dailyReportSubtypes.subtypeId, filterSubtypes));
    }

    if (filterWorkLocations.length > 0) {
      conditions.push(inArray(dailyReports.workLocationId, filterWorkLocations));
    }

    if (date_start && isValidDateInput(date_start)) {
      conditions.push(gte(dailyReports.reportDate, date_start));
    }

    if (date_end && isValidDateInput(date_end)) {
      conditions.push(lte(dailyReports.reportDate, date_end));
    }

    if (search?.trim()) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(dailyReports.reportedBy, searchTerm),
          ilike(dailyReports.instansi, searchTerm)
        )
      );
    }

    if (filterVesselIds.length > 0) {
      // For vessel filtering, we need to filter reports created by users associated with these vessels
      const vesselUserRecords = await safeQuery(() => 
        db
          .select({ userId: userContractors.userId })
          .from(userContractors)
          .where(inArray(userContractors.vesselId, filterVesselIds))
      );
      
      if (vesselUserRecords.length > 0) {
        const userIds = vesselUserRecords.map(su => su.userId);
        conditions.push(inArray(dailyReports.createdByUserId, userIds));
      } else {
        // If no users found for specified vessels, show no reports
        conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
      }
    }

    // Role-based filtering
    if (user.role === 'contractor') {
      // For contractors, show all reports created by users associated with their contractor's vessels
      try {
        // Get the contractor IDs for this user
        const userContractorRecords = await safeQuery(() => 
          db
            .select({ contractorId: userContractors.contractorId })
            .from(userContractors)
            .where(eq(userContractors.userId, user.id))
        );
          
        if (userContractorRecords.length > 0) {
          const contractorIds = userContractorRecords.map(uc => uc.contractorId);
          
          // Get vessel IDs associated with these contractors
          const contractorVesselRecords = await safeQuery(() => 
            db
              .select({ vesselId: contractorVessels.vesselId })
              .from(contractorVessels)
              .where(inArray(contractorVessels.contractorId, contractorIds))
          );
            
          if (contractorVesselRecords.length > 0) {
            const vesselIds = contractorVesselRecords.map(cv => cv.vesselId);
            
            // Get user IDs who have these vessel assignments
            const vesselUserRecords = await safeQuery(() => 
              db
                .select({ userId: userContractors.userId })
                .from(userContractors)
                .where(inArray(userContractors.vesselId, vesselIds))
            );
              
            if (vesselUserRecords.length > 0) {
              const userIds = vesselUserRecords.map(su => su.userId);
              conditions.push(inArray(dailyReports.createdByUserId, userIds));
            } else {
              // If no users found for contractor vessels, show no reports
              conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
            }
          } else {
            // If no vessels found for contractor, show no reports
            conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
          }
        } else {
          // If user is not associated with any contractors, show no reports
          conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
        }
      } catch (e) {
        console.error('Error in contractor filtering:', e);
        // If there's an error in contractor filtering, show no reports
        conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
      }
    } else if (user.role === 'crew') {
      // For crew members, only show reports from the same vessel
      // Get the vessel ID directly from userContractors
      const crewVessel = await db
        .select({ vesselId: userContractors.vesselId })
        .from(userContractors)
        .where(eq(userContractors.userId, user.id))
        .limit(1);

      if (crewVessel.length > 0 && crewVessel[0].vesselId) {
        // Get all users associated with this specific vessel from userContractors
        const vesselUsers = await db
          .select({ userId: userContractors.userId })
          .from(userContractors)
          .where(eq(userContractors.vesselId, crewVessel[0].vesselId));

        if (vesselUsers.length > 0) {
          const userIds = vesselUsers.map(u => u.userId);
          conditions.push(inArray(dailyReports.createdByUserId, userIds));
        } else {
          // If no users found for this vessel, show no reports
          conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
        }
      } else {
        // If crew member has no vessel assigned, show no reports
        conditions.push(eq(dailyReports.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
      }
    }

    const userVesselsSubquery = db
      .select({
        userId: userContractors.userId,
        vesselId: sql<string>`min(${userContractors.vesselId}::text)`.as('vessel_id'),
        vesselName: sql<string>`min(${vessels.vesselName})`.as('vessel_name'),
      })
      .from(userContractors)
      .leftJoin(vessels, eq(userContractors.vesselId, vessels.id))
      .groupBy(userContractors.userId)
      .as('user_vessels');

    const orderBy = order === 'asc' ? asc : desc;
    const sortColumn = {
      reportDate: dailyReports.reportDate,
      formType: dailyReports.formType,
      instansi: dailyReports.instansi,
      reportedBy: dailyReports.reportedBy,
      subtypeName: sql`COALESCE(${subtypes.name}, ${userVesselsSubquery.vesselName})`,
      vessel: userVesselsSubquery.vesselName,
      vesselName: userVesselsSubquery.vesselName,
      createdAt: dailyReports.createdAt,
      updatedAt: dailyReports.updatedAt,
    }[sort] ?? dailyReports.reportDate;

    // Build base query with error handling
    let results: any[] = [];
    let total = 0;
    let totalPages = 0;
    
    try {
      // Execute the main query
      const baseQueryResult = await safeQuery(() => {
        const query = db
          .selectDistinct({
            id: dailyReports.id,
            reportDate: dailyReports.reportDate,
            formType: dailyReports.formType,
            reportedBy: dailyReports.reportedBy,
            instansi: dailyReports.instansi,
            createdByUserId: dailyReports.createdByUserId,
            workLocationId: dailyReports.workLocationId,
            workLocationName: workLocations.name,
            createdAt: dailyReports.createdAt,
            updatedAt: dailyReports.updatedAt,
            subtype: dailyReportSubtypes.subtypeId,
            subtypeName: subtypes.name,
            vesselId: userVesselsSubquery.vesselId,
            vesselName: userVesselsSubquery.vesselName,
          })
          .from(dailyReports)
          .leftJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
          .leftJoin(subtypes, eq(dailyReportSubtypes.subtypeId, subtypes.id))
          .leftJoin(workLocations, eq(dailyReports.workLocationId, workLocations.id))
          .leftJoin(userVesselsSubquery, eq(dailyReports.createdByUserId, userVesselsSubquery.userId));

        if (conditions.length > 0) {
          query.where(and(...conditions));
        }

        return query.orderBy(orderBy(sortColumn)).limit(view).offset(offset);
      }, []);

      results = baseQueryResult;

      // Execute the count query
      const countQueryResult = await safeQuery(() => {
        const baseCountQuery = db
          .selectDistinct({ id: dailyReports.id })
          .from(dailyReports)
          .leftJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
          .leftJoin(subtypes, eq(dailyReportSubtypes.subtypeId, subtypes.id))
          .leftJoin(workLocations, eq(dailyReports.workLocationId, workLocations.id))
          .$dynamic();

        if (conditions.length > 0) {
          baseCountQuery.where(and(...conditions));
        }

        // Count the distinct results
        const countQuery = db.select({ count: count() }).from(baseCountQuery.as('distinct_reports'));
        return countQuery;
      }, [{ count: 0 }]);

      total = countQueryResult[0]?.count ?? 0;
      totalPages = Math.ceil(total / view);
    } catch (e) {
      console.error('Error executing queries:', e);
      throw e;
    }

    // Ambil date_start & date_end berdasarkan hasil data jika input tidak diberikan
    const dateList = results.map((r) => r.reportDate).sort();
    const defaultStart = dateList[0] ?? '';
    const defaultEnd = dateList[dateList.length - 1] ?? '';
    const finalStart = isValidDateInput(input.date_start ?? '') ? input.date_start! : defaultStart;
    const finalEnd = isValidDateInput(input.date_end ?? '') ? input.date_end! : defaultEnd;

    // Process results with error handling
    const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsReportDir}`;

    // Pre-fetch fallback vessel information for users without vessel info in results
    const userIdsNeedingVessel = Array.from(new Set(
      results
        .filter(item => (!item.vesselId || !item.vesselName) && item.createdByUserId)
        .map(item => item.createdByUserId as string)
    ));
    const fallbackVesselMap = new Map<string, { vesselId: string; vesselName: string }>();
    if (userIdsNeedingVessel.length > 0) {
      try {
        const creatorVessels = await db
          .select({
            userId: userContractors.userId,
            vesselId: userContractors.vesselId,
            vesselName: vessels.vesselName,
          })
          .from(userContractors)
          .leftJoin(vessels, eq(userContractors.vesselId, vessels.id))
          .where(inArray(userContractors.userId, userIdsNeedingVessel));
        for (const cv of creatorVessels) {
          if (cv.vesselId && cv.vesselName && cv.userId && !fallbackVesselMap.has(cv.userId)) {
            fallbackVesselMap.set(cv.userId, { vesselId: cv.vesselId, vesselName: cv.vesselName });
          }
        }
      } catch (err) {
        console.error('Error prefetching fallback vessels:', err);
      }
    }

    const dailyKeys = [
      'id',
      'reportDate',
      'formType',
      'reportedBy',
      'instansi',
      'createdByUserId',
      'createdAt',
      'updatedAt',
      'subtype',
      'subtypeName',
      'vesselId',
      'vesselName',
    ];

    let finalResults: any[] = [];
    if (showDetails) {
      // If showDetails is true, call getDailyReportDetail once per item and extract imageUrl from detail.supportingFiles
      finalResults = await Promise.all(
        results.map(async (item) => {
          try {
            const fallbackVessel = item.createdByUserId ? fallbackVesselMap.get(item.createdByUserId) : null;
            const processedVesselId = (item.vesselId && item.vesselName) ? item.vesselId : (fallbackVessel?.vesselId ?? null);
            const processedVesselName = (item.vesselId && item.vesselName) ? item.vesselName : (fallbackVessel?.vesselName ?? null);

            const processedItem = {
              ...item,
              vesselId: processedVesselId,
              vesselName: processedVesselName,
            };

            const detail = await getDailyReportDetail(processedItem.id);

            // ✅ Ambil file pertama yang typenya diawali dengan "image/"
            const firstImage = detail?.supportingFiles?.find(
              (file: any) => file.fileType?.startsWith('image/')
            );
            const imageUrl = firstImage ? `${BASE_URL}/${processedItem.id}/${firstImage.filePath}` : null;

            if (detail) {
              for (const key of dailyKeys) delete (detail as any)[key];
            }

            return {
              ...processedItem,
              imageUrl,
              detail,
            };
          } catch (e) {
            console.error(`Error getting details for report ${item.id}:`, e);
            return {
              ...item,
              vesselId: null,
              vesselName: null,
              imageUrl: null,
              detail: null,
            };
          }
        })
      );
    } else {
      // If showDetails is false, do NOT call getDailyReportDetail! Query supportingFiles in batch for imageUrl
      const reportIds = results.map(r => r.id as string).filter(Boolean);
      const imageFilesMap = new Map<string, string>();
      if (reportIds.length > 0) {
        try {
          const imageFiles = await db
            .select({
              reportId: supportingFiles.reportId,
              filePath: supportingFiles.filePath,
              fileType: supportingFiles.fileType,
            })
            .from(supportingFiles)
            .where(inArray(supportingFiles.reportId, reportIds));

          for (const file of imageFiles) {
            if (file.fileType?.startsWith('image/') && file.reportId && !imageFilesMap.has(file.reportId)) {
              imageFilesMap.set(file.reportId, file.filePath);
            }
          }
        } catch (err) {
          console.error('Error batch fetching supportingFiles for image preview:', err);
        }
      }

      finalResults = results.map((item) => {
        const fallbackVessel = item.createdByUserId ? fallbackVesselMap.get(item.createdByUserId) : null;
        const processedVesselId = (item.vesselId && item.vesselName) ? item.vesselId : (fallbackVessel?.vesselId ?? null);
        const processedVesselName = (item.vesselId && item.vesselName) ? item.vesselName : (fallbackVessel?.vesselName ?? null);

        const filePath = imageFilesMap.get(item.id);
        const imageUrl = filePath ? `${BASE_URL}/${item.id}/${filePath}` : null;

        return {
          ...item,
          vesselId: processedVesselId,
          vesselName: processedVesselName,
          imageUrl,
        };
      });
    }

    let data: any[] = finalResults;
    if (groupByDate) {
      const grouped: Record<string, any> = {};
      for (const report of finalResults) {
        const date = report.reportDate;
        if (!grouped[date]) {
          grouped[date] = {
            reportDate: date,
            summary: {},
            reports: [],
          };
        }
        grouped[date].reports.push(report);
      }

      for (const date in grouped) {
        const reports = grouped[date].reports;
        const summary: any = {};

        if (formTypes.includes('marine')) {
          const marineVessels = reports
            .filter((r: any) => r.formType === 'marine' && r.vesselName)
            .map((r: any) => r.vesselName);
          summary.marine = [...new Set(marineVessels)];
        }

        if (formTypes.includes('project')) {
          const projectSubtypes = reports
            .filter((r: any) => r.formType === 'project' && r.subtypeName)
            .map((r: any) => r.subtypeName);
          summary.project = [...new Set(projectSubtypes)];
        }

        grouped[date].summary = summary;
      }

      data = Object.values(grouped);
    }

    return {
      data,
      meta: {
        total,
        page,
        view,
        totalPages,
        date_start: finalStart,
        date_end: finalEnd,
      },
    };
  } catch (error) {
    console.error('Error in listAllDailyReports:', error);
    throw error;
  }
}
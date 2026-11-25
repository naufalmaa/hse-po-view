import {
  dailyReports,
  laggingIndicators,
  meetings,
  drills,
  trainings,
  inspections,
  smartCards,
  highlights,
  permits,
  operations,
  vesselsUnderPoSummary,
  supportingFiles,
  dailyReportSubtypes,
  subtypes,
  workLocations,
} from '../../db/schema/report.schema.ts';
import { vessels, userContractors } from '../../db/schema/auth.schema.ts';
import { attendance } from '../../db/schema/employee.schema.ts';
import { logManhours } from '../../db/schema/log-manhours.schema.ts';
import { db } from '../../db/index.ts';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import env from '../../config/env.config.ts';
import { recalculateLogManhoursForDate } from './logManhoursTrigger.service.ts';
import {
  getDrillSummary,
  getInspectionSummary,
  getManhoursSummary,
  getMeetingSummary,
  getPermitSummary,
  getTrainingSummary
} from "./summary.service.ts";
import { startOfMonth, endOfMonth, startOfYear } from 'date-fns';

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsReportDir}`;

// Helper function to safely execute queries
async function safeQuery(queryFn: () => Promise<any>, defaultValue: any = null) {
  try {
    const result = await queryFn();
    return Array.isArray(result) ? result : (result ? [result] : []);
  } catch (e) {
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  }
}

function isValidMeeting(item: any): boolean {
  if (!item) return false;
  if (item.description && item.description.trim() !== '') return true;
  if (item.jenisMeeting && item.jenisMeeting.trim() !== '') return true;
  if (Number(item.absencePercentage) > 0) return true;
  const countKeys = ['toolbox', 'generalSafety', 'safetyCommittee', 'preJob', 'hsseSiteOrientation', 'marineContractorMeeting', 'safetyStandDownMeeting', 'managementSafetyVisit', 'managementVisit', 'others'];
  return countKeys.some(k => Number(item[k]) > 0);
}

function isValidDrill(item: any): boolean {
  if (!item) return false;
  if (item.description && item.description.trim() !== '') return true;
  if (item.jenisDrill && item.jenisDrill.trim() !== '') return true;
  const countKeys = ['fireDrill', 'abandonDrill', 'musteringDrill', 'medievacDrill', 'h2sDrill', 'oilPollutionPreventionDrill', 'steeringGearFailureDrill', 'manOverboardDrill', 'groundingDrill', 'firstAidDrill', 'collisionDrill', 'dryDrill', 'wetDrill', 'othersDrill'];
  return countKeys.some(k => Number(item[k]) > 0);
}

function isValidTraining(item: any): boolean {
  if (!item) return false;
  if (item.description && item.description.trim() !== '') return true;
  if (item.jenisTraining && item.jenisTraining.trim() !== '') return true;
  const countKeys = ['clsr', 'akhlak', 'unsafeActionCategory', 'sika', 'l2ra', 'preSiteInduction', 'siteInduction', 'othersTraining', 'shipboardTraining'];
  return countKeys.some(k => Number(item[k]) > 0);
}

function isValidPermit(item: any): boolean {
  if (!item) return false;
  if (item.description && item.description.trim() !== '') return true;
  const countKeys = ['generalWork', 'breakingContainment', 'hotWork', 'criticalWork', 'confinedSpace', 'cwpL1', 'hwspL1', 'confinedSpace1', 'cwpL2', 'hwspL2', 'confinedSpace2', 'isolationConfirmationCertificate'];
  return countKeys.some(k => Number(item[k]) > 0);
}

// Function to calculate free days metrics for a specific report
// This follows the same logic as metric.service.ts but for a single report
async function calculateFreeDaysMetrics(reportId: string) {
  try {
    // Get the report details
    const [report] = await db
      .select({ 
        date: dailyReports.reportDate,
        formType: dailyReports.formType,
        subtypeId: dailyReportSubtypes.subtypeId
      })
      .from(dailyReports)
      .leftJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
      .where(eq(dailyReports.id, reportId));

    if (!report) {
      return { 
        freeLtaDays: { day: 0, monthly: 0, ytd: 0 },
        freeRiDays: { day: 0, monthly: 0, ytd: 0 }
      };
    }

    const reportDate = new Date(report.date);
    const startYear = startOfYear(reportDate);
    const startMonth = startOfMonth(reportDate);
    const endMonth = endOfMonth(reportDate);

    // Get the subtype ID if it exists
    const subtypeId = report.subtypeId;

    // For a single report, we calculate:
    // 1. Today: The freeLtaDays and freeRiDays for just this report
    // 2. Monthly: Sum of freeLtaDays and freeRiDays for all reports in the same month with same formType and subtype
    // 3. YTD: Sum of freeLtaDays and freeRiDays for all reports from start of year until report date with same formType and subtype

    // Today values (just this report)
    const todayFreeLtaResult = await db
      .select({ value: laggingIndicators.freeLtaDays })
      .from(laggingIndicators)
      .where(eq(laggingIndicators.reportId, reportId));
    
    const todayFreeRiResult = await db
      .select({ value: laggingIndicators.freeRiDays })
      .from(laggingIndicators)
      .where(eq(laggingIndicators.reportId, reportId));

    const todayFreeLta = todayFreeLtaResult[0]?.value ?? 0;
    const todayFreeRi = todayFreeRiResult[0]?.value ?? 0;

    // Monthly values (all reports in same month with same formType and subtype)
    let monthlyConditions = [
      gte(dailyReports.reportDate, startMonth.toISOString().split('T')[0]),
      lte(dailyReports.reportDate, endMonth.toISOString().split('T')[0]),
      eq(dailyReports.formType, report.formType)
    ];

    let monthlyFreeLta = 0;
    let monthlyFreeRi = 0;

    if (report.formType === 'project' && subtypeId) {
      monthlyConditions.push(eq(dailyReportSubtypes.subtypeId, subtypeId));
      const monthlyResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .innerJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
        .where(and(...monthlyConditions));
      
      monthlyFreeLta = monthlyResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      monthlyFreeRi = monthlyResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    } else if (report.formType === 'project') {
      // Project without subtype
      const monthlyResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .innerJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
        .where(and(...monthlyConditions));
      
      monthlyFreeLta = monthlyResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      monthlyFreeRi = monthlyResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    } else {
      // Marine reports
      const monthlyResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .where(and(...monthlyConditions));
      
      monthlyFreeLta = monthlyResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      monthlyFreeRi = monthlyResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    }

    // YTD values (all reports from start of year until report date with same formType and subtype)
    let ytdConditions = [
      gte(dailyReports.reportDate, startYear.toISOString().split('T')[0]),
      lte(dailyReports.reportDate, report.date),
      eq(dailyReports.formType, report.formType)
    ];

    let ytdFreeLta = 0;
    let ytdFreeRi = 0;

    if (report.formType === 'project' && subtypeId) {
      ytdConditions.push(eq(dailyReportSubtypes.subtypeId, subtypeId));
      const ytdResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .innerJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
        .where(and(...ytdConditions));
      
      ytdFreeLta = ytdResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      ytdFreeRi = ytdResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    } else if (report.formType === 'project') {
      // Project without subtype
      const ytdResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .innerJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
        .where(and(...ytdConditions));
      
      ytdFreeLta = ytdResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      ytdFreeRi = ytdResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    } else {
      // Marine reports
      const ytdResults = await db
        .select({ 
          freeLtaDays: laggingIndicators.freeLtaDays,
          freeRiDays: laggingIndicators.freeRiDays
        })
        .from(dailyReports)
        .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
        .where(and(...ytdConditions));
      
      ytdFreeLta = ytdResults.reduce((sum, item) => sum + (item.freeLtaDays ?? 0), 0);
      ytdFreeRi = ytdResults.reduce((sum, item) => sum + (item.freeRiDays ?? 0), 0);
    }

    return {
      freeLtaDays: {
        day: todayFreeLta,
        monthly: monthlyFreeLta,
        ytd: ytdFreeLta
      },
      freeRiDays: {
        day: todayFreeRi,
        monthly: monthlyFreeRi,
        ytd: ytdFreeRi
      }
    };
  } catch (error) {
    return {
      freeLtaDays: { day: 0, monthly: 0, ytd: 0 },
      freeRiDays: { day: 0, monthly: 0, ytd: 0 }
    };
  }
}

export async function getDailyReportDetail(
  reportId: string,
  options?: { forceRecalculate?: boolean }
) {
  try {
  
    // First check if report exists
    const reportResult = await safeQuery(() => 
      db
        .select({
          id: dailyReports.id,
          reportDate: dailyReports.reportDate,
          formType: dailyReports.formType,
          reportedBy: dailyReports.reportedBy,
          instansi: dailyReports.instansi,
          createdByUserId: dailyReports.createdByUserId,
          workLocationId: dailyReports.workLocationId,
          workLocationName: workLocations.name,
          workLocationLatitude: workLocations.latitude,
          workLocationLongitude: workLocations.longitude,
          createdAt: dailyReports.createdAt,
          updatedAt: dailyReports.updatedAt,
        })
        .from(dailyReports)
        .leftJoin(workLocations, eq(dailyReports.workLocationId, workLocations.id))
        .where(eq(dailyReports.id, reportId))
    );
    
    if (!reportResult || reportResult.length === 0) return null;
    const report = reportResult[0];

    // Get related data with proper error handling
    const laggingResult = await safeQuery(() => 
      db.select().from(laggingIndicators).where(eq(laggingIndicators.reportId, reportId))
    );
    const lagging = laggingResult.length > 0 ? laggingResult[0] : null;

    // Get manhours from log_manhours table based on formType
    let manhoursFromLog: any[] = [];
    let hoursPobPheOses!: number;
    let hoursPobContractor!: number;
    
    try {
      const [reportWithDetails] = await db
        .select({ 
          reportDate: dailyReports.reportDate,
          formType: dailyReports.formType,
          createdByUserId: dailyReports.createdByUserId,
          workLocationId: dailyReports.workLocationId,
        })
        .from(dailyReports)
        .where(eq(dailyReports.id, reportId));

      if (reportWithDetails) {
        const logDate = reportWithDetails.reportDate;
      
        if (reportWithDetails.formType === 'project') {
          // For project: get by projectId from dailyReportSubtypes and hours from subtypes
          const [subtypeRelation] = await db
            .select({ subtypeId: dailyReportSubtypes.subtypeId })
            .from(dailyReportSubtypes)
            .where(eq(dailyReportSubtypes.reportId, reportId));
          
          if (subtypeRelation?.subtypeId) {
        
            // Get hours from subtypes table
            const [subtype] = await db
              .select({ 
                extra: subtypes.extra
              })
              .from(subtypes)
              .where(eq(subtypes.id, subtypeRelation.subtypeId));
            
            if (subtype) {
              const extra = subtype.extra as { hoursPobPheOses?: number | null; hoursPobContractor?: number | null } | null;
              hoursPobPheOses = extra?.hoursPobPheOses ?? 8;
              hoursPobContractor = extra?.hoursPobContractor ?? 12;
            } else {
              hoursPobPheOses = 8;
              hoursPobContractor = 12;
            }
                
            const logConditions = [
              eq(logManhours.logDate, logDate),
              eq(logManhours.projectId, subtypeRelation.subtypeId),
            ];
            if (reportWithDetails.workLocationId) {
              logConditions.push(eq(logManhours.workLocationId, reportWithDetails.workLocationId));
            }

            let logEntries = await db
              .select()
              .from(logManhours)
              .where(and(...logConditions));

            // Check if recalculation is needed:
            // 1. Force recalculate requested
            // 2. No log entries found
            // 3. Stale entries: attendance was modified/created after log_manhours was last updated
            let shouldRecalculate = options?.forceRecalculate || !logEntries || logEntries.length === 0;

            if (!shouldRecalculate && logEntries.length > 0) {
              const lastLogUpdate = logEntries[0]?.updatedAt || logEntries[0]?.createdAt;
              if (lastLogUpdate) {
                const [newerAtt] = await db
                  .select({ id: attendance.id })
                  .from(attendance)
                  .where(
                    and(
                      lte(attendance.attendanceDate, logDate),
                      sql`GREATEST(COALESCE(${attendance.updatedAt}, ${attendance.createdAt}), ${attendance.createdAt}) > ${lastLogUpdate}`
                    )
                  )
                  .limit(1);

                if (newerAtt) {
                  shouldRecalculate = true;
                }
              }
            }

            if (shouldRecalculate) {
              try {
                await recalculateLogManhoursForDate(logDate);
                logEntries = await db
                  .select()
                  .from(logManhours)
                  .where(and(...logConditions));
              } catch (recalcErr) {
                console.error('Safeguard recalculation failed in detail.service:', recalcErr);
              }
            }

            manhoursFromLog = logEntries || [];
          } else {
            // Project without subtype - set hours to 0
            hoursPobPheOses = 0;
            hoursPobContractor = 0;
          }
        } else if (reportWithDetails.formType === 'marine') {
          // For marine: get by vesselId from userContractors and hours from env config
          const [userVessel] = await db
            .select({ vesselId: userContractors.vesselId })
            .from(userContractors)
            .where(eq(userContractors.userId, reportWithDetails.createdByUserId));
          
          // Get hours from environment config for marine
          hoursPobPheOses = env.marine.hoursPobPheOses ?? 12;
          hoursPobContractor = env.marine.hoursPobContractor ?? 14;
          
          if (userVessel?.vesselId) {
            const marineLogConditions = [
              eq(logManhours.logDate, logDate),
              eq(logManhours.vesselId, userVessel.vesselId),
            ];
            let logEntries = await db
              .select()
              .from(logManhours)
              .where(and(...marineLogConditions));

            let shouldRecalculate = options?.forceRecalculate || !logEntries || logEntries.length === 0;

            if (!shouldRecalculate && logEntries.length > 0) {
              const lastLogUpdate = logEntries[0]?.updatedAt || logEntries[0]?.createdAt;
              if (lastLogUpdate) {
                const [newerAtt] = await db
                  .select({ id: attendance.id })
                  .from(attendance)
                  .where(
                    and(
                      lte(attendance.attendanceDate, logDate),
                      sql`GREATEST(COALESCE(${attendance.updatedAt}, ${attendance.createdAt}), ${attendance.createdAt}) > ${lastLogUpdate}`
                    )
                  )
                  .limit(1);

                if (newerAtt) {
                  shouldRecalculate = true;
                }
              }
            }

            if (shouldRecalculate) {
              try {
                await recalculateLogManhoursForDate(logDate);
                logEntries = await db
                  .select()
                  .from(logManhours)
                  .where(and(...marineLogConditions));
              } catch (recalcErr) {
                console.error('Safeguard marine recalculation failed in detail.service:', recalcErr);
              }
            }

            manhoursFromLog = logEntries || [];
          }
        }
      }
    } catch (e) {
    }

    let manhoursSummary = null;
    try {
      manhoursSummary = await getManhoursSummary(reportId);
    } catch (e) {
    }

    const smartCardResult = await safeQuery(() => 
      db.select().from(smartCards).where(eq(smartCards.reportId, reportId))
    );
    const smartCard = smartCardResult.length > 0 ? smartCardResult[0] : null;

    const files = await safeQuery(() => 
      db.select().from(supportingFiles).where(eq(supportingFiles.reportId, reportId))
    );

    // Format all files with full URLs
    const supportingFilesData = files.map(file => ({
      ...file,
      note: file.note ?? undefined,
      url: `${BASE_URL}/${reportId}/${file.filePath}`,
      thumbnailUrl: `${BASE_URL}/${reportId}/thumbnail/${file.filePath}`,
    }));

    // Get subtype (name)
    const subRelResult = await safeQuery(() => 
      db
        .select({
          subtypeId: dailyReportSubtypes.subtypeId,
          subtypeName: subtypes.name,
        })
        .from(dailyReportSubtypes)
        .leftJoin(subtypes, eq(dailyReportSubtypes.subtypeId, subtypes.id))
        .where(eq(dailyReportSubtypes.reportId, reportId))
    );
    const subRel = subRelResult.length > 0 ? subRelResult[0] : null;

    // Calculate free days metrics
    const freeDaysMetrics = await calculateFreeDaysMetrics(reportId);
    
    const manhoursResponse = {
      pobPheOses: manhoursFromLog.reduce((sum, item) => sum + (item.pobPheOses || 0), 0),
      pobContractor: manhoursFromLog.reduce((sum, item) => sum + (item.pobContractor || 0), 0),
      hoursPobPheOses,
      hoursPobContractor
    };
    
    const result: any = {
      ...report,
      subtype: subRel?.subtypeId ?? null,
      subtypeName: subRel?.subtypeName ?? null,
      lagging,
      freeLtaDays: freeDaysMetrics.freeLtaDays,
      freeRiDays: freeDaysMetrics.freeRiDays,
      manhours: manhoursResponse,
      manhoursSummary,
      smartCard,
      supportingFiles: supportingFilesData,
    };

    if (report.formType === 'project' || report.formType === 'marine') {
      try {
        // Safely fetch all project/marine related data, filtering out dummy blank rows
        const rawMeetingData = await safeQuery(() => 
          db.select().from(meetings).where(eq(meetings.reportId, reportId)), []
        );
        const meetingData = rawMeetingData.filter(isValidMeeting);
        
        const rawDrillData = await safeQuery(() => 
          db.select().from(drills).where(eq(drills.reportId, reportId)), []
        );
        const drillData = rawDrillData.filter(isValidDrill);
        
        const rawTrainingData = await safeQuery(() => 
          db.select().from(trainings).where(eq(trainings.reportId, reportId)), []
        );
        const trainingData = rawTrainingData.filter(isValidTraining);
        
        const rawPermitData = await safeQuery(() => 
          db.select().from(permits).where(eq(permits.reportId, reportId)), []
        );
        const permitData = rawPermitData.filter(isValidPermit);
        
        const inspectionsData = await safeQuery(() => 
          db.select().from(inspections).where(eq(inspections.reportId, reportId)), []
        );
        
        const highlightResult = await safeQuery(() => 
          db.select().from(highlights).where(eq(highlights.reportId, reportId))
        );
        const highlight = highlightResult.length > 0 ? highlightResult[0] : null;

        let meetingSummary = null;
        let drillSummary = null;
        let trainingSummary = null;
        let permitSummary = null;
        let inspectionSummary = null;

        try {
          meetingSummary = await getMeetingSummary(reportId);
        } catch (e) {
        }

        try {
          drillSummary = await getDrillSummary(reportId);
        } catch (e) {
        }

        try {
          trainingSummary = await getTrainingSummary(reportId);
        } catch (e) {
        }

        try {
          permitSummary = await getPermitSummary(reportId);
        } catch (e) {
        }

        try {
          inspectionSummary = await getInspectionSummary(reportId);
        } catch (e) {
        }

        result.meeting = meetingData;
        result.meetingSummary = meetingSummary;

        result.drill = drillData;
        result.drillSummary = drillSummary;

        result.training = trainingData;
        result.trainingSummary = trainingSummary;

        result.permit = permitData;
        result.permitSummary = permitSummary;

        result.inspections = inspectionsData;
        result.inspectionSummary = inspectionSummary;

        result.highlight = highlight;
      } catch (e) {
        result.meeting = [];
        result.meetingSummary = null;
        result.drill = [];
        result.drillSummary = null;
        result.training = [];
        result.trainingSummary = null;
        result.permit = [];
        result.permitSummary = null;
        result.inspections = [];
        result.inspectionSummary = null;
        result.highlight = null;
      }
    }

    if (report.formType === 'marine') {
      try {
        const operationsData = await safeQuery(() => 
          db.select().from(operations).where(eq(operations.reportId, reportId)), []
        );
        
        const vesselSummaryResult = await safeQuery(() => 
          db.select().from(vesselsUnderPoSummary).where(eq(vesselsUnderPoSummary.reportId, reportId))
        );
        const vesselSummary = vesselSummaryResult.length > 0 ? vesselSummaryResult[0] : null;

        // Get vessel counts grouped by type
        const vesselCounts = await db
          .select({
            type: vessels.type,
            count: sql<number>`count(*)`,
          })
          .from(vessels)
          .where(eq(vessels.status, true))
          .groupBy(vessels.type);

        const totalVessels = vesselCounts.reduce((acc, curr) => acc + Number(curr.count), 0);

        result.operations = operationsData;
        result.vesselsUnderPOSummary = vesselSummary;
        result.vesselCounts = {
          total: totalVessels,
          counts: vesselCounts.map((item) => ({
            type: item.type,
            count: Number(item.count),
          })),
        };
      } catch (e) {
        // Set default empty values to prevent further errors
        result.operations = [];
        result.vesselsUnderPOSummary = null;
        result.vesselCounts = {
          total: 0,
          counts: [],
        };
      }
    }

    return result;
    
  } catch (error) {
    throw error;
  }
}
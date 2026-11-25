import {
  drills,
  inspections,
  meetings,
  permits,
  trainings,
  dailyReports,
  dailyReportSubtypes,
  subtypes,
} from '../../db/schema/report.schema.ts';
import { userContractors } from '../../db/schema/auth.schema.ts';
import { getSummary, getManhoursSummaryFromLog } from '../../utils/utils.ts';
import { db } from '../../db/index.ts';
import { eq, } from 'drizzle-orm';
import env from '../../config/env.config.ts';

// === KEYS ===
// const manhoursKeys = ['pobPheOses', 'pobContractor', 'hoursPobPheOses', 'hoursPobContractor'];
// const mandaysKeys = ['pobPheOses', 'pobContractor'];

const meetingKeys = [
  'toolbox', 'generalSafety', 'safetyCommittee', 'preJob',
  'hsseSiteOrientation', 'marineContractorMeeting',
  'safetyStandDownMeeting', 'managementVisit', 'others'
];

const drillKeys = [
  'fireDrill', 'abandonDrill', 'musteringDrill', 'medievacDrill',
  'h2sDrill', 'oilPollutionPreventionDrill', 'steeringGearFailureDrill',
  'manOverboardDrill', 'groundingDrill', 'firstAidDrill', 'collisionDrill', 
  'dryDrill', 'wetDrill', 'othersDrill'
];

const trainingKeys = [
  'clsr', 'akhlak', 'unsafeActionCategory', 'sika', 'l2ra',
  'preSiteInduction', 'siteInduction', 'shipboardTraining', 'othersTraining'
];

const permitKeys = [
  'cwpL1', 'hwspL1', 'confinedSpace1',
  'cwpL2', 'hwspL2', 'confinedSpace2',
  'isolationConfirmationCertificate'
];

const inspectionKeys = [
  'openFinding', 'closeFinding', 'outstandingFinding', 'noIssue', 'inspection'
];

// === 0. MANHOURS
export async function getManhoursSummary(reportId: string) {
  try {
    // Get report details to determine formType and related IDs
    const [reportWithDetails] = await db
      .select({ 
        reportDate: dailyReports.reportDate,
        formType: dailyReports.formType,
        createdByUserId: dailyReports.createdByUserId,
        workLocationId: dailyReports.workLocationId,
      })
      .from(dailyReports)
      .where(eq(dailyReports.id, reportId));

    if (!reportWithDetails) {
      return {
        todayMandays: 0,
        monthlyMandays: 0,
        ytdMandays: 0,
        todayManhours: 0,
        monthlyManhours: 0,
        ytdManhours: 0
      };
    }

    let hoursPobPheOses = 0;
    let hoursPobContractor = 0;
    let projectId: string | undefined;
    let vesselId: string | undefined;

    if (reportWithDetails.formType === 'project') {
      // For project: get by projectId from dailyReportSubtypes and hours from subtypes
      const [subtypeRelation] = await db
        .select({ subtypeId: dailyReportSubtypes.subtypeId })
        .from(dailyReportSubtypes)
        .where(eq(dailyReportSubtypes.reportId, reportId));
      
      if (subtypeRelation?.subtypeId) {
        projectId = subtypeRelation.subtypeId;
        
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
        vesselId = userVessel.vesselId;
      }
    }

    // Use the new function to calculate from log_manhours table
    return await getManhoursSummaryFromLog(
      reportId,
      reportWithDetails.formType as 'project' | 'marine',
      hoursPobPheOses,
      hoursPobContractor,
      projectId,
      vesselId,
      reportWithDetails.workLocationId
    );
  } catch (error) {
    // Return zero values on error
    return {
      todayMandays: 0,
      monthlyMandays: 0,
      ytdMandays: 0,
      todayManhours: 0,
      monthlyManhours: 0,
      ytdManhours: 0
    };
  }
}

// === 1. MEETING
export async function getMeetingSummary(reportId: string) {
  const result = await getSummary(meetings, meetingKeys, reportId);
  return {
    todayMeeting: result.day,
    monthlyMeeting: result.monthly,
    ytdMeeting: result.ytd,
  };
}

// === 2. DRILL
export async function getDrillSummary(reportId: string) {
  const result = await getSummary(drills, drillKeys, reportId);
  return {
    todayDrill: result.day,
    monthlyDrill: result.monthly,
    ytdDrill: result.ytd,
  };
}

// === 3. TRAINING
export async function getTrainingSummary(reportId: string) {
  const result = await getSummary(trainings, trainingKeys, reportId);
  return {
    todayTraining: result.day,
    monthlyTraining: result.monthly,
    ytdTraining: result.ytd,
  };
}

// === 4. PERMIT
export async function getPermitSummary(reportId: string) {
  const result = await getSummary(permits, permitKeys, reportId);
  return {
    todayPermit: result.day,
    monthlyPermit: result.monthly,
    ytdPermit: result.ytd,
  };
}

// === 5. INSPECTION
export async function getInspectionSummary(reportId: string) {
  const result = await getSummary(inspections, inspectionKeys, reportId);
  return {
    todayInspection: result.day,
    monthlyInspection: result.monthly,
    ytdInspection: result.ytd,
  };
}

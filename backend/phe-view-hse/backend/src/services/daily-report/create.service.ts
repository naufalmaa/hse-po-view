import {
  dailyReports,
  dailyReportSubtypes,
  drills,
  highlights,
  inspections,
  laggingIndicators,
  meetings,
  operations,
  permits,
  smartCards,
  trainings,
  vesselsUnderPoSummary,
} from '../../db/schema/report.schema.ts';
import { getDailyReportDetail } from './detail.service.ts';
import { db } from '../../db/index.ts';
import type { DailyFormType } from '../../schema/report.schema.ts';
import { UploadFiles } from './files/upload.service.ts';
import { eq, and, isNull } from 'drizzle-orm';

export async function createDailyReport(
  input: DailyFormType,
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'crew';
    files?: Record<string, {
      buffer: Buffer;
      filename: string;
      mimetype: string;
      fieldname: string;
    }>;
  },
  dbInstance = db
): Promise<{ detail: any } | { error: string }> {
  const formType = input.formType;

  // Prevent duplicate reports for the same date, project, and work location
  const isoDate = new Date(input.reportDate).toISOString().slice(0, 10);
  if (formType === 'project' && input.subtype) {
    const duplicateConditions = [
      eq(dailyReports.formType, 'project'),
      eq(dailyReports.reportDate, isoDate),
      eq(dailyReportSubtypes.subtypeId, input.subtype),
    ];

    if (input.workLocationId) {
      duplicateConditions.push(eq(dailyReports.workLocationId, input.workLocationId));
    } else {
      duplicateConditions.push(isNull(dailyReports.workLocationId));
    }

    const [existingReport] = await dbInstance
      .select({ id: dailyReports.id })
      .from(dailyReports)
      .innerJoin(dailyReportSubtypes, eq(dailyReports.id, dailyReportSubtypes.reportId))
      .where(and(...duplicateConditions))
      .limit(1);

    if (existingReport) {
      throw new Error('Laporan untuk tanggal, proyek, dan work location ini sudah ada');
    }
  }

  const [dailyReportResult] = await dbInstance.insert(dailyReports).values({
    reportDate: new Date(input.reportDate).toISOString(),
    reportedBy: input.reportedBy,
    instansi: input.instansi,
    formType,
    workLocationId: input.workLocationId || null,
    createdByUserId: user.id,
  }).returning({ reportId: dailyReports.id });

  const reportId = dailyReportResult.reportId;

  if (input.subtype) {
    await dbInstance.insert(dailyReportSubtypes).values({
      reportId,
      subtypeId: input.subtype,
    });
  }

  const defaultValues: Record<string, any> = {
    lagging: { description: '', statusFreeLtaRi: true, freeLtaDays: 1, freeRiDays: 1, recordableIncident: 0, nonRecordableIncident: 0, fatality: 0, lti: 0, restrictedWorkDayCase: 0, medicalTreatmentCase: 0, firstAid: 0, nearMiss: 0, unsafeAction: 0, unsafeCondition: 0, environmentalDamage: 0, propertyDamage: 0 },
    smartCard: { description: '', unsafeAction: 0, unsafeCondition: 0, nearMiss: 0, processSafety: 0, nonParticipants: [] },
    meeting: { description: '', jenisMeeting: '', absencePercentage: 0, toolbox: 0, generalSafety: 0, safetyCommittee: 0, preJob: 0, hsseSiteOrientation: 0, marineContractorMeeting: 0, safetyStandDownMeeting: 0, managementSafetyVisit: 0, others: 0, files: [] },
    drill: { description: '', fireDrill: 0, abandonDrill: 0, musteringDrill: 0, medievacDrill: 0, h2sDrill: 0, oilPollutionPreventionDrill: 0, steeringGearFailureDrill: 0, manOverboardDrill: 0, groundingDrill: 0, firstAidDrill: 0, othersDrill: 0, files: [] },
    training: { description: '', clsr: 0, akhlak: 0, unsafeActionCategory: 0, sika: 0, l2ra: 0, preSiteInduction: 0, siteInduction: 0, othersTraining: 0, shipboardTraining: 0, files: [] },
    permit: { description: '', generalWork: 0, breakingContainment: 0, hotWork: 0, criticalWork: 0, confinedSpace: 0, cwpL1: 0, hwspL1: 0, confinedSpace1: 0, cwpL2: 0, hwspL2: 0, confinedSpace2: 0, isolationConfirmationCertificate: 0,  files: [] },
    highlight: { dailyActivities: '', dailyNextPlan: '', weather: '', overstayPersonnel: [] },
    vesselsUnderPoSummary: { totalBoatToday: 0, totalBoatMonthly: 0, totalBoatYtd: 0, totalEmployeeToday: 0, totalEmployeeMonthly: 0, totalEmployeeYtd: 0 },
  };

  const tableMap: Record<string, any> = {
    lagging: laggingIndicators,
    smartCard: smartCards,
    meeting: meetings,
    drill: drills,
    training: trainings,
    permit: permits,
    highlight: highlights,
    vesselsUnderPoSummary: vesselsUnderPoSummary,
  };

  const keysByFormType: Record<string, string[]> = {
    project: ['lagging', 'smartCard', 'meeting', 'drill', 'training', 'permit', 'highlight', 'inspections'],
    marine: ['lagging', 'smartCard', 'meeting', 'drill', 'training', 'inspections', 'operations', 'vesselsUnderPoSummary'],
  };

  const filesMap = user.files ?? {};
  const fileSection = ['meeting', 'drill', 'training', 'permit', 'inspection'];
  const keys = keysByFormType[formType];

  const toUploadInput = (file: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  }) => ({
    buffer: file.buffer,
    filename: file.filename,
    mimetype: file.mimetype,
  });

  const handleFileUpload = async (
    key: string,
    filesMap: Record<string, { buffer: Buffer; filename: string; mimetype: string }>,
    reportId: string,
    sectionId: string | null,
    fileItems: Array<{ file: string; note?: string }> = []
  ) => {
    const validItems = fileItems.filter(item => filesMap[item.file]);
    if (validItems.length === 0) return;

    const uploadableFiles = validItems.map(item => toUploadInput(filesMap[item.file]));
    const notes = validItems.map(item => item.note ?? '');

    await UploadFiles(uploadableFiles, notes, reportId, sectionId, key as any);
  };

  for (const key of keys) {
    const table = tableMap[key];
    const value = input[key as keyof DailyFormType];

    if (key === 'inspections' && Array.isArray(value)) {
      const inspectionsData = value.filter(
        (item): item is any => item && typeof item === 'object' && 'type' in item
      );

      if (inspectionsData.length === 0) {
        const types = ['pre_use', 'field'] as const;
        const emptyInsert = types.map((type) => ({
          reportId,
          type,
          description: '',
          finding: '',
          openFinding: 0,
          closeFinding: 0,
          outstandingFinding: 0,
          noIssue: 0,
          lsaInspection: 0,
          ffaInspection: 0,
          ppeInspection: 0,
          otherInspection: 0,
          deadline: null,
          followUp: '',
        }));
        await db.insert(inspections).values(emptyInsert);
      } else {
        for (const item of inspectionsData) {
          const insertData = {
            reportId,
            type: item.type,
            description: item.description ?? '',
            finding: item.finding ?? '',
            openFinding: item.openFinding ?? 0,
            closeFinding: item.closeFinding ?? 0,
            outstandingFinding: item.outstandingFinding ?? 0,
            lsaInspection: item.lsaInspection ?? 0,
            ffaInspection: item.ffaInspection ?? 0,
            ppeInspection: item.ppeInspection ?? 0,
            otherInspection: item.otherInspection ?? 0,
            noIssue: item.noIssue ?? 0,
            deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
            followUp: item.followUp ?? '',
          };

          const [created] = await db.insert(inspections).values(insertData).returning({ id: inspections.id });
          const inspectionId = created.id;

          await handleFileUpload('inspection', filesMap, reportId, inspectionId, item.files ?? []);
        }
      }

    } else if (key === 'operations') {
      const ops: any[] = Array.isArray(value) ? value : [];
      const validOps = ops
        .filter((v) => typeof v === 'object' && 'region' in v)
        .map((v) => ({
          reportId,
          region: v.region,
          currentHiPoActivity: v.currentHiPoActivity ?? '',
          forecastHiPoActivity: v.forecastHiPoActivity ?? '',
          windSpeed: v.windSpeed ?? '',
          seaLevel: v.seaLevel ?? '',
          skyCondition: v.skyCondition ?? '',
          pitchingRolling: v.pitchingRolling ?? '',
        }));

      if (validOps.length > 0) {
        await db.insert(operations).values(validOps);
      } else {
        await db.insert(operations).values([
          { reportId, region: 'SBU', currentHiPoActivity: '', forecastHiPoActivity: '', windSpeed: '', seaLevel: '', skyCondition: '', pitchingRolling: '' },
          { reportId, region: 'NBU', currentHiPoActivity: '', forecastHiPoActivity: '', windSpeed: '', seaLevel: '', skyCondition: '', pitchingRolling: '' },
          { reportId, region: 'CBU', currentHiPoActivity: '', forecastHiPoActivity: '', windSpeed: '', seaLevel: '', skyCondition: '', pitchingRolling: '' },
        ]);
      }

    } else if (table) {
      // List/child sections should NOT have dummy default rows inserted if no value provided by user
      const listSections = ['meeting', 'drill', 'training', 'permit'];
      if (listSections.includes(key) && !value) {
        continue;
      }

      let sectionData = value ?? defaultValues[key];
      if (!sectionData) continue;
      const fileEntries = Array.isArray(sectionData?.files) ? sectionData.files : [];

      if (key === 'lagging' && sectionData) {
        const statusFreeLtaRi = sectionData.statusFreeLtaRi ?? true;
        
        if (statusFreeLtaRi) {
          sectionData = {
            ...sectionData,
            freeLtaDays: 1,
            freeRiDays: 1,
            fatality: 0,
            lti: 0,
            restrictedWorkDayCase: 0,
            medicalTreatmentCase: 0,
          };
        } else {
          sectionData = {
            ...sectionData,
            freeLtaDays: 0,
            freeRiDays: 0,
          };
        }
      }

      const dataToInsert = {
        reportId,
        ...Object.fromEntries(Object.entries(sectionData).filter(([k]) => k !== 'files')),
      };

      if (fileSection.includes(key) && fileEntries.length > 0) {
        const [created] = await db.insert(table).values(dataToInsert).returning({ id: table.id });
        const sectionId = created.id;
        await handleFileUpload(key, filesMap, reportId, sectionId, fileEntries);
      } else {
        await db.insert(table).values(dataToInsert);
        if (fileEntries.length > 0) {
          await handleFileUpload(key, filesMap, reportId, null, fileEntries);
        }
      }
    }
  }

  const detail = await getDailyReportDetail(reportId);
  
  return detail;
}

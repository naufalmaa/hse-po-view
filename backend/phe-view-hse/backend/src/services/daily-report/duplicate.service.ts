import fs from 'fs';
import { db } from '../../db/index.ts';
import {
  dailyReports,
  dailyReportSubtypes,
  drills,
  highlights,
  inspections,
  laggingIndicators,
  manhours,
  meetings,
  operations,
  permits,
  smartCards,
  supportingFiles,
  trainings,
  vesselsUnderPoSummary,
} from '../../db/schema/report.schema.ts';
import { eq, and, isNull } from 'drizzle-orm';
import { uploadsPath } from '../../config/env.config.ts';
import { recalculateLogManhoursForDate } from './logManhoursTrigger.service.ts';

export interface DuplicateDailyReportInput {
  sourceReportId: string;
  reportDate: string;
  reportedBy: string;
  instansi: string;
  subtype?: string;
  workLocationId?: string | null;
}

export async function duplicateDailyReport(
  input: DuplicateDailyReportInput,
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'crew';
  },
  dbInstance = db
): Promise<{ reportId: string }> {
  // 1. Fetch the source report
  const [sourceReport] = await dbInstance
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, input.sourceReportId));

  if (!sourceReport) {
    throw new Error('Laporan sumber tidak ditemukan');
  }

  const formType = sourceReport.formType;

  // 2. Determine target subtype
  let targetSubtypeId = input.subtype;
  if (!targetSubtypeId && formType === 'project') {
    const [sourceSubtype] = await dbInstance
      .select({ subtypeId: dailyReportSubtypes.subtypeId })
      .from(dailyReportSubtypes)
      .where(eq(dailyReportSubtypes.reportId, input.sourceReportId));
    targetSubtypeId = sourceSubtype?.subtypeId;
  }

  // 3. Determine target work location
  const targetWorkLocationId =
    input.workLocationId !== undefined
      ? input.workLocationId || null
      : sourceReport.workLocationId;

  // 4. Validate uniqueness for (formType, reportDate, subtypeId, workLocationId)
  const targetIsoDate = input.reportDate.includes('T')
    ? input.reportDate.split('T')[0]
    : input.reportDate.trim().slice(0, 10);
  if (formType === 'project' && targetSubtypeId) {
    const duplicateConditions = [
      eq(dailyReports.formType, 'project'),
      eq(dailyReports.reportDate, targetIsoDate),
      eq(dailyReportSubtypes.subtypeId, targetSubtypeId),
    ];

    if (targetWorkLocationId) {
      duplicateConditions.push(eq(dailyReports.workLocationId, targetWorkLocationId));
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

  // 5. Insert new daily report record
  const [newReport] = await dbInstance
    .insert(dailyReports)
    .values({
      reportDate: targetIsoDate,
      reportedBy: input.reportedBy || sourceReport.reportedBy,
      instansi: input.instansi || sourceReport.instansi,
      formType,
      workLocationId: targetWorkLocationId,
      createdByUserId: user.id,
    })
    .returning({ id: dailyReports.id });

  const newReportId = newReport.id;

  // 6. Insert subtype relation if applicable
  if (targetSubtypeId) {
    await dbInstance.insert(dailyReportSubtypes).values({
      reportId: newReportId,
      subtypeId: targetSubtypeId,
    });
  }

  // 7. Clone single-row child tables
  // Lagging Indicators
  const [sourceLagging] = await dbInstance
    .select()
    .from(laggingIndicators)
    .where(eq(laggingIndicators.reportId, input.sourceReportId));
  if (sourceLagging) {
    const { id, reportId, ...laggingData } = sourceLagging;
    await dbInstance.insert(laggingIndicators).values({
      ...laggingData,
      reportId: newReportId,
    });
  }

  // Smart Cards
  const [sourceSmartCard] = await dbInstance
    .select()
    .from(smartCards)
    .where(eq(smartCards.reportId, input.sourceReportId));
  if (sourceSmartCard) {
    const { id, reportId, ...smartCardData } = sourceSmartCard;
    await dbInstance.insert(smartCards).values({
      ...smartCardData,
      reportId: newReportId,
    });
  }

  // Highlights
  const [sourceHighlight] = await dbInstance
    .select()
    .from(highlights)
    .where(eq(highlights.reportId, input.sourceReportId));
  if (sourceHighlight) {
    const { id, reportId, ...highlightData } = sourceHighlight;
    await dbInstance.insert(highlights).values({
      ...highlightData,
      reportId: newReportId,
    });
  }

  // Manhours
  const [sourceManhours] = await dbInstance
    .select()
    .from(manhours)
    .where(eq(manhours.reportId, input.sourceReportId));
  if (sourceManhours) {
    const { id, reportId, ...manhoursData } = sourceManhours;
    await dbInstance.insert(manhours).values({
      ...manhoursData,
      reportId: newReportId,
    });
  }

  // 8. Clone multi-row tables and build ID maps for supportingFiles
  const meetingIdMap = new Map<string, string>();
  const sourceMeetings = await dbInstance
    .select()
    .from(meetings)
    .where(eq(meetings.reportId, input.sourceReportId));
  for (const item of sourceMeetings) {
    const { id: oldId, reportId, ...meetingData } = item;
    const [inserted] = await dbInstance
      .insert(meetings)
      .values({
        ...meetingData,
        reportId: newReportId,
      })
      .returning({ id: meetings.id });
    meetingIdMap.set(oldId, inserted.id);
  }

  const drillIdMap = new Map<string, string>();
  const sourceDrills = await dbInstance
    .select()
    .from(drills)
    .where(eq(drills.reportId, input.sourceReportId));
  for (const item of sourceDrills) {
    const { id: oldId, reportId, ...drillData } = item;
    const [inserted] = await dbInstance
      .insert(drills)
      .values({
        ...drillData,
        reportId: newReportId,
      })
      .returning({ id: drills.id });
    drillIdMap.set(oldId, inserted.id);
  }

  const trainingIdMap = new Map<string, string>();
  const sourceTrainings = await dbInstance
    .select()
    .from(trainings)
    .where(eq(trainings.reportId, input.sourceReportId));
  for (const item of sourceTrainings) {
    const { id: oldId, reportId, ...trainingData } = item;
    const [inserted] = await dbInstance
      .insert(trainings)
      .values({
        ...trainingData,
        reportId: newReportId,
      })
      .returning({ id: trainings.id });
    trainingIdMap.set(oldId, inserted.id);
  }

  const permitIdMap = new Map<string, string>();
  const sourcePermits = await dbInstance
    .select()
    .from(permits)
    .where(eq(permits.reportId, input.sourceReportId));
  for (const item of sourcePermits) {
    const { id: oldId, reportId, ...permitData } = item;
    const [inserted] = await dbInstance
      .insert(permits)
      .values({
        ...permitData,
        reportId: newReportId,
      })
      .returning({ id: permits.id });
    permitIdMap.set(oldId, inserted.id);
  }

  const inspectionIdMap = new Map<string, string>();
  const sourceInspections = await dbInstance
    .select()
    .from(inspections)
    .where(eq(inspections.reportId, input.sourceReportId));
  for (const item of sourceInspections) {
    const { id: oldId, reportId, ...inspectionData } = item;
    const [inserted] = await dbInstance
      .insert(inspections)
      .values({
        ...inspectionData,
        reportId: newReportId,
      })
      .returning({ id: inspections.id });
    inspectionIdMap.set(oldId, inserted.id);
  }

  // 9. Marine specific tables (if marine)
  if (formType === 'marine') {
    const sourceOperations = await dbInstance
      .select()
      .from(operations)
      .where(eq(operations.reportId, input.sourceReportId));
    for (const item of sourceOperations) {
      const { id, reportId, ...operationData } = item;
      await dbInstance.insert(operations).values({
        ...operationData,
        reportId: newReportId,
      });
    }

    const [sourceVesselsSummary] = await dbInstance
      .select()
      .from(vesselsUnderPoSummary)
      .where(eq(vesselsUnderPoSummary.reportId, input.sourceReportId));
    if (sourceVesselsSummary) {
      const { id, reportId, ...summaryData } = sourceVesselsSummary;
      await dbInstance.insert(vesselsUnderPoSummary).values({
        ...summaryData,
        reportId: newReportId,
      });
    }
  }

  // 10. Copy physical files and clone supportingFiles records
  try {
    const sourceFolder = uploadsPath('reports', input.sourceReportId);
    const targetFolder = uploadsPath('reports', newReportId);
    if (fs.existsSync(sourceFolder)) {
      await fs.promises.cp(sourceFolder, targetFolder, { recursive: true });
    }
  } catch (copyErr) {
    console.error('Failed to copy physical uploads during duplication:', copyErr);
  }

  const sourceFiles = await dbInstance
    .select()
    .from(supportingFiles)
    .where(eq(supportingFiles.reportId, input.sourceReportId));

  for (const file of sourceFiles) {
    const { id, reportId, createdAt, updatedAt, ...fileData } = file;
    await dbInstance.insert(supportingFiles).values({
      ...fileData,
      reportId: newReportId,
      meetingId: file.meetingId ? meetingIdMap.get(file.meetingId) || null : null,
      drillId: file.drillId ? drillIdMap.get(file.drillId) || null : null,
      trainingId: file.trainingId ? trainingIdMap.get(file.trainingId) || null : null,
      permitId: file.permitId ? permitIdMap.get(file.permitId) || null : null,
      inspectionId: file.inspectionId ? inspectionIdMap.get(file.inspectionId) || null : null,
    });
  }

  // 11. Recalculate log manhours for the target date
  try {
    await recalculateLogManhoursForDate(targetIsoDate);
  } catch (recalcErr) {
    console.error('Failed to recalculate log manhours after duplication:', recalcErr);
  }

  return { reportId: newReportId };
}

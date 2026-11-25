import {
  dailyReports, laggingIndicators, manhours, meetings, drills, trainings,
  inspections, smartCards, highlights, permits, operations,
  vesselsUnderPoSummary, supportingFiles,
} from '../../db/schema/report.schema.ts';
import { db } from '../../db/index.ts';
import {and, eq, inArray} from 'drizzle-orm';
import {deleteFilesByIds} from "./files/delete.service.ts";

const typeToTable = {
  meeting: meetings,
  drill: drills,
  training: trainings,
  permit: permits,
  permitToWork: permits,
  inspection: inspections,
};

const typeToColumn = {
  meeting: supportingFiles.meetingId,
  drill: supportingFiles.drillId,
  training: supportingFiles.trainingId,
  permit: supportingFiles.permitId,
  permitToWork: supportingFiles.permitId,
  inspection: supportingFiles.inspectionId,
};

/**
 * Helper untuk menghapus semua data relasi berdasarkan reportId
 */
async function deleteRelatedData(reportIds: string[]) {
  await Promise.all([
    db.delete(laggingIndicators).where(inArray(laggingIndicators.reportId, reportIds)),
    db.delete(manhours).where(inArray(manhours.reportId, reportIds)),
    db.delete(smartCards).where(inArray(smartCards.reportId, reportIds)),
    db.delete(supportingFiles).where(inArray(supportingFiles.reportId, reportIds)),
    db.delete(meetings).where(inArray(meetings.reportId, reportIds)),
    db.delete(drills).where(inArray(drills.reportId, reportIds)),
    db.delete(trainings).where(inArray(trainings.reportId, reportIds)),
    db.delete(inspections).where(inArray(inspections.reportId, reportIds)),
    db.delete(highlights).where(inArray(highlights.reportId, reportIds)),
    db.delete(permits).where(inArray(permits.reportId, reportIds)),

    // marine-related, always try to delete regardless of formType
    db.delete(operations).where(inArray(operations.reportId, reportIds)),
    db.delete(vesselsUnderPoSummary).where(inArray(vesselsUnderPoSummary.reportId, reportIds)),
  ]);
}

/**
 * Hapus satu laporan harian berdasarkan ID
 */
export async function deleteDailyReport(reportId: string) {
  const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, reportId));
  if (!report) return { deleted: false, reason: 'Report not found' };

  await deleteRelatedData([reportId]);
  await db.delete(dailyReports).where(eq(dailyReports.id, reportId));

  return { deleted: true };
}

/**
 * Hapus banyak laporan harian berdasarkan daftar ID
 */
export async function deleteDailyReports(reportIds: string[]) {
  if (!reportIds.length) return { deleted: false, reason: 'No reportIds provided' };

  const reports = await db
    .select({ id: dailyReports.id })
    .from(dailyReports)
    .where(inArray(dailyReports.id, reportIds));

  if (reports.length === 0) {
    return { deleted: false, reason: 'No matching reports found' };
  }

  const existingIds = reports.map(r => r.id);

  await deleteRelatedData(existingIds);
  await db.delete(dailyReports).where(inArray(dailyReports.id, existingIds));

  return { totalDeleted: existingIds.length };
}

export async function deleteSectionById(
  type: 'meeting' | 'drill' | 'training' | 'permit' | 'permitToWork' | 'inspection',
  sectionId: string,
  reportId: string
) {
  const table = typeToTable[type];
  const column = typeToColumn[type];

  const [section] = await db
    .select()
    .from(table)
    .where(and(eq(table.id, sectionId), eq(table.reportId, reportId)));

  if (!section) {
    return { deleted: false, reason: `${type} not found` };
  }

  const files = await db
    .select()
    .from(supportingFiles)
    .where(and(eq(supportingFiles.reportId, reportId), eq(column, sectionId)));

  if (files.length) {
    const fileIds = files.map(f => f.id);
    await deleteFilesByIds(fileIds);
  }

  await db.delete(table).where(eq(table.id, sectionId));

  return { deleted: true };
}

export async function deleteSectionsBulk(
  type: 'meeting' | 'drill' | 'training' | 'permit' | 'permitToWork' | 'inspection',
  sectionIds: string[],
  reportId: string
) {
  if (!sectionIds.length) return { deleted: false, reason: 'No sectionIds provided' };

  const table = typeToTable[type];
  const column = typeToColumn[type];

  const files = await db
    .select()
    .from(supportingFiles)
    .where(
      and(
        eq(supportingFiles.reportId, reportId),
        inArray(column, sectionIds)
      )
    );

  if (files.length) {
    const fileIds = files.map(f => f.id);
    await deleteFilesByIds(fileIds);
  }

  await db.delete(table).where(inArray(table.id, sectionIds));

  return { deleted: true, totalDeleted: sectionIds.length };
}


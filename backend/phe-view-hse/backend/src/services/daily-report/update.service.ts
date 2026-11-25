import {
  dailyReports, laggingIndicators, meetings, drills, trainings,
  inspections, smartCards, highlights, permits, operations, dailyReportSubtypes
} from '../../db/schema/report.schema.ts';
import { getDailyReportDetail } from './detail.service.ts';
import { db } from '../../db/index.ts';
import { and, eq } from 'drizzle-orm';
import { UploadFiles } from './files/upload.service.ts';
import { deleteFilesByIds } from './files/delete.service.ts';

export async function updateDailyReport(
  reportId: string,
  data: any,
  role: 'admin' | 'user' | 'crew',
  files?: Record<string, {
    buffer: Buffer;
    filename: string;
    mimetype: string;
    fieldname: string;
  }>
): Promise<{ detail: any } | { error: string }> {
  const [existing] = await db
    .select({ formType: dailyReports.formType })
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId));
  if (!existing) return { error: 'Report not found' };

  const formType = existing.formType;

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

  if (data.dailyReport) {
    const daily = { ...data.dailyReport };
    
    if (daily.reportDate && typeof daily.reportDate === 'string') {
      const parsed = new Date(daily.reportDate);
      if (!isNaN(parsed.getTime())) {
        daily.reportDate = parsed.toISOString().split('T')[0];
      }
    }
    
    // Ensure updatedAt is set to current time
    daily.updatedAt = new Date();
    
    // Filter out undefined or null values that might cause issues
    const filteredDaily: Record<string, any> = {};
    for (const [key, value] of Object.entries(daily)) {
      if (key === 'workLocationId') {
        filteredDaily[key] = (value && value !== '') ? value : null;
      } else if (value !== undefined && value !== null) {
        filteredDaily[key] = value;
      }
    }
    
    // Add proper error handling and verification for the update operation
    try {
      const result = await db.update(dailyReports).set(filteredDaily).where(eq(dailyReports.id, reportId)).returning();

      if (result.length === 0) {
        return { error: 'Report not found or no changes made' };
      }
    } catch (error) {
      throw error;
    }
  } else if (data.reportDate || data.reportedBy || data.instansi || data.workLocationId !== undefined) {
    // Handle case where data is at root level (not nested under dailyReport)
    const daily = { ...data };
    
    if (daily.reportDate && typeof daily.reportDate === 'string') {
      const parsed = new Date(daily.reportDate);
      if (!isNaN(parsed.getTime())) {
        daily.reportDate = parsed.toISOString().split('T')[0];
      }
    }
    
    // Ensure updatedAt is set to current time
    daily.updatedAt = new Date();
    
    // Filter out undefined or null values that might cause issues
    const filteredDaily: Record<string, any> = {};
    for (const [key, value] of Object.entries(daily)) {
      // Only include fields that exist in the dailyReports schema
      const validFields = ['reportDate', 'reportedBy', 'instansi', 'formType', 'subtype', 'workLocationId'];
      if (validFields.includes(key) && value !== undefined) {
        if (key === 'workLocationId') {
          filteredDaily[key] = (value && value !== '') ? value : null;
        } else if (value !== null) {
          filteredDaily[key] = value;
        }
      }
    }
    
    // Add proper error handling and verification for the update operation
    try {
      const result = await db.update(dailyReports).set(filteredDaily).where(eq(dailyReports.id, reportId)).returning();
      if (result.length === 0) {
        return { error: 'Report not found or no changes made' };
      }
    } catch (error) {
      throw error;
    }
  }

  if (data.subtype) {
    const subtypeId = data.subtype;
    const [existingSubtype] = await db
      .select({ subtypeId: dailyReportSubtypes.subtypeId })
      .from(dailyReportSubtypes)
      .where(eq(dailyReportSubtypes.reportId, reportId));

    if (!existingSubtype) {
      await db.insert(dailyReportSubtypes).values({
        reportId,
        subtypeId,
      });
    } else if (existingSubtype.subtypeId !== subtypeId) {
      await db.update(dailyReportSubtypes)
        .set({ subtypeId })
        .where(eq(dailyReportSubtypes.reportId, reportId));
    }
  }

  const updateMap: Record<string, string[]> = {
    project: ['lagging', 'smartCard', 'meeting', 'drill', 'training', 'inspections', 'permit', 'highlight'],
    marine: ['lagging', 'smartCard', 'operations', 'vesselsUnderPo', 'vesselsUnderPoSummary', 'meeting', 'drill', 'training', 'inspections', 'permit'],
  };

  const crewAllowedFields = ['meeting', 'drill', 'training', 'inspections', 'permit'];
  const keysToUpdate = updateMap[formType]?.filter((key) => {
    if (role === 'crew') {
      return crewAllowedFields.includes(key);
    }
    return true;
  }) ?? [];

  for (const key of keysToUpdate) {
    if (!data[key]) continue;
    const sectionData = data[key];
    const sectionFiles = files ?? {};

    switch (key) {
      case 'lagging':
        let laggingData = { ...sectionData };
        const statusFreeLtaRi = sectionData.statusFreeLtaRi ?? true;
        
        if (statusFreeLtaRi) {
          laggingData = {
            ...sectionData,
            freeLtaDays: 1,
            freeRiDays: 1,
            fatality: 0,
            lti: 0,
            restrictedWorkDayCase: 0,
            medicalTreatmentCase: 0,
          };
        } else{
          laggingData = {
            ...sectionData,
            freeLtaDays: 0,
            freeRiDays: 0,
          }
        }
        
        await db.update(laggingIndicators)
          .set(laggingData)
          .where(eq(laggingIndicators.reportId, reportId));
        await handleFileUpload(key, sectionFiles, reportId, null, sectionData.files ?? []);
        break;

      case 'smartCard':
        await db.update(smartCards)
          .set(sectionData)
          .where(eq(smartCards.reportId, reportId));
        await handleFileUpload(key, sectionFiles, reportId, null, sectionData.files ?? []);
        break;

      case 'highlight':
        await db.update(highlights)
          .set(sectionData)
          .where(eq(highlights.reportId, reportId));
        await handleFileUpload(key, sectionFiles, reportId, null, sectionData.files ?? []);
        break;

      case 'meeting':
      case 'drill':
      case 'training':
      case 'permit': {
        const table = { meeting: meetings, drill: drills, training: trainings, permit: permits }[key];

        const filesList = sectionData.files ?? [];

        if (sectionData?.id) {
          const updateFields = Object.fromEntries(
            Object.entries(sectionData).filter(([k, v]) =>
              k !== 'files' && v !== undefined && v !== null && v !== ''
            )
          );
          await db.update(table)
            .set(updateFields)
            .where(eq(table.id, sectionData.id));

          await handleFileUpload(key, sectionFiles, reportId, sectionData.id, filesList);
        } else {
          const insertFields = Object.fromEntries(
            Object.entries(sectionData).filter(([k, v]) =>
              k !== 'files' && v !== undefined && v !== null && v !== ''
            )
          );
          const [created] = await db.insert(table)
            .values({ reportId, ...insertFields })
            .returning({ id: table.id });

          await handleFileUpload(key, sectionFiles, reportId, created.id, filesList);
        }
        break;
      }

      case 'inspections': {
        const inspectionsData = sectionData ?? [];

        for (const item of inspectionsData) {
          if (!item.type) continue;
          const fileItems = Array.isArray(item.files) ? item.files : [];

          if (item.id) {
            const updateFields = Object.fromEntries(
              Object.entries(item).filter(([k, v]) =>
                k !== 'files' && v !== undefined && v !== null && v !== ''
              )
            );
            await db.update(inspections)
              .set(updateFields)
              .where(eq(inspections.id, item.id));

            const deleteFileIds = fileItems
              .filter((f: any) => f.type === 'delete' && f.id)
              .map((f: any) => f.id);
            if (deleteFileIds.length > 0) {
              await deleteFilesByIds(deleteFileIds);
            }

            const newFileItems = fileItems.filter(
              (f: any) =>
                typeof f.file === 'string' &&
                sectionFiles[f.file] &&
                f.type !== 'delete'
            );
            if (newFileItems.length > 0) {
              const uploadableFiles = newFileItems.map((f: any) =>
                toUploadInput(sectionFiles[f.file])
              );
              const fileNotes = newFileItems.map((f: any) => f.note ?? '');

              await UploadFiles(uploadableFiles, fileNotes, reportId, item.id, 'inspection');
            }

          } else {
            const insertFields = Object.fromEntries(
              Object.entries(item).filter(([k, v]) =>
                k !== 'files' && v !== undefined && v !== null && v !== ''
              )
            );
            const [created] = await db.insert(inspections)
              .values({ reportId, type: item.type, ...insertFields })
              .returning({ id: inspections.id });

            const newFileItems = fileItems.filter(
              (f: any) =>
                typeof f.file === 'string' &&
                sectionFiles[f.file] &&
                f.type !== 'delete'
            );
            if (newFileItems.length > 0) {
              const uploadableFiles = newFileItems.map((f: any) =>
                toUploadInput(sectionFiles[f.file])
              );
              const fileNotes = newFileItems.map((f: any) => f.note ?? '');

              await UploadFiles(uploadableFiles, fileNotes, reportId, created.id, 'inspection');
            }
          }
        }
        break;
      }

      case 'operations': {
        const parsed = typeof sectionData === 'string' ? JSON.parse(sectionData) : sectionData;
        const opsArray = Array.isArray(parsed?.data) ? parsed.data : [];

        for (const item of opsArray) {
          if (!item.region) continue;
          await db.update(operations)
            .set({ ...item })
            .where(and(
              eq(operations.reportId, reportId),
              eq(operations.region, item.region),
            ));
        }

        const fileItems = Array.isArray(parsed?.files) ? parsed.files : [];
        await handleFileUpload(key, sectionFiles, reportId, null, fileItems);
        break;
      }
    }
  }

  const detail = await getDailyReportDetail(reportId);
  
  return detail;
}

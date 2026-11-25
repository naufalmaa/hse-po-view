import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import convert from 'heic-convert';
import { db } from '../../../db/index.ts';
import { supportingFiles } from '../../../db/schema/report.schema.ts';
import { getTimestampFilename } from '../../../utils/utils.ts';
import type { UploadedFile } from '../../../types/file.ts';
import env, { uploadsPath } from '../../../config/env.config.ts';

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsReportDir}`;

export async function UploadFiles(
  files: UploadedFile[],
  notes: string[],
  reportId: string,
  sectionId?: string | null,
  sectionType?: string | null
): Promise<{
  total: number;
  files: {
    id: string;
    reportId: string;
    sectionId: string | null;
    sectionType: string | null;
    originalName: string;
    savedName: string;
    fileType: string;
    filePath: string;
    section: string | null;
    note: string;
    url: string;
    thumbnailUrl: string;
  }[];
}> {
  const reportFolder = uploadsPath('reports', reportId);
  const thumbnailFolder = path.resolve(reportFolder, 'thumbnail');

  await fs.mkdir(reportFolder, { recursive: true });
  await fs.mkdir(thumbnailFolder, { recursive: true });

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const note = notes[i] ?? '';
    const renamedOriginal = getTimestampFilename(file.filename);

    const isHeic = file.filename.toLowerCase().endsWith('.heic') ||
                   file.filename.toLowerCase().endsWith('.heif') ||
                   file.mimetype === 'image/heic' ||
                   file.mimetype === 'image/heif';

    let bufferToSave = file.buffer;
    let renamed = renamedOriginal;
    let fileTypeToSave = file.mimetype;

    if (isHeic) {
      try {
        const converted = await convert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 0.85,
        });
        bufferToSave = Buffer.from(converted);
        renamed = renamedOriginal.replace(/\.(heic|heif)$/i, '.jpeg');
        fileTypeToSave = 'image/jpeg';
      } catch (err) {
        console.error('Failed to convert HEIC to JPEG during upload:', err);
      }
    }

    const filePath = path.resolve(reportFolder, renamed);
    const thumbPath = path.resolve(thumbnailFolder, renamed);

    const insertData: any = {
      reportId,
      fileName: file.filename,
      fileType: fileTypeToSave,
      filePath: renamed,
      note,
      section: sectionType ?? null,
      sectionId: sectionId ?? null,
    };

    // Optional: tambahkan relasi ID ke kolom relasi khusus
    if (sectionType && sectionId) {
      switch (sectionType) {
        case 'inspection':
          insertData.inspectionId = sectionId;
          break;
        case 'meeting':
          insertData.meetingId = sectionId;
          break;
        case 'drill':
          insertData.drillId = sectionId;
          break;
        case 'training':
          insertData.trainingId = sectionId;
          break;
        case 'permit':
          insertData.permitId = sectionId;
          break;
      }
    }

    const inserted = await db
      .insert(supportingFiles)
      .values(insertData)
      .returning({ id: supportingFiles.id });

    const fileId = inserted[0]?.id;
    if (!fileId) {
      throw new Error(`Failed to insert file '${file.filename}' into DB`);
    }

    await fs.writeFile(filePath, bufferToSave);

    let thumbnailUrl = '';
    if (
      fileTypeToSave?.startsWith('image/') &&
      fileTypeToSave !== 'image/x-icon' &&
      !file.filename.toLowerCase().endsWith('.ico')
    ) {
      try {
        await sharp(bufferToSave)
          .resize({ width: 400, height: 225, fit: 'inside' })
          .jpeg({ quality: 80 })
          .toFile(thumbPath);
        thumbnailUrl = `${BASE_URL}/${reportId}/thumbnail/${renamed}`;
      } catch (sharpErr) {
        console.error('Failed to generate thumbnail for:', renamed, sharpErr);
      }
    }

    results.push({
      id: fileId,
      reportId,
      sectionId: sectionId ?? null,
      sectionType: sectionType ?? null,
      originalName: file.filename,
      savedName: renamed,
      fileType: fileTypeToSave,
      filePath: renamed,
      section: sectionType ?? null,
      note,
      url: `${BASE_URL}/${reportId}/${renamed}`,
      thumbnailUrl,
    });
  }

  return {
    total: results.length,
    files: results,
  };
}

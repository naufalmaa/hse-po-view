import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { db } from '../../../db/index.ts';
import { file as qualificationFile } from '../../../db/schema/csms.schema.ts';
import type { UploadedFile } from '../../../types/file.ts';
import { getTimestampFilename } from '../../../utils/utils.ts';
import env from '../../../config/env.config.ts';

interface UploadQualificationFileInput {
  qualificationAssessmentId: string;
  files: UploadedFile[];
  notes?: string[];
}

export async function uploadQualificationFilesService({
  qualificationAssessmentId,
  files,
  notes = [],
}: UploadQualificationFileInput) {
  const qualificationFolder = path.resolve(process.cwd(), '../uploads', 'csms', 'qualifications', qualificationAssessmentId);
  const thumbnailFolder = path.resolve(qualificationFolder, 'thumbnail');

  await fs.mkdir(qualificationFolder, { recursive: true });
  await fs.mkdir(thumbnailFolder, { recursive: true });

  const results: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const note = notes[i] ?? '';
    const renamed = getTimestampFilename(file.filename);

    // Save the file
    const fullPath = path.resolve(qualificationFolder, renamed);
    await fs.writeFile(fullPath, file.buffer);

    // Generate thumbnail for images
    let hasThumbnail = false;
    if (
      file.mimetype?.startsWith('image/') &&
      file.mimetype !== 'image/x-icon' &&
      !file.filename.toLowerCase().endsWith('.ico')
    ) {
      const thumbPath = path.resolve(thumbnailFolder, renamed);
      await sharp(file.buffer)
        .resize(300)
        .jpeg({ quality: 70 })
        .toFile(thumbPath);
      hasThumbnail = true;
    }

    // Save file metadata to database
    const [inserted] = await db
      .insert(qualificationFile)
      .values({
        qualificationAssessmentId,
        fileName: file.filename,
        fileType: file.mimetype,
        filePath: renamed,
        note: note,
      })
      .returning();

    const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}/`;
    results.push({
      id: inserted.id,
      qualificationAssessmentId,
      originalName: file.filename,
      savedName: renamed,
      fileType: file.mimetype,
      filePath: renamed,
      note: note,
      url: `${BASE_URL}/qualifications/${qualificationAssessmentId}/${renamed}`,
      thumbnailUrl: hasThumbnail
        ? `${BASE_URL}/qualifications/${qualificationAssessmentId}/thumbnail/${renamed}`
        : '',
    });
  }

  return {
    total: results.length,
    files: results,
  };
}
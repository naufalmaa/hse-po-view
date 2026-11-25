import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { db } from '../../db/index.ts';
import { employeeFiles } from '../../db/schema/employee.schema.ts';
import type { UploadedFile } from '../../types/file.ts';
import { getTimestampFilename } from '../../utils/utils.ts';
import env from '../../config/env.config.ts';

interface UploadFileInput {
  employeeId: string;
  files: UploadedFile[];
  type?: string; // bebas, bisa undefined
  relatedId?: string;
}

export async function uploadEmployeeFilesService({
  employeeId,
  files,
  type,
  relatedId,
}: UploadFileInput) {
  const employeeFolder = path.resolve(process.cwd(), '../uploads', 'employees', employeeId);
  const thumbnailFolder = path.resolve(employeeFolder, 'thumbnail');

  await fs.mkdir(employeeFolder, { recursive: true });
  await fs.mkdir(thumbnailFolder, { recursive: true });

  const results: any[] = [];

  for (const file of files) {
    const renamed = getTimestampFilename(file.filename);

    const relatedFieldMap: Record<string, Record<string, string>> = {
      mcus: { mcuId: relatedId || '' },
      certificates: { certificateId: relatedId || '' },
      bpjs: { bpjsId: relatedId || '' },
      sika: { sikaId: relatedId || '' },
      vaccinations: { vaccinationId: relatedId || '' },
      contracts: { contractId: relatedId || '' },
    };

    const relatedFields =
      type && relatedId && relatedFieldMap[type]
        ? relatedFieldMap[type]
        : {};

    const [inserted] = await db
      .insert(employeeFiles)
      .values({
        employeeId,
        type: type || '',
        fileName: file.filename,
        filePath: renamed,
        fileType: file.mimetype,
        ...relatedFields,
      })
      .returning();

    const fullPath = path.resolve(employeeFolder, renamed);
    await fs.writeFile(fullPath, file.buffer);

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

    const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsEmployeesDir}`;
    results.push({
      id: inserted.id,
      reportId: employeeId,
      sectionId: relatedId ?? null,
      sectionType: type || null,
      originalName: file.filename,
      savedName: renamed,
      fileType: file.mimetype,
      filePath: renamed,
      section: type || null,
      url: `${BASE_URL}/${employeeId}/${renamed}`,
      thumbnailUrl: hasThumbnail
        ? `${BASE_URL}/${employeeId}/thumbnail/${renamed}`
        : '',
    });
  }

  return {
    total: results.length,
    files: results,
  };
}

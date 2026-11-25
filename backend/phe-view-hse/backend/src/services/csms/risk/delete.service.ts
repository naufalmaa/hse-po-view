import { db } from '../../../db/index.ts'
import { file, risk_assessment } from '../../../db/schema/csms.schema.ts'
import {eq, inArray} from 'drizzle-orm'
import fs from 'fs/promises'
import path from 'path'

export async function deleteRiskAssessment(id: string) {
  const baseDir = path.resolve('uploads', 'csms', 'risks', id)
  try {
    await fs.rm(baseDir, { recursive: true, force: true })
  } catch (err) {
    console.warn(`Failed to delete folder for risk ${id}:`, err)
  }

  await db.delete(file).where(eq(file.riskAssessmentId, id))
  await db.delete(risk_assessment).where(eq(risk_assessment.id, id))

  return { message: 'Risk assessment and associated files deleted', riskAssessmentId: id }
}

export async function deleteRiskFileByIds(fileIds: string[]) {
  const files = await db
    .select()
    .from(file)
    .where(inArray(file.id, fileIds));

  if (!files.length) {
    return { message: 'No files found with the provided IDs', success: false };
  }

  for (const fileData of files) {
    const { id, riskAssessmentId, filePath, fileType } = fileData;

    if (!riskAssessmentId) {
      continue;
    }

    const basePath = path.resolve('uploads', 'csms', 'risks', riskAssessmentId);
    const fullPath = path.resolve(basePath, filePath);
    const thumbPath = fileType?.startsWith('image/')
      ? path.resolve(basePath, 'thumbnail', filePath)
      : null;

    try {
      // Delete main file if exists
      await fs.unlink(fullPath).catch((err) => {
        if (err.code === 'ENOENT') {
        } else {
          console.warn(`Failed to delete file ${fullPath}:`, err);
        }
      });

      // Delete thumbnail if it's an image
      if (thumbPath) {
        await fs.unlink(thumbPath).catch((err) => {
          if (err.code === 'ENOENT') {
          } else {
            console.warn(`Failed to delete thumbnail ${thumbPath}:`, err);
          }
        });
      }
    } catch (err) {
      console.error(`Error processing file ${id}:`, err);
    }
  }

  // Delete records from DB regardless of file existence
  await db.delete(file).where(inArray(file.id, fileIds));

  return {
    message: 'Files processed for deletion',
    success: true,
    deletedFileIds: fileIds,
  };
}



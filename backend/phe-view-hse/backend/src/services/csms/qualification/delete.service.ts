import { db } from '../../../db/index.ts'
import { file, qualification_assessment } from '../../../db/schema/csms.schema.ts'
import {eq, inArray} from 'drizzle-orm'
import fs from 'fs/promises'
import path from 'path'

export async function deleteQualificationAssessment(id: string) {
  const baseDir = path.resolve(process.cwd(), '../uploads', 'csms', 'qualifications', 'qualifications', id)
  try {
    await fs.rm(baseDir, { recursive: true, force: true })
  } catch (err) {
    console.warn(`Failed to delete folder for Qualification ${id}:`, err)
  }

  await db.delete(file).where(eq(file.qualificationAssessmentId, id))
  await db.delete(qualification_assessment).where(eq(qualification_assessment.id, id))

  return { message: 'Qualification assessment and associated files deleted', qualificationAssessmentId: id }
}

export async function deleteQualificationFileByIds(fileIds: string[]) {
  // Get all files to be deleted
  const files = await db
    .select()
    .from(file)
    .where(inArray(file.id, fileIds));

  if (!files.length) {
    return { message: 'No files found with the provided IDs', success: false };
  }

  // Process each file for deletion
  for (const fileData of files) {
    const { id, qualificationAssessmentId, filePath, fileType } = fileData;

    if (!qualificationAssessmentId) {
      console.warn(`Skipping file ${id}: Missing qualificationAssessmentId`);
      continue;
    }

    const basePath = path.resolve(process.cwd(), '../uploads', 'csms', 'qualifications', qualificationAssessmentId);
    const fullPath = path.resolve(basePath, filePath);
    const thumbPath = fileType?.startsWith('image/')
      ? path.resolve(basePath, 'thumbnail', filePath)
      : null;

    try {
      // Delete main file
      await fs.unlink(fullPath).catch((err) => {
        console.warn(`Failed to delete file ${fullPath}:`, err);
      });

      // Delete thumbnail if it's an image
      if (thumbPath) {
        await fs.unlink(thumbPath).catch((err) => {
          console.warn(`Failed to delete thumbnail ${thumbPath}:`, err);
        });
      }
    } catch (err) {
      console.error(`Error processing file ${id}:`, err);
    }
  }

  // Delete all file records from database
  await db.delete(file).where(inArray(file.id, fileIds));

  return {
    message: 'Files processed for deletion',
    success: true,
    deletedFileIds: fileIds,
  };
}



import { db } from '../../../db/index.ts'
import { file, guideline } from '../../../db/schema/csms.schema.ts'
import { inArray, eq } from 'drizzle-orm'
import fs from 'fs/promises'
import path from 'path'

export async function deleteGuideline(id: string) {
  // 1. Hapus folder file dari disk
  const baseDir = path.resolve(process.cwd(), '../uploads', 'csms', 'guidelines', id)
  try {
    await fs.rm(baseDir, { recursive: true, force: true })
  } catch (err) {
    console.warn(`Failed to delete folder for guideline ${id}:`, err)
  }

  // 2. Hapus record file & guideline dari DB
  await db.delete(file).where(eq(file.guidelineId, id))
  await db.delete(guideline).where(eq(guideline.id, id))

  return { message: 'Guideline and associated files deleted', guidelineId: id }
}

export async function deleteGuidelineFileByIds(fileIds: string[]) {
  const files = await db
    .select()
    .from(file)
    .where(inArray(file.id, fileIds));

  if (!files.length) {
    return { message: 'No files found with the provided IDs', success: false };
  }

  for (const fileData of files) {
    const { id, guidelineId, filePath, fileType } = fileData;

    if (!guidelineId) {
      continue;
    }

    const basePath = path.resolve(process.cwd(), '../uploads', 'csms', 'guidelines', guidelineId);
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

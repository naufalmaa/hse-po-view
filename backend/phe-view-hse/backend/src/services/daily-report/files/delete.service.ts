import { db } from "../../../db/index.ts";
import { supportingFiles } from "../../../db/schema/report.schema.ts";
import { inArray } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs/promises";

export async function deleteFilesByIds(ids: string[]) {
  if (!ids.length) {
    return {
    };
  }

  const files = await db
    .select()
    .from(supportingFiles)
    .where(inArray(supportingFiles.id, ids));

  if (!files.length) {
    return {
    };
  }

  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), '../uploads', 'reports', file.reportId, file.filePath);
    const thumbPath = path.resolve(process.cwd(), '../uploads', 'reports', file.reportId, 'thumbnail', file.filePath);
    try {
      await fs.rm(fullPath, { force: true });
      await fs.rm(thumbPath, { force: true });
    } catch (err) {
      console.warn('Failed to delete files:', fullPath, err);
    }
  }

  await db.delete(supportingFiles).where(inArray(supportingFiles.id, ids));

  return {
    deletedIds: files.map(f => f.id),
  };
}

import { db } from '../../../db/index.ts';
import { supportingFiles } from '../../../db/schema/report.schema.ts';
import { eq } from 'drizzle-orm';

export async function updateFileNote(fileId: string, note: string) {
  const [existing] = await db
    .select()
    .from(supportingFiles)
    .where(eq(supportingFiles.id, fileId));

  if (!existing) {
    return {
      success: false as const,
      message: 'File not found',
    };
  }

  await db
    .update(supportingFiles)
    .set({ note })
    .where(eq(supportingFiles.id, fileId));

  return {
    fileId,
    note,
  };
}

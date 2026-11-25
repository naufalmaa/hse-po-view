import { db } from '../../../db/index.ts'
import { file, guideline } from '../../../db/schema/csms.schema.ts'
import { eq } from 'drizzle-orm'
import env from "../../../config/env.config.ts";

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getGuidelineDetail(guidelineId: string) {
  const [data] = await db
    .select()
    .from(guideline)
    .where(eq(guideline.id, guidelineId))

  if (!data) return null

  const files = await db
    .select({
      id: file.id,
      guidelineId: file.guidelineId,
      fileName: file.fileName,
      fileType: file.fileType,
      filePath: file.filePath,
      note: file.note,
    })
    .from(file)
    .where(eq(file.guidelineId, guidelineId))

  const filesData = files.map(f => ({
    ...f,
    note: f.note ?? undefined,
    url: `${BASE_URL}/guidelines/${guidelineId}/${f.filePath}`,
    thumbnailUrl: f.fileType.startsWith('image/')
      ? `${BASE_URL}/guidelines/${guidelineId}/thumbnail/${f.filePath}`
      : undefined
  }))

  return { ...data, files: filesData }
}
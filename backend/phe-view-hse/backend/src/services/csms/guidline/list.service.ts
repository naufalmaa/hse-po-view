import { db } from '../../../db/index.ts'
import { file, guideline } from '../../../db/schema/csms.schema.ts'
import { inArray } from 'drizzle-orm'
import env from "../../../config/env.config.ts";

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getGuidelineList() {
  const guidelines = await db.select().from(guideline)

  if (!guidelines.length) return []

  const ids = guidelines.map(g => g.id)
  const allFiles = await db.select().from(file).where(inArray(file.guidelineId, ids))

  const fileMap = new Map<string, any[]>()

  for (const f of allFiles) {
    const gId = f.guidelineId
    if (!gId) continue // Lewatkan jika guidelineId null

    if (!fileMap.has(gId)) fileMap.set(gId, [])

    fileMap.get(gId)!.push({
      ...f,
      note: f.note ?? undefined,
      url: `${BASE_URL}/guidelines/${gId}/${f.filePath}`,
      thumbnailUrl: f.fileType.startsWith('image/')
        ? `${BASE_URL}/guidelines/${gId}/thumbnail/${f.filePath}`
        : undefined
    })
  }

  return guidelines.map(g => ({
    ...g,
    files: fileMap.get(g.id) ?? []
  }))
}

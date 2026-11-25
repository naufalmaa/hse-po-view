import { db } from '../../../db/index.ts'
import {
  subContractors,
  userContractors,
} from '../../../db/schema/auth.schema.ts'
import { file, risk_assessment } from '../../../db/schema/csms.schema.ts'
import { eq, inArray } from 'drizzle-orm'
import env from '../../../config/env.config.ts'

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getRiskAssessmentList(user: { id: string; role: string }) {
  let riskAssessments

  if (user.role === 'contractor') {
    // Join lewat userContractors → subContractors
    riskAssessments = await db
      .select({
        id: risk_assessment.id,
        contractorId: risk_assessment.contractorId,
        contractorName: subContractors.name,
        title: risk_assessment.title,
        description: risk_assessment.description,
        status: risk_assessment.status,
        note: risk_assessment.note,
        createdAt: risk_assessment.createdAt,
        editedAt: risk_assessment.editedAt,
      })
      .from(risk_assessment)
      .leftJoin(userContractors, eq(risk_assessment.contractorId, userContractors.userId))
      .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(risk_assessment.contractorId, user.id))
  } else {
    // Admin lihat semua
    riskAssessments = await db
      .select({
        id: risk_assessment.id,
        contractorId: risk_assessment.contractorId,
        contractorName: subContractors.name,
        title: risk_assessment.title,
        description: risk_assessment.description,
        status: risk_assessment.status,
        note: risk_assessment.note,
        createdAt: risk_assessment.createdAt,
        editedAt: risk_assessment.editedAt,
      })
      .from(risk_assessment)
      .leftJoin(userContractors, eq(risk_assessment.contractorId, userContractors.userId))
      .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
  }

  if (!riskAssessments.length) return []

  const ids = riskAssessments.map(r => r.id)
  const allFiles = await db.select().from(file).where(inArray(file.riskAssessmentId, ids))

  const fileMap = new Map<string, any[]>()

  for (const f of allFiles) {
    const rId = f.riskAssessmentId
    if (!rId) continue

    if (!fileMap.has(rId)) fileMap.set(rId, [])

    fileMap.get(rId)!.push({
      ...f,
      note: f.note ?? undefined,
      url: `${BASE_URL}/risks/${rId}/${f.filePath}`,
      thumbnailUrl: f.fileType.startsWith('image/')
        ? `${BASE_URL}/risks/${rId}/thumbnail/${f.filePath}`
        : undefined,
    })
  }

  return riskAssessments.map(r => ({
    ...r,
    files: fileMap.get(r.id) ?? [],
  }))
}

import { db } from '../../../db/index.ts'
import {subContractors, userContractors} from '../../../db/schema/auth.schema.ts'
import { file, risk_assessment } from '../../../db/schema/csms.schema.ts'
import { eq } from 'drizzle-orm'
import env from "../../../config/env.config.ts";

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getRiskAssessmentDetail(riskAssessmentId: string) {
  const [data] = await db
    .select({
      id: risk_assessment.id,
      contractorId: risk_assessment.contractorId,
      contractorName: subContractors.name,
      title: risk_assessment.title,
      description: risk_assessment.description,
      status: risk_assessment.status,
      note: risk_assessment.note,
      createdAt: risk_assessment.createdAt,
      editedAt: risk_assessment.editedAt
    })
    .from(risk_assessment)
    .leftJoin(userContractors, eq(risk_assessment.contractorId, userContractors.userId))
    .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
    .where(eq(risk_assessment.id, riskAssessmentId))

  if (!data) return null

  const files = await db
    .select()
    .from(file)
    .where(eq(file.riskAssessmentId, riskAssessmentId))

  const filesData = files.map(f => ({
    ...f,
    note: f.note ?? undefined,
    url: `${BASE_URL}/risks/${riskAssessmentId}/${f.filePath}`,
    thumbnailUrl: f.fileType.startsWith('image/')
      ? `${BASE_URL}/risks/${riskAssessmentId}/thumbnail/${f.filePath}`
      : undefined
  }))

  return { ...data, files: filesData }
}

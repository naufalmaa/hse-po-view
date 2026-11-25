import { db } from '../../../db/index.ts'
import {subContractors, userContractors} from '../../../db/schema/auth.schema.ts'
import { file, qualification_assessment } from '../../../db/schema/csms.schema.ts'
import { eq } from 'drizzle-orm'
import env from "../../../config/env.config.ts";

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getQualificationAssessmentDetail(qualificationAssessmentId: string) {
  try {
    const [data] = await db
      .select({
        id: qualification_assessment.id,
        contractorId: qualification_assessment.contractorId,
        contractorName: subContractors.name,
        title: qualification_assessment.title,
        numberCertificate: qualification_assessment.numberCertificate,
        assessmentDate: qualification_assessment.assessmentDate,
        expiredDate: qualification_assessment.expiredDate,
        qualifiedValue: qualification_assessment.qualifiedValue,
        assessmentResult: qualification_assessment.assessmentResult,
        createdAt: qualification_assessment.createdAt,
        editedAt: qualification_assessment.editedAt
      })
      .from(qualification_assessment)
      .leftJoin(userContractors, eq(qualification_assessment.contractorId, userContractors.userId))
      .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(qualification_assessment.id, qualificationAssessmentId))

    if (!data) return null

    const files = await db
      .select({
        id: file.id,
        qualificationAssessmentId: file.qualificationAssessmentId,
        fileName: file.fileName,
        fileType: file.fileType,
        filePath: file.filePath,
        note: file.note,
      })
      .from(file)
      .where(eq(file.qualificationAssessmentId, qualificationAssessmentId))

    const filesData = files.map(f => ({
      ...f,
      note: f.note ?? undefined,
      url: `${BASE_URL}/qualifications/${qualificationAssessmentId}/${f.filePath}`,
      thumbnailUrl: f.fileType && f.fileType.startsWith('image/')
        ? `${BASE_URL}/qualifications/${qualificationAssessmentId}/thumbnail/${f.filePath}`
        : undefined
    }))

    return { ...data, files: filesData }
  } catch (error) {
    console.error('Error in getQualificationAssessmentDetail:', error)
    return null
  }
}
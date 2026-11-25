import { db } from '../../../db/index.ts'
import {
  subContractors,
  userContractors,
} from '../../../db/schema/auth.schema.ts'
import {file, qualification_assessment} from '../../../db/schema/csms.schema.ts'
import { eq, inArray } from 'drizzle-orm'
import env from '../../../config/env.config.ts'

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsCsmsDir}`;

export async function getQualificationAssessmentList(user: { id: string; role: string }) {
  let qualificationAssessments: any[] = [];

  if (user.role === 'contractor') {
    // For contractors, get subcontractor IDs associated with the user
    const userSubcontractors = await db
      .select({ contractorId: userContractors.contractorId })
      .from(userContractors)
      .where(eq(userContractors.userId, user.id));
    
    const subcontractorIds = userSubcontractors.map(item => item.contractorId);
    
    if (subcontractorIds.length === 0) {
      // If user has no associated subcontractors, return empty array
      qualificationAssessments = [];
    } else {
      qualificationAssessments = await db
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
          editedAt: qualification_assessment.editedAt,
        })
        .from(qualification_assessment)
        .leftJoin(subContractors, eq(qualification_assessment.contractorId, subContractors.id))
        .where(inArray(qualification_assessment.contractorId, subcontractorIds));
    }
  } else {
    // Admin/user lihat semua
    qualificationAssessments = await db
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
        editedAt: qualification_assessment.editedAt,
      })
      .from(qualification_assessment)
      .leftJoin(subContractors, eq(qualification_assessment.contractorId, subContractors.id));
  }

  if (!qualificationAssessments.length) return []

  const ids = qualificationAssessments.map(q => q.id)
  const allFiles = await db.select({ 
    id: file.id,
    qualificationAssessmentId: file.qualificationAssessmentId,
    fileName: file.fileName,
    fileType: file.fileType,
    filePath: file.filePath,
    note: file.note,
  }).from(file).where(inArray(file.qualificationAssessmentId, ids))

  const fileMap = new Map<string, any[]>()

  for (const f of allFiles) {
    const qId = f.qualificationAssessmentId
    if (!qId) continue

    if (!fileMap.has(qId)) fileMap.set(qId, [])

    fileMap.get(qId)!.push({
      ...f,
      note: f.note ?? undefined,
      url: `${BASE_URL}/qualifications/${qId}/${f.filePath}`,
      thumbnailUrl: f.fileType.startsWith('image/')
        ? `${BASE_URL}/qualifications/${qId}/thumbnail/${f.filePath}`
        : undefined,
    })
  }

  return qualificationAssessments.map(q => ({
    ...q,
    files: fileMap.get(q.id) ?? [],
  }))
}

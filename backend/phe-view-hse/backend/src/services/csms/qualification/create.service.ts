import { db } from '../../../db/index.ts'
import {qualification_assessment} from '../../../db/schema/csms.schema.ts'
import {getQualificationAssessmentDetail} from "./detail.service.ts";

interface CreateQualificationInput {
  contractorId: string,
  title: string,
  numberCertificate: string
  assessmentDate: string
  expiredDate: string,
  qualifiedValue: string
  assessmentResult: string,
}

export async function createQualificationAssessment(input: CreateQualificationInput) {
  const { contractorId, title, numberCertificate, assessmentDate, expiredDate, qualifiedValue, assessmentResult } = input

  const [inserted] = await db.insert(qualification_assessment).values({
    contractorId,
    title,
    numberCertificate,
    assessmentDate,
    expiredDate,
    qualifiedValue,
    assessmentResult,
  }).returning({ id: qualification_assessment.id })

  const qualificationAssessmentId = inserted.id

  const detail = await getQualificationAssessmentDetail(qualificationAssessmentId)

  // Ensure we always return an object with the expected structure
  return {
    detail: detail || {}
  }
}
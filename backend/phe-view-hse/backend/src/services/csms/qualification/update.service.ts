import { db } from '../../../db/index.ts'
import { qualification_assessment, file as qualificationFile } from '../../../db/schema/csms.schema.ts'
import { eq } from 'drizzle-orm'
import { getQualificationAssessmentDetail } from './detail.service.ts'
import { checkQualificationNotifications } from '../notification.service.ts'

interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalname: string
}

interface UpdateQualificationInput {
  qualificationAssessmentId: string
  title: string
  numberCertificate: string
  assessmentDate: string
  expiredDate: string
  qualifiedValue: string
  assessmentResult: string
  files: FileUpload[]
  newFileNotes?: string[]
  updatedFileNotes?: { id: string; note: string }[]
}

export async function updateQualificationAssessment(input: UpdateQualificationInput) {
  const {
    qualificationAssessmentId,
    title,
    numberCertificate,
    assessmentDate,
    expiredDate,
    qualifiedValue,
    assessmentResult,
    updatedFileNotes = [],
  } = input

  // 1. Update field utama
  await db.update(qualification_assessment)
    .set({
      title,
      numberCertificate,
      assessmentDate,
      expiredDate,
      qualifiedValue,
      assessmentResult,
      editedAt: new Date(),
    })
    .where(eq(qualification_assessment.id, qualificationAssessmentId))

  // 2. Update file note (boleh untuk semua role)
  if (updatedFileNotes.length) {
    for (const { id, note } of updatedFileNotes) {
      await db.update(qualificationFile)
        .set({ note })
        .where(eq(qualificationFile.id, id))
    }
  }

  // 3. Return detail terbaru
  const updated = await getQualificationAssessmentDetail(qualificationAssessmentId)

  // Trigger expiry check to send email notifications if needed
  try {
    await checkQualificationNotifications();
  } catch (error) {
    console.error('Error triggering qualification expiry check:', error);
  }

  return {
    message: 'Qualification assessment updated',
    data: updated,
  }
}
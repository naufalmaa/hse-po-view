import { db } from '../../../db/index.ts'
import { file as riskFile, risk_assessment } from '../../../db/schema/csms.schema.ts'
import { eq } from 'drizzle-orm'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { getRiskAssessmentDetail } from './detail.service.ts'

interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalname: string
}

interface UpdateRiskInput {
  riskAssessmentId: string
  title?: string
  description?: string
  status?: string
  note?: string
  files: FileUpload[]
  newFileNotes?: string[]
  updatedFileNotes?: { id: string; note: string }[]
  role: 'admin' | 'user' | 'contractor'
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_.]/g, '_')
}

function getTimestampFilename(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const baseName = sanitizeFilename(path.basename(originalName, path.extname(originalName)))
  const ext = path.extname(originalName).toLowerCase()
  return `${timestamp}-${baseName}${ext}`
}

export async function updateRiskAssessment(input: UpdateRiskInput) {
  const {
    riskAssessmentId,
    title,
    description,
    status,
    note,
    files,
    newFileNotes = [],
    updatedFileNotes = [],
    role
  } = input

  if (role === 'contractor' && (status || note)) {
    throw new Error('Contractor is not allowed to update status or note')
  }

  // 1. Update data utama (kecuali contractor tidak boleh ubah status dan note)
  await db.update(risk_assessment)
    .set({
      ...(title && { title }),
      ...(description && { description }),
      editedAt: new Date(),
      ...((role !== 'contractor' && status) && { status }),
      ...((role !== 'contractor' && note) && { note }),
    })
    .where(eq(risk_assessment.id, riskAssessmentId))

  // 2. Upload file baru
  if (files.length) {
    const folder = path.resolve('uploads', 'csms', 'risks', riskAssessmentId)
    const thumbFolder = path.resolve(folder, 'thumbnail')
    await fs.mkdir(folder, { recursive: true })
    await fs.mkdir(thumbFolder, { recursive: true })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const renamed = getTimestampFilename(file.originalname)
      const filePath = path.resolve(folder, renamed)
      await fs.writeFile(filePath, file.buffer)

      if (file.mimetype.startsWith('image/')) {
        const thumbPath = path.resolve(thumbFolder, renamed)
        await sharp(file.buffer).resize(300).jpeg({ quality: 70 }).toFile(thumbPath)
      }

      await db.insert(riskFile).values({
        riskAssessmentId,
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: renamed,
        note: newFileNotes[i] || ''
      })
    }
  }

  // 3. Update file note (boleh untuk semua role)
  if (updatedFileNotes.length) {
    for (const { id, note } of updatedFileNotes) {
      await db.update(riskFile)
        .set({ note })
        .where(eq(riskFile.id, id))
    }
  }

  // 4. Return hasil terbaru
  const updated = await getRiskAssessmentDetail(riskAssessmentId)
  return {
    message: 'Risk assessment updated',
    data: updated,
  }
}

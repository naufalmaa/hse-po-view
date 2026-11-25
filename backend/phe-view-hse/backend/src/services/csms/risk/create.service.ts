import { db } from '../../../db/index.ts'
import {risk_assessment, file as riskFile} from '../../../db/schema/csms.schema.ts'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import {getRiskAssessmentDetail} from "./detail.service.ts";

interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalname: string
}

interface CreateRiskInput {
  contractorId: string
  title: string
  description: string
  files?: FileUpload[]
  notes?: string[]
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

export async function createRiskAssessment(input: CreateRiskInput) {
  const { contractorId, title, description, files = [], notes = [] } = input

  const [inserted] = await db.insert(risk_assessment).values({
    contractorId,
    title,
    description,
    status: 'not started',
  }).returning({ id: risk_assessment.id })

  const riskAssessmentId = inserted.id

   if (files?.length) {
    const riskFolder = path.resolve('uploads', 'csms', 'risks', riskAssessmentId)
    const thumbnailFolder = path.resolve(riskFolder, 'thumbnail')
    await fs.mkdir(riskFolder, { recursive: true })
    await fs.mkdir(thumbnailFolder, { recursive: true })

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i]
      const note = notes[i] ?? ''
      const renamed = getTimestampFilename(fileData.originalname)
      const filePath = path.resolve(riskFolder, renamed)

      await fs.writeFile(filePath, fileData.buffer)

      if (fileData.mimetype.startsWith('image/')) {
        const thumbPath = path.resolve(thumbnailFolder, renamed)
        await sharp(fileData.buffer).resize(300).jpeg({ quality: 70 }).toFile(thumbPath)
      }

      await db.insert(riskFile).values({
        riskAssessmentId,
        fileName: fileData.originalname,
        fileType: fileData.mimetype,
        filePath: renamed,
        note: note
      })
    }
  }

  const detail = await getRiskAssessmentDetail(riskAssessmentId)

  return {
     message: 'Risk assessment created',
     data: detail,
  }
}

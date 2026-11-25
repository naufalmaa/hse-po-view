import { db } from '../../../db/index.ts'
import { file, guideline } from '../../../db/schema/csms.schema.ts'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { getGuidelineDetail } from './detail.service.ts'
import { getTimestampFilename } from '../../../utils/utils.ts'

interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalname: string
}

interface CreateGuidelineInput {
  title: string
  description: string
  files?: FileUpload[]
  notes?: string[]
}

export async function createGuidelineWithFiles(input: CreateGuidelineInput) {
  const { title, description, files, notes = [] } = input

  const [inserted] = await db
    .insert(guideline)
    .values({ title, description })
    .returning({ id: guideline.id })

  const guidelineId = inserted.id

  if (files?.length) {
    const guidelineFolder = path.resolve(process.cwd(), '../uploads', 'csms', 'guidelines', guidelineId)
    const thumbnailFolder = path.resolve(guidelineFolder, 'thumbnail')
    await fs.mkdir(guidelineFolder, { recursive: true })
    await fs.mkdir(thumbnailFolder, { recursive: true })

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i]
      const note = notes[i] ?? ''
      const renamed = getTimestampFilename(fileData.originalname)
      const filePath = path.resolve(guidelineFolder, renamed)

      await fs.writeFile(filePath, fileData.buffer)

      if (fileData.mimetype.startsWith('image/')) {
        const thumbPath = path.resolve(thumbnailFolder, renamed)
        await sharp(fileData.buffer).resize(300).jpeg({ quality: 70 }).toFile(thumbPath)
      }

      await db.insert(file).values({
        guidelineId,
        fileName: fileData.originalname,
        fileType: fileData.mimetype,
        filePath: renamed,
        note: note
      })
    }
  }

  const detail = await getGuidelineDetail(guidelineId)

  return {
    message: 'Guideline & files uploaded',
    data: detail,
  }
}

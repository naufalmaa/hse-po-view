import { db } from '../../../db/index.ts'
import { eq, inArray } from 'drizzle-orm'
import { file, guideline } from '../../../db/schema/csms.schema.ts'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { getGuidelineDetail } from './detail.service.ts'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_.]/g, '_')
}

function getTimestampFilename(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const baseName = sanitizeFilename(path.basename(originalName, path.extname(originalName)))
  const ext = path.extname(originalName).toLowerCase()
  return `${timestamp}-${baseName}${ext}`
}

interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalname: string
}

export async function updateGuideline(
  id: string,
  input: {
    title?: string
    description?: string
    newFiles?: FileUpload[]
    newNotes?: string[]
    updatedNotes?: { id: string; note: string }[]
    deletedFileIds?: string[]
  }
) {
  const updates: any = {}
  if (input.title) updates.title = input.title
  if (input.description) updates.description = input.description
  updates.editedAt = new Date()

  await db.update(guideline).set(updates).where(eq(guideline.id, id))

  const guidelineFolder = path.resolve(process.cwd(), '../uploads', 'csms', 'guidelines', id)
  const thumbnailFolder = path.resolve(guidelineFolder, 'thumbnail')
  await fs.mkdir(guidelineFolder, { recursive: true })
  await fs.mkdir(thumbnailFolder, { recursive: true })

  // Hapus file
  if (input.deletedFileIds?.length) {
    const deletedFiles = await db.select().from(file).where(inArray(file.id, input.deletedFileIds))
    for (const f of deletedFiles) {
      const filePath = path.resolve(guidelineFolder, f.filePath)
      const thumbPath = path.resolve(thumbnailFolder, f.filePath)
      await fs.rm(filePath, { force: true }).catch(() => {})
      await fs.rm(thumbPath, { force: true }).catch(() => {})
    }
    await db.delete(file).where(inArray(file.id, input.deletedFileIds))
  }

  // Update catatan file
  if (input.updatedNotes?.length) {
    for (const noteUpdate of input.updatedNotes) {
      await db.update(file)
        .set({ note: noteUpdate.note })
        .where(eq(file.id, noteUpdate.id))
    }
  }

  // Tambah file baru
  if (input.newFiles?.length) {
    for (let i = 0; i < input.newFiles.length; i++) {
      const fileData = input.newFiles[i]
      const note = input.newNotes?.[i] ?? ''
      const renamed = getTimestampFilename(fileData.originalname)
      const filePath = path.resolve(guidelineFolder, renamed)

      await fs.writeFile(filePath, fileData.buffer)

      if (fileData.mimetype.startsWith('image/')) {
        const thumbPath = path.resolve(thumbnailFolder, renamed)
        await sharp(fileData.buffer).resize(300).jpeg({ quality: 70 }).toFile(thumbPath)
      }

      await db.insert(file).values({
        guidelineId: id,
        fileName: fileData.originalname,
        fileType: fileData.mimetype,
        filePath: renamed,
        note
      })
    }
  }

  const detail = await getGuidelineDetail(id)

  return {
    message: 'Guideline updated successfully',
    data: detail,
  }
}

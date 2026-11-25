import { db } from '../../db/index.ts';
import { users } from '../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { getTimestampFilename } from '../../utils/utils.ts';
import { getUserWithSubContractorsById } from './list.service.ts';

interface FileUpload {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

interface UpdateUserFileInput {
  userId: string;
  name?: string;
  image?: FileUpload;
  signature?: FileUpload;
}

export async function updateUserFilesService(input: UpdateUserFileInput) {
  const { userId, name, image, signature } = input;

  // Get user first to ensure it exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const usersFolder = path.resolve(process.cwd(), '../uploads', 'users', userId);
  await fs.mkdir(usersFolder, { recursive: true });
  
  const updateData: Partial<typeof users.$inferInsert> = {};

  // Handle name update
  if (name) {
    updateData.name = name.trim();
  }

  // Handle image upload
  if (image) {
    // Delete old image file if it exists
    if (user.image) {
      try {
        await fs.unlink(path.resolve(usersFolder, user.image));
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    const renamedImage = getTimestampFilename(image.filename);
    const imagePath = path.resolve(usersFolder, renamedImage);
    // Resize image and save directly to main folder
    await sharp(image.buffer)
      .resize(300)
      .jpeg({ quality: 70 })
      .toFile(imagePath);
    updateData.image = renamedImage;
  }

  // Handle signature upload
  if (signature) {
    // Delete old signature file if it exists
    if (user.signature) {
      try {
        await fs.unlink(path.resolve(usersFolder, user.signature));
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    const renamedSignature = getTimestampFilename(signature.filename);
    const signaturePath = path.resolve(usersFolder, renamedSignature);
    // Resize signature to width 400, height automatic
    await sharp(signature.buffer)
      .resize(400, null, { withoutEnlargement: true })
      .toFile(signaturePath);
    updateData.signature = renamedSignature;
  }

  // Update database with file names only (not paths)
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  // Return updated user
  const updatedUser = await getUserWithSubContractorsById(userId);
  if (!updatedUser) throw new Error('User not found after update');

  return updatedUser;
}

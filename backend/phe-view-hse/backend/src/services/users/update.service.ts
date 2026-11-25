import { db } from '../../db/index.ts';
import { users } from '../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import { getUserWithSubContractorsById } from './list.service.ts';

export async function updateUserAdminService(
  userId: string,
  data: {
    name?: string;
    image?: string;
    emailVerified?: boolean;
  },
  currentUserId: string // tambahkan ini untuk mengetahui siapa yang sedang login
) {
  const { name, image, emailVerified } = data;

  const updateData: Partial<typeof users.$inferInsert> = {};
  if (name) updateData.name = name.trim();
  if (image) updateData.image = image.trim();
  if (emailVerified !== undefined) updateData.emailVerified = emailVerified;
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  const user = await getUserWithSubContractorsById(userId);
  if (!user) throw new Error('User not found after update');

  return { success: true, message: 'User updated successfully', user };
}
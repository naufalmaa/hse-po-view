import { randomBytes } from 'node:crypto';
import { db } from '../../db/index.ts';
import { users, accounts } from '../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import auth from '../../auth.ts';

// Password awal akun karyawan tanpa tanggal lahir. Diatur lewat EMPLOYEE_DEFAULT_PASSWORD;
// bila kosong dipakai password acak (admin lalu mengatur ulang lewat menu pengguna).
const PLAIN_PASSWORD = process.env.EMPLOYEE_DEFAULT_PASSWORD || randomBytes(12).toString('base64url');

function formatDateAsDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

interface CreateUserAccountInput {
  hssePassportNumber: string;
  employeeName: string;
  dateOfBirth?: string | Date | null;
  image?: string | null;
}

/**
 * Create or update user account for employee
 * - If employee has hssePassportNumber, create/update user account
 * - Password: ddmmyyyy from dateOfBirth if exists, else PLAIN_PASSWORD
 */
export async function createOrUpdateUserAccountForEmployee(
  input: CreateUserAccountInput
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const { hssePassportNumber, employeeName, dateOfBirth, image } = input;

  // Skip if no hssePassportNumber
  if (!hssePassportNumber || !hssePassportNumber.trim()) {
    return { success: false, error: 'No HSSE Passport Number provided' };
  }

  if (!employeeName || !employeeName.trim()) {
    return { success: false, error: 'No employee name provided' };
  }

  const trimmedPassportNumber = hssePassportNumber.trim();
  const trimmedName = employeeName.trim();

  try {
    const context = await auth.$context;
    const now = new Date();

    // Determine password: ddmmyyyy if dateOfBirth exists, else PLAIN_PASSWORD
    let password: string;
    if (dateOfBirth) {
      const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
      if (!isNaN(dob.getTime())) {
        password = formatDateAsDDMMYYYY(dob);
      } else {
        password = PLAIN_PASSWORD;
      }
    } else {
      password = PLAIN_PASSWORD;
    }

    const hashedPassword = await context.password.hash(password);

    // Check if user already exists with this hssePassportNumber
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.hssePassportNumber, trimmedPassportNumber))
      .limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      // Update existing user
      userId = existingUser[0].id;
      
      await db
        .update(users)
        .set({
          name: trimmedName,
          image: image || null,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      // Update password in accounts
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(1);

      if (existingAccount.length > 0) {
        await db
          .update(accounts)
          .set({
            password: hashedPassword,
            updatedAt: now,
          })
          .where(eq(accounts.userId, userId));
      } else {
        // Create account if not exists
        await db.insert(accounts).values({
          providerId: 'credential',
          accountId: userId,
          userId: userId,
          password: hashedPassword,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          scope: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: null,
          hssePassportNumber: trimmedPassportNumber,
          name: trimmedName,
          emailVerified: false,
          role: 'employee',
          image: image || null,
          createdAt: now,
          updatedAt: now,
          banned: false,
          banReason: null,
          banExpires: null,
        })
        .returning();

      if (!newUser) {
        return { success: false, error: 'Failed to create user' };
      }

      userId = newUser.id;

      // Create account with hashed password
      await db.insert(accounts).values({
        providerId: 'credential',
        accountId: userId,
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        scope: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, userId };
  } catch (error: any) {
    console.error('Error creating/updating user account:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

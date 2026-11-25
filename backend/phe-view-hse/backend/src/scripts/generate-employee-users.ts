import { randomBytes } from 'node:crypto';
import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {users, accounts} from '../db/schema/auth.schema.ts';
import {employees} from '../db/schema/employee.schema.ts';
import {eq, isNotNull} from "drizzle-orm";
import pg from "pg";
import env from "../config/env.config.ts";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/auth.schema.ts";

// Password awal akun karyawan tanpa tanggal lahir. Diatur lewat EMPLOYEE_DEFAULT_PASSWORD;
// bila kosong dipakai password acak (admin lalu mengatur ulang lewat menu pengguna).
const PLAIN_PASSWORD = process.env.EMPLOYEE_DEFAULT_PASSWORD || randomBytes(12).toString('base64url');

function formatDateAsDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

async function seed() {
  const pool = new pg.Pool({
    connectionString: env.db.url,
    max: 10,
  });

  const db = drizzle({ client: pool, schema });
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
    })
  });

  const context = await auth.$context;

  const now = new Date();

  // Query employees with hssePassportNumber
  const employeeList = await db.select()
    .from(employees)
    .where(isNotNull(employees.hssePassportNumber));

  console.log(`Found ${employeeList.length} employees with hssePassportNumber`);

  let created = 0;
  let skipped = 0;

  for (const emp of employeeList) {
    if (!emp.hssePassportNumber) continue;
    if (!emp.employeeName) continue;

    // Determine password: ddmmyyyy if dateOfBirth exists, else PLAIN_PASSWORD
    let password: string;
    if (emp.dateOfBirth) {
      const dob = new Date(emp.dateOfBirth as unknown as string);
      password = formatDateAsDDMMYYYY(dob);
    } else {
      password = PLAIN_PASSWORD;
    }
    
    // Check if user already exists with this hssePassportNumber
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.hssePassportNumber, emp.hssePassportNumber))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`Skipping: User already exists for hssePassportNumber ${emp.hssePassportNumber}`);
      skipped++;
      continue;
    }

    const hashedPassword = await context.password.hash(password);

    try {
      // Insert user without email (will be null)
      const user_ = (await db.insert(users).values({
        email: null,
        hssePassportNumber: emp.hssePassportNumber,
        name: emp.employeeName,
        emailVerified: false,
        role: 'employee',
        image: emp.image || null,
        createdAt: now,
        updatedAt: now,
        banned: false,
        banReason: null,
        banExpires: null,
      }).onConflictDoNothing().returning())[0];

      if (!user_) {
        console.log(`Skipping: Could not create user for hssePassportNumber ${emp.hssePassportNumber}`);
        skipped++;
        continue;
      }

      // Insert account with hashed password
      await db.insert(accounts).values({
        providerId: 'credential',
        accountId: user_.id,
        userId: user_.id,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        scope: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing();

      console.log(`Created: User for ${emp.employeeName} (${emp.hssePassportNumber})`);
      created++;
    } catch (e) {
      console.error(`Error creating user for ${emp.hssePassportNumber}:`, e);
      skipped++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${employeeList.length}`);

  await pool.end();
}

seed().then(() => {
  console.log('\nSeeding complete');
}).catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});

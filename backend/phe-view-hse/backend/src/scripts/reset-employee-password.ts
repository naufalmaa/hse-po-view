import { db } from '../db/index.ts';
import { users, accounts } from '../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import auth from '../auth.ts';

async function resetPassword() {
  const hsse = process.argv[2];
  const newPassword = process.argv[3];

  if (!hsse || !newPassword) {
    console.error('Usage: npx tsx src/scripts/run-with-ssh-tunnel.ts src/scripts/reset-employee-password.ts <HSSE_PASSPORT_NUMBER> <NEW_PASSWORD>');
    console.error('Example: npx tsx src/scripts/run-with-ssh-tunnel.ts src/scripts/reset-employee-password.ts P260502750 04031997');
    process.exit(1);
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.hssePassportNumber, hsse),
    });

    if (!user) {
      console.error(`User dengan HSSE ${hsse} tidak ditemukan di database.`);
      process.exit(1);
    }

    console.log(`Ditemukan user: ${user.name} (ID: ${user.id})`);

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id));

    console.log(`Jumlah akun di tabel accounts: ${userAccounts.length}`);

    const context = await auth.$context;
    const hashedPassword = await context.password.hash(newPassword);

    const now = new Date();

    if (userAccounts.length === 0) {
      // Buat akun baru
      await db.insert(accounts).values({
        providerId: 'credential',
        accountId: user.id,
        userId: user.id,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Berhasil membuat akun baru dengan password baru untuk ${user.name}.`);
    } else {
      // Jika ada duplikat akun, simpan akun pertama dan hapus akun duplikat lainnya
      const [primaryAccount, ...duplicateAccounts] = userAccounts;

      if (duplicateAccounts.length > 0) {
        console.log(`Menghapus ${duplicateAccounts.length} akun duplikat...`);
        for (const dup of duplicateAccounts) {
          await db.delete(accounts).where(eq(accounts.id, dup.id));
        }
      }

      // Update primary account
      await db
        .update(accounts)
        .set({
          password: hashedPassword,
          updatedAt: now,
        })
        .where(eq(accounts.id, primaryAccount.id));

      console.log(`Berhasil update password untuk ${user.name} (${hsse})!`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error saat mereset password:', err);
    process.exit(1);
  }
}

resetPassword();

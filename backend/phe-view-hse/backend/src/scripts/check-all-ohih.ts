import { db } from '../db/index.ts';
import { mcus } from '../db/schema/employee.schema.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const rows = await db
      .select({
        ohihReview: mcus.ohihReview,
        count: sql<number>`count(*)`,
      })
      .from(mcus)
      .groupBy(mcus.ohihReview);

    console.log('MCU counts by ohihReview:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();

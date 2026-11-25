import { db } from '../db/index.ts';
import { employees, mcus } from '../db/schema/employee.schema.ts';
import { subContractors } from '../db/schema/auth.schema.ts';
import { eq, countDistinct, and } from 'drizzle-orm';

async function main() {
  try {
    const totalP4 = await db
      .select({ n: countDistinct(employees.id) })
      .from(employees)
      .leftJoin(mcus, eq(mcus.employeeId, employees.id))
      .where(eq(mcus.ohihReview, 'P4'));

    console.log('Total employees with P4 ohihReview:', totalP4[0]?.n);

    const companies = await db
      .selectDistinct({
        id: subContractors.id,
        name: subContractors.name,
      })
      .from(subContractors)
      .innerJoin(employees, eq(employees.subContractorId, subContractors.id));

    console.log('Total companies with employees:', companies.length);

    for (const c of companies) {
      const [row] = await db
        .select({ n: countDistinct(employees.id) })
        .from(employees)
        .leftJoin(mcus, eq(mcus.employeeId, employees.id))
        .where(
          and(
            eq(employees.subContractorId, c.id),
            eq(mcus.ohihReview, 'P4')
          )
        );
      if (Number(row?.n) > 0) {
        console.log(`Company "${c.name}" has ${row?.n} P4 employees`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main();

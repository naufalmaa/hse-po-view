
import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

async function checkTable() {
  try {
    console.log('Checking columns for csms_contract...');
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'csms_contract'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', JSON.stringify(columns, null, 2));
    
    console.log('\nChecking total count...');
    const countResult = await db.execute(sql`SELECT count(*) FROM csms_contract`);
    console.log('Total count:', countResult);
    
    process.exit(0);
  } catch (err) {
    console.error('Error checking table:', err);
    process.exit(1);
  }
}

checkTable();

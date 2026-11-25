import { db } from '../db/index.ts';

// This migration adds hours columns to the subtypes table
// These columns store the default POB hours for each project
export async function up() {
  console.log('Adding hours columns to subtypes table...');
  
  // Add hoursPobPheOses column with default value 8
  await db.execute(
    `ALTER TABLE subtypes ADD COLUMN IF NOT EXISTS hours_pob_phe_oses INTEGER DEFAULT 8`
  );
  
  // Add hoursPobContractor column with default value 12
  await db.execute(
    `ALTER TABLE subtypes ADD COLUMN IF NOT EXISTS hours_pob_contractor INTEGER DEFAULT 12`
  );
  
  console.log('Successfully added hours columns to subtypes table');
}

export async function down() {
  console.log('Removing hours columns from subtypes table...');
  
  await db.execute(
    `ALTER TABLE subtypes DROP COLUMN IF EXISTS hours_pob_phe_oses`
  );
  
  await db.execute(
    `ALTER TABLE subtypes DROP COLUMN IF EXISTS hours_pob_contractor`
  );
  
  console.log('Successfully removed hours columns from subtypes table');
}

/**
 * Script to delete "DOKUMEN EVALUASI" folder from all contracts
 * This will remove all evaluation document folders and their contents (files)
 * 
 * Run with: npx tsx src/scripts/delete-evaluasi-folders.ts
 */
import pg from "pg";
import env from "../config/env.config.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.ts";
import { contractFolder } from "../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

const EVALUASI_FOLDER_NAME = "DOKUMEN EVALUASI";

async function deleteEvaluasiFolders() {
  const pool = new pg.Pool({
    connectionString: env.db.url,
    max: 10,
  });

  const db = drizzle({ client: pool, schema });

  try {
    console.log("Finding all DOKUMEN EVALUASI folders...");

    // Get all "DOKUMEN EVALUASI" folders
    const evaluasiFolders = await db.query.contractFolder.findMany({
      where: (fields, { eq }) =>
        eq(fields.name, EVALUASI_FOLDER_NAME),
    });

    console.log(`Found ${evaluasiFolders.length} DOKUMEN EVALUASI folders`);

    if (evaluasiFolders.length === 0) {
      console.log("No folders to delete. Exiting.");
      return;
    }

    let deletedCount = 0;

    for (const folder of evaluasiFolders) {
      console.log(`  - Deleting folder: ${folder.id} (contract: ${folder.contractId})`);
      
      // Delete the folder - due to cascade, all child files will also be deleted
      await db
        .delete(contractFolder)
        .where(eq(contractFolder.id, folder.id));

      deletedCount++;
      console.log(`    Deleted successfully`);
    }

    console.log("\n=== Summary ===");
    console.log(`Total folders found: ${evaluasiFolders.length}`);
    console.log(`Folders deleted: ${deletedCount}`);
    console.log("Done!");
  } catch (error) {
    console.error("Error deleting evaluasi folders:", error);
  } finally {
    await pool.end();
  }
}

deleteEvaluasiFolders();

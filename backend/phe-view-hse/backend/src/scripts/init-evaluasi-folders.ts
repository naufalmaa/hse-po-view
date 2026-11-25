/**
 * Script to initialize "DOKUMEN EVALUASI" folder for all existing contracts
 * This folder will contain final evaluation documents from all approved PB and PA assessments
 * 
 * Run with: npx tsx src/scripts/init-evaluasi-folders.ts
 */
import pg from "pg";
import env from "../config/env.config.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.ts";
import { contractFolder } from "../db/schema/csms.schema.ts";
import { eq, sql } from "drizzle-orm";

const EVALUASI_FOLDER_NAME = "DOKUMEN EVALUASI";

async function initializeEvaluasiFolders() {
  const pool = new pg.Pool({
    connectionString: env.db.url,
    max: 10,
  });

  const db = drizzle({ client: pool, schema });

  try {
    console.log("Fetching all contracts...");

    // Get all contracts
    const allContracts = await db.query.contract.findMany();

    console.log(`Found ${allContracts.length} contracts`);

    let createdCount = 0;
    let existingCount = 0;

    for (const contractRecord of allContracts) {
      // Check if "DOKUMEN EVALUASI" folder already exists for this contract
      const existingFolder = await db.query.contractFolder.findFirst({
        where: (fields, { eq, and }) =>
          and(
            eq(fields.contractId, contractRecord.id),
            eq(fields.name, EVALUASI_FOLDER_NAME),
            eq(fields.depth, 0)
          ),
      });

      if (existingFolder) {
        existingCount++;
        console.log(`  - Contract ${contractRecord.id}: DOKUMEN EVALUASI folder already exists (skipping)`);
        continue;
      }

      // Create the "DOKUMEN EVALUASI" folder
      const [newFolder] = await db
        .insert(contractFolder)
        .values({
          contractId: contractRecord.id,
          parentId: null,
          name: EVALUASI_FOLDER_NAME,
          description:
            "Dokumen Evaluasi Akhir - Final evaluation documents from all PB and PA assessments",
          path: sql`''::ltree`,
          fileType: "folder",
          isComplete: false,
          isCopy: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update the path with the correct value using the generated ID
      await db
        .update(contractFolder)
        .set({
          path: sql`${newFolder.id}::ltree`,
          updatedAt: new Date(),
        })
        .where(eq(contractFolder.id, newFolder.id));

      createdCount++;
      console.log(`  - Contract ${contractRecord.id}: Created DOKUMEN EVALUASI folder (${newFolder.id})`);
    }

    console.log("\n=== Summary ===");
    console.log(`Total contracts: ${allContracts.length}`);
    console.log(`Existing folders: ${existingCount}`);
    console.log(`New folders created: ${createdCount}`);
    console.log("Done!");
  } catch (error) {
    console.error("Error initializing evaluasi folders:", error);
  } finally {
    await pool.end();
  }
}

initializeEvaluasiFolders();

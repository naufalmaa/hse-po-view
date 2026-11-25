import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, inArray, sql } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { folderHasFile, isFolderStructureComplete, isK3LLFolderComplete } from "./folder-completion.service.ts";
import { uploadsPath } from "../../../config/env.config.ts";
import { calculateFolderScore, getAncestors } from "./assessment.service.ts";
import {
  assessmentUpdateOf,
  collectFiles,
  copiesAnyValues,
  depth0IdOf,
  findCategoryFolders,
  getNestingError,
  indexByParent,
  mapWithConcurrency,
  pickCategoryPairs,
  planCopy,
  recomputeFolderStatuses,
  resolveCopyOptions,
  type CopyOptions,
  type CopyOptionsInput,
  type CopyRow,
} from "./copy-pb-files.rules.ts";
import type { CopyJobStore } from "./copy-pb-jobs.ts";

/** Physical copies running at the same time. */
const COPY_CONCURRENCY = 4;
/** Rows per INSERT / DELETE statement (stays far below the 65535 bind-parameter limit). */
const CHUNK = 500;

type Executor = any; // db or a transaction

const chunks = <T>(items: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Every row of a contract, with only the columns the copy and the completion rules need. */
async function loadContractRows(executor: Executor, contractId: string): Promise<Array<CopyRow & { contractId: string }>> {
  return executor
    .select({
      id: contractFolder.id,
      contractId: contractFolder.contractId,
      parentId: contractFolder.parentId,
      name: contractFolder.name,
      description: contractFolder.description,
      path: contractFolder.path,
      depth: contractFolder.depth,
      fileType: contractFolder.fileType,
      filePath: contractFolder.filePath,
      isComplete: contractFolder.isComplete,
      isCopy: contractFolder.isCopy,
      isFinal: contractFolder.isFinal,
    })
    .from(contractFolder)
    .where(eq(contractFolder.contractId, contractId));
}

/**
 * Copy the evaluator values of the chosen categories (all when categoryNumbers is null): score + status when
 * copyScores, the User note / contractor note when their option is on and the source note has text
 * (assessmentUpdateOf). When scores were copied, "A. RENCANA K3LL" and the assessment folder are recalculated
 * with the official formula (calculateFolderScore). Returns the category numbers that were paired.
 */
async function copyCategoryValues(sourceRootId: string, targetRootId: string, options: CopyOptions, tx: Executor = db): Promise<number[]> {
  const [sourceFolders, targetFolders] = await Promise.all([
    tx.query.contractFolder.findMany({ where: eq(contractFolder.contractId, (await getContractIdOf(sourceRootId, tx))) }),
    tx.query.contractFolder.findMany({ where: eq(contractFolder.contractId, (await getContractIdOf(targetRootId, tx))) }),
  ]);

  const pairs = pickCategoryPairs(
    findCategoryFolders(sourceRootId, sourceFolders as any[]),
    findCategoryFolders(targetRootId, targetFolders as any[]),
    options.categoryNumbers,
  );

  // children looked up in memory (the table has no index on parent_id, a query per folder is a full scan)
  const sourceByParent = indexByParent(sourceFolders as any[]);
  const targetByParent = sourceFolders === targetFolders ? sourceByParent : indexByParent(targetFolders as any[]);

  for (const { source, target } of pairs) {
    const set = assessmentUpdateOf(source as any, options);
    if (set) await tx.update(contractFolder).set({ ...set, updatedAt: new Date() }).where(eq(contractFolder.id, target.id));
    await copyChildrenAssessmentValues(source.id, target.id, tx, sourceByParent, targetByParent, options);
  }

  // Ancestors are the same for every category (A. RENCANA K3LL, then the assessment folder), nearest first.
  if (options.copyScores && pairs.length > 0) {
    for (const ancestorId of await getAncestors(pairs[0].target.id, tx)) {
      const score = await calculateFolderScore(ancestorId, tx);
      await tx.update(contractFolder).set({ score: String(score), updatedAt: new Date() }).where(eq(contractFolder.id, ancestorId));
    }
  }

  return pairs.map((p) => p.number);
}

async function getContractIdOf(folderId: string, tx: Executor = db): Promise<string> {
  const folder = await tx.query.contractFolder.findFirst({ where: eq(contractFolder.id, folderId), columns: { contractId: true } });
  if (!folder) throw new Error(`Folder with ID ${folderId} not found`);
  return folder.contractId;
}

/**
 * Copy the evaluator values (assessmentUpdateOf) from source folder children to target folder children
 * This recursively matches folders by name and copies their assessment values
 */
async function copyChildrenAssessmentValues(
  sourceFolderId: string,
  targetFolderId: string,
  tx: Executor,
  sourceByParent: Map<string, any[]>,
  targetByParent: Map<string, any[]>,
  options: CopyOptions,
): Promise<void> {
  const sourceChildren = sourceByParent.get(sourceFolderId) ?? [];
  const targetChildren = targetByParent.get(targetFolderId) ?? [];

  const targetChildrenMap = new Map<string, any>(targetChildren.map((child: any) => [child.name, child]));

  for (const sourceChild of sourceChildren) {
    if (sourceChild.fileType === 'file') {
      continue;
    }

    const targetChild = targetChildrenMap.get(sourceChild.name);
    if (!targetChild) {
      continue;
    }

    const set = assessmentUpdateOf(sourceChild, options);
    if (set) await tx.update(contractFolder).set({ ...set, updatedAt: new Date() }).where(eq(contractFolder.id, targetChild.id));

    await copyChildrenAssessmentValues(sourceChild.id, targetChild.id, tx, sourceByParent, targetByParent, options);
  }
}

export type CopyValidationError = { status: 400 | 404; message: string };

/**
 * Quick checks before a copy job is started (one query per contract): both folders exist,
 * they are not nested, the source is complete and has files.
 */
export async function validateCopyRequest(sourceFolderId: string, targetFolderId: string): Promise<CopyValidationError | null> {
  const [sourceFolder, targetFolder] = await Promise.all([
    db.query.contractFolder.findFirst({ where: eq(contractFolder.id, sourceFolderId), columns: { id: true, contractId: true, name: true } }),
    db.query.contractFolder.findFirst({ where: eq(contractFolder.id, targetFolderId), columns: { id: true, contractId: true } }),
  ]);
  if (!sourceFolder) return { status: 404, message: `Source folder with ID ${sourceFolderId} not found` };
  if (!targetFolder) return { status: 404, message: `Target folder with ID ${targetFolderId} not found` };

  const sourceRows = await loadContractRows(db, sourceFolder.contractId);
  const byId = new Map(sourceRows.map((r) => [r.id, r]));
  if (sourceFolder.contractId === targetFolder.contractId) {
    const nesting = getNestingError(sourceFolderId, targetFolderId, byId);
    if (nesting) return { status: 400, message: nesting };
  }
  if (!(await isFolderStructureComplete(sourceFolderId, sourceRows))) {
    return { status: 400, message: `Source folder "${sourceFolder.name}" is not complete` };
  }
  if (collectFiles(sourceFolderId, indexByParent(sourceRows)).length === 0) {
    return { status: 400, message: "No files found in source folder" };
  }
  return null;
}

export type CopyProgress = (done: number, total: number, message?: string) => void;

/**
 * Copy all complete files (fileType='file') from a source folder to a target folder.
 * This version does not compare file names, but checks if the source folder is complete first.
 * Options (all default true): copyScores (score + status), copyUserNotes, copyContractorNotes, for the chosen categories;
 * a note is only overwritten when the source note has text.
 * If target folder already has files, they will be deleted first.
 *
 * Bulk version: both trees are loaded once, the folder mapping is built in memory, physical files are copied
 * a few at a time, and every DB write (new folders, delete old files, insert new files, isComplete/isCopy,
 * scores) runs in one transaction. Old physical files are removed only after the commit.
 */
export async function copyAllFilesIfComplete(
  sourceFolderId: string,
  targetFolderId: string,
  options: CopyOptionsInput = {},
  onProgress: CopyProgress = () => {},
) {
  const copyOptions = resolveCopyOptions(options);
  const newDirs: string[] = [];
  const timings: Record<string, number> = {};
  try {
    const [sourceFolder, targetFolder] = await Promise.all([
      db.query.contractFolder.findFirst({ where: eq(contractFolder.id, sourceFolderId), columns: { id: true, contractId: true, name: true } }),
      db.query.contractFolder.findFirst({ where: eq(contractFolder.id, targetFolderId), columns: { id: true, contractId: true } }),
    ]);
    if (!sourceFolder) throw new Error(`Source folder with ID ${sourceFolderId} not found`);
    if (!targetFolder) throw new Error(`Target folder with ID ${targetFolderId} not found`);

    const sameContract = sourceFolder.contractId === targetFolder.contractId;
    const sourceRows = await loadContractRows(db, sourceFolder.contractId);
    const targetRows = sameContract ? sourceRows : await loadContractRows(db, targetFolder.contractId);
    const sourceById = new Map(sourceRows.map((r) => [r.id, r]));

    if (sameContract) {
      const nesting = getNestingError(sourceFolderId, targetFolderId, sourceById);
      if (nesting) throw new Error(nesting);
    }
    if (!(await isFolderStructureComplete(sourceFolderId, sourceRows))) {
      throw new Error(`Source folder "${sourceFolder.name}" is not complete`);
    }

    const plan = planCopy({ sourceRootId: sourceFolderId, targetRootId: targetFolderId, sourceRows, targetRows, newId: () => crypto.randomUUID() });
    if (plan.files.length === 0) {
      return { success: false, message: "No files found in source folder" };
    }
    const existingFiles = collectFiles(targetFolderId, indexByParent(targetRows));

    // --- 1. Physical files (the slow part), a few at a time; nothing is written to the DB yet ---
    const total = plan.files.length;
    let done = 0;
    onProgress(0, total, "Menyalin berkas…");
    const failedFiles: Array<{ fileName: string; error: string }> = [];
    const copied = await mapWithConcurrency(plan.files, COPY_CONCURRENCY, async (f) => {
      const sourceFile = f.source;
      const sourceDepth0 = depth0IdOf(sourceFile.parentId ?? sourceFolderId, sourceById);
      const sourceDir = uploadsPath("csms", "contracts", sourceFolder.contractId, sourceDepth0, sourceFile.id);
      const targetDir = uploadsPath("csms", "contracts", targetFolder.contractId, plan.targetDepth0Id, f.newId);
      try {
        await fs.mkdir(targetDir, { recursive: true });
        newDirs.push(targetDir);
        if (sourceFile.filePath) {
          const sourceFilePath = path.resolve(sourceDir, sourceFile.filePath);
          try {
            await fs.copyFile(sourceFilePath, path.resolve(targetDir, sourceFile.filePath));
          } catch (err: any) {
            console.warn(`[copy-pb-files] Could not copy physical file from ${sourceFilePath}: ${err.message}`);
          }
          // thumbnail (optional)
          const targetThumbDir = path.resolve(targetDir, "thumbnail");
          try {
            await fs.mkdir(targetThumbDir, { recursive: true });
            await fs.copyFile(path.resolve(sourceDir, "thumbnail", sourceFile.filePath), path.resolve(targetThumbDir, sourceFile.filePath));
          } catch {
          }
        }
        return f;
      } catch (err: any) {
        console.warn(`[copy-pb-files] Could not prepare ${targetDir}: ${err.message}`);
        failedFiles.push({ fileName: sourceFile.name, error: err.message });
        return null;
      } finally {
        done++;
        onProgress(done, total);
      }
    });
    const filesToInsert = copied.filter((f): f is NonNullable<typeof f> => f !== null);

    // --- 2. All DB writes in one transaction ---
    onProgress(total, total, "Menyimpan ke database…");
    const valueCopiedCategories = await db.transaction(async (tx: Executor) => {
      const now = new Date();
      let t = Date.now();
      const lap = (name: string) => { timings[name] = Date.now() - t; t = Date.now(); };

      for (const part of chunks(existingFiles.map((f) => f.id))) {
        await tx.delete(contractFolder).where(inArray(contractFolder.id, part));
      }
      lap("delete");

      // parent-first order (planCopy creates a parent before its children)
      for (const part of chunks(plan.foldersToCreate)) {
        await tx.insert(contractFolder).values(part.map((f) => ({
          id: f.id,
          contractId: targetFolder.contractId,
          parentId: f.parentId,
          name: f.name,
          description: f.description,
          path: sql`${f.path}::ltree`,
          fileType: "folder",
          status: 'pending' as const,
          score: '0',
          isComplete: false,
          isCopy: 1,
          createdAt: now,
          updatedAt: now,
        })));
      }

      for (const part of chunks(filesToInsert)) {
        await tx.insert(contractFolder).values(part.map((f) => ({
          id: f.newId,
          contractId: targetFolder.contractId,
          parentId: f.targetParentId,
          name: f.source.name,
          description: f.source.description || "",
          path: sql`${f.path}::ltree`,
          fileType: "file",
          status: 'pending' as const,
          score: '0',
          filePath: f.source.filePath || "",
          isComplete: true,
          isCopy: 1,
          createdAt: now,
          updatedAt: now,
        })));
      }

      lap("insert");
      // isComplete / isCopy once, bottom-up, with the rules of folder-completion.service.ts on the in-memory tree
      const deleted = new Set(existingFiles.map((f) => f.id));
      const items: Array<CopyRow & { contractId: string }> = [
        ...targetRows.filter((r) => !deleted.has(r.id)).map((r) => ({ ...r })),
        ...plan.foldersToCreate.map((f) => ({
          id: f.id, contractId: targetFolder.contractId, parentId: f.parentId, name: f.name, description: f.description,
          path: f.path, fileType: "folder", filePath: null, isComplete: false, isCopy: 1, isFinal: null,
        })),
        ...filesToInsert.map((f) => ({
          id: f.newId, contractId: targetFolder.contractId, parentId: f.targetParentId, name: f.source.name, description: f.source.description || "",
          path: f.path, fileType: "file", filePath: f.source.filePath || "", isComplete: true, isCopy: 1, isFinal: null,
        })),
      ];
      const statuses = await recomputeFolderStatuses(items, new Set(filesToInsert.map((f) => f.targetParentId)), {
        isFolderStructureComplete,
        isK3LLFolderComplete,
        folderHasFile,
      });
      lap("recompute");
      for (const [id, s] of statuses) {
        await tx.update(contractFolder)
          .set(s.isCopy === null ? { isComplete: s.isComplete, updatedAt: now } : { isComplete: s.isComplete, isCopy: s.isCopy, updatedAt: now })
          .where(eq(contractFolder.id, id));
      }

      lap("statusUpdates");
      // Copy score, status, and note of the chosen categories (optional), recalculated with the official formula
      const copiedCategories = copiesAnyValues(copyOptions) ? await copyCategoryValues(sourceFolderId, targetFolderId, copyOptions, tx) : [];

      // The source is complete and its structure was mirrored, so the target is complete too (as before)
      lap("scores");
      await tx.update(contractFolder).set({ isComplete: true, updatedAt: new Date() }).where(eq(contractFolder.id, targetFolderId));
      return copiedCategories;
    });
    newDirs.length = 0; // committed: keep the new files
    console.log(`[copy-pb-files] ${plan.files.length} files, DB phases (ms): ${JSON.stringify(timings)}`);

    // --- 3. Old physical files of the target, only after the commit ---
    const oldDepth0 = depth0IdOf(targetFolderId, new Map(targetRows.map((r) => [r.id, r])));
    await mapWithConcurrency(existingFiles, COPY_CONCURRENCY, (file) =>
      fs.rm(uploadsPath("csms", "contracts", targetFolder.contractId, oldDepth0, file.id), { recursive: true, force: true }).catch(() => {}),
    );
    if (existingFiles.length > 0) console.log(`Deleted ${existingFiles.length} existing files from target folder`);

    const copiedFiles = filesToInsert.map((f) => ({ fileName: f.source.name, newFileId: f.newId, originalFileId: f.source.id }));
    return {
      success: true,
      message: `Copied ${copiedFiles.length} files${failedFiles.length ? `, ${failedFiles.length} failed` : ""}`,
      data: {
        copiedFiles,
        failedFiles,
        scoreCopiedCategories: copyOptions.copyScores ? valueCopiedCategories : [],
        noteCopiedCategories: copyOptions.copyUserNotes || copyOptions.copyContractorNotes ? valueCopiedCategories : [],
      },
    };
  } catch (error: any) {
    // nothing was committed: remove the physical copies made for this run
    await mapWithConcurrency(newDirs, COPY_CONCURRENCY, (dir) => fs.rm(dir, { recursive: true, force: true }).catch(() => {}));
    throw new Error(`Failed to copy files: ${error.message}`);
  }
}

/**
 * Background runner for the async copy endpoint. Never throws: every error ends up in the job
 * (an unhandled rejection would make close-with-grace shut the server down).
 */
export async function runCopyJob(
  store: CopyJobStore,
  jobId: string,
  sourceFolderId: string,
  targetFolderId: string,
  options: CopyOptionsInput,
): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await copyAllFilesIfComplete(sourceFolderId, targetFolderId, options, (done, total, message) => store.progress(jobId, done, total, message));
    if (result.success) store.finish(jobId, "completed", result.message, result.data);
    else store.finish(jobId, "failed", result.message || "Failed to copy PB files");
  } catch (error: any) {
    console.error(`[copy-pb-files] job ${jobId} failed:`, error);
    try { store.finish(jobId, "failed", error?.message || "Failed to copy PB files"); } catch {}
  } finally {
    console.log(`[copy-pb-files] job ${jobId} ${sourceFolderId} -> ${targetFolderId} finished in ${Date.now() - startedAt} ms`);
  }
}

import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";

// Valid score values
const VALID_SCORES = [-1, 0, 3, 6, 10];

export interface UpdateAssessmentInput {
  folderId: string;
  status?: 'pending' | 'accept' | 'reject' | 'revision';
  score?: number;
  note?: string;
  /** user who saves; recorded as the author of the note when the note changes */
  updatedBy?: string;
}

/**
 * Validate that score is one of the allowed values (-1, 0, 3, 6, 10)
 */
export function isValidScore(score: number): boolean {
  return VALID_SCORES.includes(score);
}

/**
 * Get all children of a folder
 */
export async function getFolderChildren(
  parentId: string,
  tx: any = db
) {
  return await tx.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, parentId),
  });
}

/**
 * Get folder by ID
 */
export async function getFolderById(
  folderId: string,
  tx: any = db
) {
  try {
    return await tx.query.contractFolder.findFirst({
      where: eq(contractFolder.id, folderId),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve folder by ID: ${error.message}`);
    }
    throw new Error(`Failed to retrieve folder by ID: Unknown error occurred`);
  }
}

/**
 * Calculate accumulated score for a folder based on its children.
 * 
 * Rules:
 * 1. Scoreable Leaves (Category 1, Category 2, or Standard Subcategories 3.1-8.2):
 *    Their scores are assigned directly by auditor or AI. Return existing score.
 *    Any user-created folders inside them must NEVER affect their score.
 * 2. Categories 3 to 8:
 *    Calculated as the AVERAGE (rata-rata) of only standard K3LL subcategories (e.g. 3.1..3.6).
 *    User-generated folders are strictly ignored and NEVER included in the divisor or sum.
 *    Rounded to 2 decimal places (e.g. 52 / 6 = 8.67).
 * 3. "A. RENCANA K3LL" (if present):
 *    Calculated as the sum of active Categories 1 to 8 (Total Skor Murni).
 * 4. Root Assessment Folder (depth 0, e.g. "24-09-2026 - PB"):
 *    Finds the 8 Categories (under "A. RENCANA K3LL" or direct children).
 *    Total Skor Murni = sum of active Categories 1 to 8.
 *    Total Skor Akhir = (Total Skor Murni / (activeCount * 10)) * 100.
 *    When all 8 categories are active, this equals Total Skor Murni * 1.25.
 *    Rounded to 2 decimal places.
 */
export async function calculateFolderScore(
  folderId: string,
  tx: any = db
): Promise<number> {
  const folder = await getFolderById(folderId, tx);
  if (!folder) {
    return 0;
  }

  // 1. If leaf scoreable (Category 1, 2, or subcategory like 3.1..8.2), return its own score.
  const isCat1or2 = folder.name === '1 Kepemimpinan dan Komitmen' ||
                    folder.name === '2 Kebijakan dan Sasaran Strategis K3LL' ||
                    /^[12]\s/.test(folder.name);
  const isStandardSubcategory = /^[3-8]\.\d+/.test(folder.name);
  if (isCat1or2 || isStandardSubcategory) {
    const s = folder.score !== null && folder.score !== undefined
      ? (typeof folder.score === 'string' ? parseFloat(folder.score) : folder.score)
      : 0;
    return isNaN(s) ? 0 : s;
  }

  const children = await getFolderChildren(folderId, tx);

  // 2. Root Assessment Folder (depth === 0 or name ends with - PB / - PA / - PSB)
  const isRootAssessment = folder.depth === 0 ||
    folder.name.endsWith(' - PB') ||
    folder.name.endsWith(' - PA') ||
    folder.name.endsWith(' - PSB');

  if (isRootAssessment) {
    // Find Category 1..8 folders (either inside A. RENCANA K3LL or directly under root)
    let categoryFolders: any[] = [];
    const rencanaK3LL = children.find((c: any) => c.name === 'A. RENCANA K3LL' && c.fileType === 'folder');
    if (rencanaK3LL) {
      const rencanaChildren = await getFolderChildren(rencanaK3LL.id, tx);
      categoryFolders = rencanaChildren.filter((c: any) => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));
    } else {
      categoryFolders = children.filter((c: any) => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));
    }

    if (categoryFolders.length === 0) {
      return 0;
    }

    let totalPureScore = 0;
    let activeCount = 0;
    for (const cat of categoryFolders) {
      const s = cat.score !== null && cat.score !== undefined
        ? (typeof cat.score === 'string' ? parseFloat(cat.score) : cat.score)
        : 0;
      if (s !== -1 && !isNaN(s)) {
        totalPureScore += s;
        activeCount++;
      }
    }

    if (activeCount === 0) {
      return -1;
    }

    // Scale to 100 based on active categories (8 categories = multiplier 1.25)
    const divisor = activeCount * 10;
    const finalScore = (totalPureScore / divisor) * 100;
    if (isNaN(finalScore)) return 0;
    return Math.round(finalScore * 10) / 10;
  }

  // 3. Container folder "A. RENCANA K3LL"
  if (folder.name === 'A. RENCANA K3LL') {
    const categoryFolders = children.filter((c: any) => c.fileType === 'folder' && /^[1-8]\s/.test(c.name));
    let totalScore = 0;
    let hasActive = false;
    for (const cat of categoryFolders) {
      const s = cat.score !== null && cat.score !== undefined
        ? (typeof cat.score === 'string' ? parseFloat(cat.score) : cat.score)
        : 0;
      if (s !== -1 && !isNaN(s)) {
        totalScore += s;
        hasActive = true;
      }
    }
    if (!hasActive) return -1;
    return Math.round(totalScore * 10) / 10;
  }

  // 4. Categories 3 to 8 (/^[3-8]\s/)
  const catMatch = folder.name.match(/^([3-8])\s/);
  if (catMatch) {
    const catNum = catMatch[1];
    // ONLY include standard subcategories matching ^catNum\.\d+! Ignore user-generated folders!
    const standardSubfolders = children.filter((c: any) => 
      c.fileType === 'folder' && new RegExp(`^${catNum}\\.\\d+`).test(c.name)
    );

    if (standardSubfolders.length === 0) {
      return 0;
    }

    let activeTotal = 0;
    let activeCount = 0;
    for (const sub of standardSubfolders) {
      const s = sub.score !== null && sub.score !== undefined
        ? (typeof sub.score === 'string' ? parseFloat(sub.score) : sub.score)
        : 0;
      if (s !== -1 && !isNaN(s)) {
        activeTotal += s;
        activeCount++;
      }
    }

    if (activeCount === 0) {
      return -1; // All subcategories are N/A
    }

    const calculatedScore = activeTotal / activeCount;
    if (isNaN(calculatedScore)) return 0;
    return Math.round(calculatedScore * 10) / 10;
  }

  // Fallback for any other custom container folder: sum active children
  let totalScore = 0;
  let hasActiveChild = false;
  for (const child of children) {
    const s = child.score !== null && child.score !== undefined
      ? (typeof child.score === 'string' ? parseFloat(child.score) : child.score)
      : 0;
    if (s !== -1 && !isNaN(s)) {
      totalScore += s;
      hasActiveChild = true;
    }
  }
  return hasActiveChild ? Math.round(totalScore * 10) / 10 : -1;
}

/**
 * Get all ancestors of a folder up to root
 */
export async function getAncestors(
  folderId: string,
  tx: any = db
): Promise<string[]> {
  const folder = await getFolderById(folderId, tx);
  if (!folder || !folder.parentId) {
    return [];
  }

  const ancestors = [folder.parentId];
  let currentParentId = folder.parentId;

  while (currentParentId) {
    const parent = await getFolderById(currentParentId, tx);
    if (parent && parent.parentId) {
      ancestors.push(parent.parentId);
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Update assessment for a folder (status, score, note)
 * Only allows valid scores (0, 3, 6, 10)
 * Recalculates parent scores up to root
 */
export async function updateFolderAssessment(
  input: UpdateAssessmentInput,
  tx: any = db
) {
  const { folderId, status, score, note } = input;

  // Validate score if provided
  if (score !== undefined && !isValidScore(score)) {
    throw new Error(
      `Invalid score: ${score}. Allowed values are: ${VALID_SCORES.join(', ')}`
    );
  }

  // Get folder
  const folder = await getFolderById(folderId, tx);
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (status !== undefined) {
    updateData.status = status;
  }

  if (score !== undefined) {
    updateData.score = score;
  }

  if (note !== undefined) {
    updateData.note = note;
    if (note !== (folder.note ?? '')) {
      updateData.noteUpdatedBy = input.updatedBy ?? null;
      updateData.noteUpdatedAt = new Date();
    }
  }


  // Update folder
  await tx.update(contractFolder).set(updateData).where(eq(contractFolder.id, folderId));

  // If score was updated, recalculate parent scores
  if (score !== undefined) {
    const ancestors = await getAncestors(folderId, tx);

    for (const ancestorId of ancestors) {
      const calculatedScore = await calculateFolderScore(ancestorId, tx);
      await tx.update(contractFolder).set({
        score: calculatedScore,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, ancestorId));
    }
  }

  // Return updated folder
  return await getFolderById(folderId, tx);
}

/**
 * Get assessment details for a folder
 */
export async function getAssessmentDetails(folderId: string, tx: any = db) {
  const folder = await getFolderById(folderId, tx);
  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }

  return {
    id: folder.id,
    name: folder.name,
    status: folder.status,
    score: folder.score,
    note: folder.note,
    fileType: folder.fileType,
    depth: folder.depth,
    parentId: folder.parentId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export interface BulkAssessmentItem {
  folderId: string;
  status: 'pending' | 'accept' | 'reject' | 'revision';
  score: number;
  note?: string;
}

export interface BulkAssessmentInput {
  rootFolderId: string;
  items: BulkAssessmentItem[];
  /** user who saves; recorded as the author of each note that changes */
  updatedBy?: string;
}

/**
 * Bulk update folder assessments and recalculate parent scores bottom-up in one transaction
 */
export async function bulkUpdateFolderAssessment(
  input: BulkAssessmentInput,
  tx: any = db
) {
  const { rootFolderId, items } = input;
  const rootFolder = await getFolderById(rootFolderId, tx);
  if (!rootFolder) {
    throw new Error(`Root folder with ID ${rootFolderId} not found`);
  }

  // current notes, to record the author only for notes that really change
  const noteIds = items.filter((i) => i.note !== undefined).map((i) => i.folderId);
  const currentNotes = new Map<string, string>(
    noteIds.length > 0
      ? (await tx.select({ id: contractFolder.id, note: contractFolder.note }).from(contractFolder).where(inArray(contractFolder.id, noteIds)))
          .map((r: { id: string; note: string | null }) => [r.id, r.note ?? ''])
      : [],
  );

  // 1. Update each item
  for (const item of items) {
    const updateData: any = {
      status: item.status,
      score: item.score.toString(),
      updatedAt: new Date(),
    };
    if (item.note !== undefined) {
      updateData.note = item.note;
      if (item.note !== currentNotes.get(item.folderId)) {
        updateData.noteUpdatedBy = input.updatedBy ?? null;
        updateData.noteUpdatedAt = new Date();
      }
    }
    await tx.update(contractFolder).set(updateData).where(eq(contractFolder.id, item.folderId));
  }

  // 2. Recalculate parent scores and statuses from the bottom up
  const allFolders = await tx.query.contractFolder.findMany({
    where: eq(contractFolder.contractId, rootFolder.contractId),
  });

  const folderDict: any = {};
  for (const f of allFolders) {
    folderDict[f.id] = {
      ...f,
      score: f.score !== null ? parseFloat(f.score) : 0.0,
      children: []
    };
  }
  for (const fid in folderDict) {
    const f = folderDict[fid];
    if (f.parentId && folderDict[f.parentId]) {
      folderDict[f.parentId].children.push(f);
    }
  }

  const sortedFolders = Object.values(folderDict).sort((a: any, b: any) => b.depth - a.depth);

  for (const f of sortedFolders as any) {
    const isScoreableLeaf = f.name.startsWith("1 ") || f.name.startsWith("2 ") || /^[3-8]\.\d+/.test(f.name);
    if (f.fileType === 'folder' && !isScoreableLeaf) {
      const calculatedScore = await calculateFolderScore(f.id, tx);

      let calculatedStatus = 'pending';
      const children = await getFolderChildren(f.id, tx);
      const childStatuses = children
        .filter((c: any) => c.score !== -1)
        .map((c: any) => c.status);

      if (f.depth === 0) {
        calculatedStatus = calculatedScore > 0 ? 'accept' : 'reject';
      } else if (f.depth === 1) {
        if (!childStatuses.length) {
          calculatedStatus = 'pending';
        } else if (childStatuses.includes('revision')) {
          calculatedStatus = 'revision';
        } else if (childStatuses.includes('reject')) {
          calculatedStatus = 'reject';
        } else if (childStatuses.every((s: any) => s === 'accept')) {
          calculatedStatus = 'accept';
        }
      } else if (f.depth === 2) {
        if (childStatuses.includes('revision')) {
          calculatedStatus = 'revision';
        } else if (childStatuses.includes('reject')) {
          calculatedStatus = 'reject';
        } else if (childStatuses.every((s: any) => s === 'accept')) {
          calculatedStatus = 'accept';
        }
      }

      await tx.update(contractFolder).set({
        score: calculatedScore.toString(),
        status: calculatedStatus,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, f.id));
    }
  }

  return { success: true, count: items.length };
}



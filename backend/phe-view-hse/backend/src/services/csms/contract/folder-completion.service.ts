import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";
import { eq, like, and, sql } from "drizzle-orm";

export async function anyChildHasFile(folderId: string): Promise<boolean> {
  // Get all direct children
  const children = await db.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, folderId)
  });

  // Check each child
  for (const child of children) {
    // If child is a file, return true
    if (child.fileType === 'file') {
      return true;
    }
    
    // If child is a folder, recursively check its children
    if (child.fileType === 'folder') {
      const hasFile = await anyChildHasFile(child.id);
      if (hasFile) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if all children of a folder have files (direct or indirect)
 * @param folderId 
 * @returns Boolean indicating if all children have files
 */
export async function allChildrenHaveFiles(folderId: string): Promise<boolean> {
  // Get all direct children
  const children = await db.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, folderId)
  });

  // If no children, return false
  if (children.length === 0) {
    return false;
  }

  // Check each child
  for (const child of children) {
    // If child is a file, continue (this child has files)
    if (child.fileType === 'file') {
      continue;
    }
    
    // If child is a folder, check if it has any files
    if (child.fileType === 'folder') {
      const hasFile = await anyChildHasFile(child.id);
      if (!hasFile) {
        return false; // This child folder has no files
      }
    }
  }

  return true; // All children have files
}

/**
 * Check if all children of a folder are complete
 * For regular folders, this means all children (files or folders) must be complete
 * @param folderId 
 * @returns Boolean indicating if all children are complete
 */
export async function areAllChildrenComplete(folderId: string): Promise<boolean> {
  // Get all direct children
  const children = await db.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, folderId)
  });

  // If no children, return false
  if (children.length === 0) {
    return false;
  }

  // Check if all children are complete
  for (const child of children) {
    // If child is a file, it should be complete
    if (child.fileType === 'file') {
      // Handle null values - if isComplete is null, check if it has been uploaded (has filePath)
      if (child.isComplete === false) {
        return false;
      } else if (child.isComplete === null) {
        // If isComplete is null, check if the file has been uploaded (has filePath)
        if (!child.filePath) {
          return false;
        }
      }
    } 
    // If child is a folder, check if it's complete
    else if (child.fileType === 'folder') {
      // Handle null values - if isComplete is null, recursively check its children
      if (child.isComplete === false) {
        return false;
      } else if (child.isComplete === null) {
        // For folders with null completion status, recursively check if all their children are complete
        const isChildComplete = await areAllChildrenComplete(child.id);
        if (!isChildComplete) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Check if a folder has at least one file
 * @param folderId 
 * @returns Boolean indicating if the folder has at least one file
 */
export async function folderHasFile(folderId: string, existingAllItems?: any[]): Promise<boolean> {
  if (existingAllItems) {
    return existingAllItems.some(f => f.parentId === folderId && f.fileType === 'file');
  }

  // Get all direct children that are files
  const files = await db.query.contractFolder.findMany({
    where: and(
      eq(contractFolder.parentId, folderId),
      eq(contractFolder.fileType, 'file')
    )
  });

  return files.length > 0;
}

/**
 * Check if a K3LL structure folder should be marked as complete
 * For K3LL folders, all children need to be complete for the folder to be complete
 * @param folderId 
 * @param existingAllItems Optional pre-fetched in-memory folder array to avoid N+1 queries
 * @returns Boolean indicating if the K3LL folder should be marked as complete
 */
export async function isK3LLFolderComplete(folderId: string, existingAllItems?: any[]): Promise<boolean> {
  // Get all direct children
  const children = existingAllItems
    ? existingAllItems.filter(f => f.parentId === folderId)
    : await db.query.contractFolder.findMany({
        where: eq(contractFolder.parentId, folderId)
      });

  // If no children, return false
  if (children.length === 0) {
    return false;
  }

  // Check if all children are complete
  for (const child of children) {
    // If child is a file, it should be complete
    if (child.fileType === 'file') {
      // Handle null values - if isComplete is null, check if it has been uploaded (has filePath)
      if (child.isComplete === false) {
        return false;
      } else if (child.isComplete === null || child.isComplete === undefined) {
        // If isComplete is null, check if the file has been uploaded (has filePath)
        if (!child.filePath) {
          return false;
        }
      }
    } 
    // If child is a folder, check if it's complete
    else if (child.fileType === 'folder') {
      // Handle null values - if isComplete is null, recursively check its children
      if (child.isComplete === false) {
        return false;
      } else if (child.isComplete === null || child.isComplete === undefined) {
        // For folders with null completion status, recursively check if all their children are complete
        const isChildComplete = await isK3LLFolderComplete(child.id, existingAllItems);
        if (!isChildComplete) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Helper to check if a file belongs under a target folder either by ltree path OR by parentId ancestry
 */
function isFileUnderFolder(file: any, targetFolder: any, folderMap: Map<string, any>): boolean {
  if (file.fileType !== 'file') return false;
  if (file.parentId === targetFolder.id) return true;
  if (file.path && targetFolder.path && typeof file.path === 'string' && typeof targetFolder.path === 'string') {
    if (file.path === targetFolder.path || file.path.startsWith(targetFolder.path + '.')) {
      return true;
    }
  }
  let curr = folderMap.get(file.parentId);
  while (curr) {
    if (curr.id === targetFolder.id) return true;
    if (!curr.parentId) break;
    curr = folderMap.get(curr.parentId);
  }
  return false;
}

/**
 * Recursively check if a folder and all its subfolders have at least one file
 * For assessment folders, only the numbered K3LL subfolders (1-8) need to have files in their children
 * The main assessment folder, "A. RENCANA K3LL", and the numbered K3LL folders themselves don't need files
 * Only their children need to contain files
 * @param folderId 
 * @param existingAllItems Optional pre-fetched in-memory folder array to avoid N+1 queries
 * @returns Boolean indicating if the folder structure is complete
 */
/**
 * Get all mandatory folders/subfolders that do not have any files
 * @param folderId Root assessment folder ID or target folder ID
 * @param existingAllItems Optional pre-fetched in-memory folder array
 * @returns Array of names of empty mandatory folders
 */
export async function getMissingMandatoryFolders(folderId: string, existingAllItems?: any[]): Promise<string[]> {
  const folder = existingAllItems
    ? existingAllItems.find(f => f.id === folderId)
    : await db.query.contractFolder.findFirst({
        where: eq(contractFolder.id, folderId)
      });

  if (!folder) {
    return [];
  }

  const allContractItems = existingAllItems || await db.query.contractFolder.findMany({
    where: eq(contractFolder.contractId, folder.contractId)
  });

  const folderMap = new Map<string, any>();
  for (const item of allContractItems) {
    folderMap.set(item.id, item);
  }

  // Auto-heal empty paths in memory and in DB asynchronously if any exist
  for (const item of allContractItems) {
    if ((!item.path || item.path === '') && item.parentId && folderMap.has(item.parentId)) {
      const parent = folderMap.get(item.parentId);
      if (parent && parent.path) {
        const fixedPath = `${parent.path}.${item.id}`;
        item.path = fixedPath;
        db.update(contractFolder)
          .set({ path: sql`${fixedPath}::ltree` })
          .where(eq(contractFolder.id, item.id))
          .catch(() => {});
      }
    }
  }

  const missing: string[] = [];

  // PSB folders need at least one file
  if (folder.name.endsWith(' - PSB')) {
    const hasFiles = allContractItems.some(f => isFileUnderFolder(f, folder, folderMap));
    if (!hasFiles) {
      missing.push(folder.name);
    }
    return missing;
  }

  // If this is not an assessment folder (PB or PA)
  if (!folder.name.endsWith(' - PB') && !folder.name.endsWith(' - PA')) {
    const childItems = allContractItems.filter(item => item.parentId === folderId);
    if (childItems.length > 0) {
      const numberedChildren = childItems.filter(child => /^([1-8])\.\d+/.test(child.name));
      if (numberedChildren.length > 0) {
        for (const nc of numberedChildren) {
          const hasFiles = allContractItems.some(f => isFileUnderFolder(f, nc, folderMap));
          if (!hasFiles) {
            missing.push(nc.name);
          }
        }
        return missing;
      }
      const hasFiles = allContractItems.some(f => isFileUnderFolder(f, folder, folderMap));
      if (!hasFiles) {
        missing.push(folder.name);
      }
      return missing;
    } else {
      if (folder.fileType !== 'file') {
        const hasFiles = allContractItems.some(f => isFileUnderFolder(f, folder, folderMap));
        if (!hasFiles) {
          missing.push(folder.name);
        }
      }
      return missing;
    }
  }

  // For assessment folders (PB or PA), find "A. RENCANA K3LL" or direct numbered folders
  const childItems = allContractItems.filter(item => item.parentId === folderId);
  const rencanaK3LLFolder = childItems.find(child => child.name === 'A. RENCANA K3LL');
  const sourceFolders = rencanaK3LLFolder
    ? allContractItems.filter(child => child.parentId === rencanaK3LLFolder.id)
    : childItems;

  const numberedK3LLFolders = sourceFolders
    .filter(child => child.fileType === 'folder' && /^([1-8])\s/.test(child.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (numberedK3LLFolders.length === 0) {
    missing.push('A. RENCANA K3LL');
    return missing;
  }

  for (const k3llFolder of numberedK3LLFolders) {
    const subfolders = allContractItems.filter(f => 
      f.parentId === k3llFolder.id && f.fileType === 'folder' && /^[1-8]\.\d+/.test(f.name)
    ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (subfolders.length > 0) {
      for (const sf of subfolders) {
        const hasFiles = allContractItems.some(f => isFileUnderFolder(f, sf, folderMap));
        if (!hasFiles) {
          missing.push(sf.name);
        }
      }
    } else {
      const hasFiles = allContractItems.some(f => isFileUnderFolder(f, k3llFolder, folderMap));
      if (!hasFiles) {
        missing.push(k3llFolder.name);
      }
    }
  }

  return missing;
}

/**
 * Recursively check if a folder and all its subfolders have at least one file
 * For assessment folders, only the numbered K3LL subfolders (1-8) need to have files in their children
 * The main assessment folder, "A. RENCANA K3LL", and the numbered K3LL folders themselves don't need files
 * Only their children need to contain files
 * @param folderId 
 * @param existingAllItems Optional pre-fetched in-memory folder array to avoid N+1 queries
 * @returns Boolean indicating if the folder structure is complete
 */
export async function isFolderStructureComplete(folderId: string, existingAllItems?: any[]): Promise<boolean> {
  // Get the folder
  const folder = existingAllItems
    ? existingAllItems.find(f => f.id === folderId)
    : await db.query.contractFolder.findFirst({
        where: eq(contractFolder.id, folderId)
      });

  if (!folder) {
    return false;
  }

  // If already finalized, it is locked and permanently complete
  if (folder.isFinal === true) {
    return true;
  }

  const missing = await getMissingMandatoryFolders(folderId, existingAllItems);
  return missing.length === 0;
}

/**
 * Calculate the progress of filling mandatory folders (1-8)
 * @param folderId 
 * @returns Object containing filled count, total count (8), and percentage
 */
export async function getFolderFillingProgress(folderId: string): Promise<{ filled: number, total: number, percentage: number }> {
  const total = 8;
  let filled = 0;

  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });

  if (!folder) {
    return { filled: 0, total, percentage: 0 };
  }

  // PSB folders don't have the 1-8 structure, they're either filled (100) or not (0)
  if (folder.name.endsWith(' - PSB')) {
    const isFilled = await folderHasFile(folderId);
    return { filled: isFilled ? 1 : 0, total: 1, percentage: isFilled ? 100 : 0 };
  }

  const allContractItems = await db.query.contractFolder.findMany({
    where: eq(contractFolder.contractId, folder.contractId)
  });

  const folderMap = new Map<string, any>();
  for (const item of allContractItems) {
    folderMap.set(item.id, item);
  }

  const childItems = allContractItems.filter(item => item.parentId === folderId);
  const rencanaK3LLFolder = childItems.find(child => child.name === 'A. RENCANA K3LL');
  const k3llRootFolders = rencanaK3LLFolder
    ? allContractItems.filter(f => f.parentId === rencanaK3LLFolder.id)
    : childItems;

  const hasCategories = k3llRootFolders.some(f => f.fileType === 'folder' && /^[1-8]\s/.test(f.name));
  if (!hasCategories) {
    return { filled: 0, total, percentage: 0 };
  }

  for (let i = 1; i <= 8; i++) {
    const prefix = `${i} `;
    const k3llFolder = k3llRootFolders.find(f => f.name.startsWith(prefix));
    
    if (k3llFolder) {
      const hasFiles = allContractItems.some(f => isFileUnderFolder(f, k3llFolder, folderMap));
      if (hasFiles) {
        filled++;
      }
    }
  }

  return { 
    filled, 
    total, 
    percentage: Math.round((filled / total) * 100) 
  };
}

/**
 * Update parent folder completion status recursively
 * @param folderId 
 */
export async function updateParentFolderCompletionStatus(folderId: string) {
  // Get the folder
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });

  if (!folder || !folder.parentId) {
    return; // No parent to update
  }

  // Get parent folder
  const parentFolder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folder.parentId)
  });

  if (!parentFolder) {
    return;
  }

  // Check if this is an assessment folder (PB or PA or PSB)
  const isAssessmentFolder = parentFolder.name.endsWith(' - PB') || 
                            parentFolder.name.endsWith(' - PA') || 
                            parentFolder.name.endsWith(' - PSB');

  let isComplete = false;

  if (isAssessmentFolder) {
    // For assessment folders, use isFolderStructureComplete to check completion
    isComplete = await isFolderStructureComplete(parentFolder.id);
  } else {
    // Check if parent is part of K3LL structure
    const isK3LLParent = parentFolder.name === 'A. RENCANA K3LL' || 
                        /^([1-8])\s/.test(parentFolder.name) ||  // Numbered K3LL folders (1, 2, 3, etc.)
                        /^([1-8])\.(\d+)/.test(parentFolder.name); // Sub-numbered K3LL folders (1.1, 1.2, etc.)

    if (isK3LLParent) {
      // For K3LL structure folders, check if all children are complete
      isComplete = await isK3LLFolderComplete(parentFolder.id);
    } else {
      // For other folders, check if the folder has at least one file
      isComplete = await folderHasFile(parentFolder.id);
    }
  }

  // Update parent folder completion status
  await updateFolderCompletionStatus(parentFolder.id, isComplete);

  // Recursively update grandparent
  await updateParentFolderCompletionStatus(parentFolder.id);
}

/**
 * Update completion status for all parent folders recursively
 * @param folderId 
 */
export async function updateAllParentFoldersCompletionStatus(folderId: string) {
  // Get the folder
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });

  if (!folder || !folder.parentId) {
    return; // No parent to update
  }

  // Get parent folder
  const parentFolder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folder.parentId)
  });

  if (!parentFolder) {
    return;
  }

  // Check if this is an assessment folder (PB or PA or PSB)
  const isAssessmentFolder = parentFolder.name.endsWith(' - PB') || 
                            parentFolder.name.endsWith(' - PA') || 
                            parentFolder.name.endsWith(' - PSB');

  let isComplete = false;

  if (isAssessmentFolder) {
    // For assessment folders, use isFolderStructureComplete to check completion
    isComplete = await isFolderStructureComplete(parentFolder.id);
  } else {
    // Check if parent is part of K3LL structure
    const isK3LLParent = parentFolder.name === 'A. RENCANA K3LL' || 
                        /^([1-8])\s/.test(parentFolder.name) ||  // Numbered K3LL folders (1, 2, 3, etc.)
                        /^([1-8])\.(\d+)/.test(parentFolder.name); // Sub-numbered K3LL folders (1.1, 1.2, etc.)

    if (isK3LLParent) {
      // For K3LL structure folders, check if all children are complete
      isComplete = await isK3LLFolderComplete(parentFolder.id);
    } else {
      // For other folders, check if the folder has at least one file
      isComplete = await folderHasFile(parentFolder.id);
    }
  }

  // Update parent folder completion status
  await updateFolderCompletionStatus(parentFolder.id, isComplete);

  // Recursively update all parent folders
  await updateAllParentFoldersCompletionStatus(parentFolder.id);
}

/**
 * Update the isComplete status of a folder in the database
 * @param folderId 
 * @param isComplete 
 */
export async function updateFolderCompletionStatus(folderId: string, isComplete: boolean) {
  await db.update(contractFolder).set({
    isComplete,
    updatedAt: new Date()
  }).where(eq(contractFolder.id, folderId));
}

/**
 * Update completion status for all assessment folders in a contract
 * @param contractId 
 */
export async function updateAllAssessmentFoldersCompletionStatus(contractId: string) {
  // Get all assessment folders for this contract (including PSB)
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, or }) => 
      and(
        eq(fields.contractId, contractId),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      ),
  });

  // Update completion status for each folder
  for (const folder of assessmentFolders) {
    const isComplete = await isFolderStructureComplete(folder.id);
    await updateFolderCompletionStatus(folder.id, isComplete);
  }
}

/**
 * Get all assessment folders for a contract with completion status
 * @param contractId 
 * @returns Array of assessment folders with completion status
 */
export async function getAssessmentFoldersWithCompletionStatus(contractId: string) {
  // Get all PB, PA, and PSB folders for this contract
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, or }) => 
      and(
        eq(fields.contractId, contractId),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA'),
          like(fields.name, '% - PSB')
        )
      ),
  });

  // Add completion status to each folder
  const foldersWithStatus = [];
  for (const folder of assessmentFolders) {
    const isComplete = await isFolderStructureComplete(folder.id);
    foldersWithStatus.push({
      ...folder,
      isComplete
    });
  }

  return foldersWithStatus;
}
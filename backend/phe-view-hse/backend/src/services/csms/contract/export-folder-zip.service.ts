import { db } from '../../../db/index.ts';
import { contractFolder, contract } from '../../../db/schema/csms.schema.ts';
import { eq, sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import archiver from 'archiver';
import { uploadsPath } from '../../../config/env.config.ts';

/**
 * Get the depth 0 (root assessment) folder ID for a given folder by traversing up the hierarchy
 * @param folderId The folder ID to start from
 * @returns The depth 0 folder ID, or the original folderId if already at depth 0
 */
async function getDepth0FolderId(folderId: string): Promise<string> {
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });

  if (!folder) {
    return folderId;
  }

  // If already depth 0, return this folder's ID
  if (folder.depth === 0) {
    return folderId;
  }

  // Otherwise, traverse up to find the depth 0 folder
  let currentFolder = folder;
  while (currentFolder?.depth != null && currentFolder.depth > 0 && currentFolder.parentId) {
    const parentFolder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, currentFolder.parentId)
    });
    if (!parentFolder) {
      // If we can't find parent, return current folder ID
      return currentFolder.id;
    }
    currentFolder = parentFolder;
  }

  return currentFolder.id;
}

/**
 * Get all folders and files recursively under a specific folder
 * @param folderId 
 * @returns Array of folder and file records
 */
async function getAllFolderContents(folderId: string) {
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`);
  }

  // Get all descendants (both folders and files) using ltree path
  const allContents = await db.query.contractFolder.findMany({
    where: sql`${contractFolder.path} <@ (SELECT path FROM csms_contract_folder WHERE id = ${folderId})`
  });

  return allContents;
}

/**
 * Generate export zip filename with pattern: title_contractName_folderName_timestamp
 * @param contractTitle 
 * @param contractName
 * @param folderName 
 * @param updatedAt 
 * @returns Filename without extension
 */
function generateExportFilename(contractTitle: string, contractName: string, folderName: string, updatedAt: Date): string {
  // Format timestamp as YYYYMMDDHHMMSS
  const timestamp = updatedAt.toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  
  // Sanitize names for filename (remove special characters)
  const sanitizedTitle = contractTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const sanitizedContractName = contractName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  
  return `${sanitizedTitle}_${sanitizedContractName}_${sanitizedFolderName}_${timestamp}`;
}

/**
 * Check if export file exists and if it's up to date
 * @param contractTitle
 * @param contractName
 * @param folderName
 * @param updatedAt 
 * @returns { exists: boolean; filename: string | null; needsUpdate: boolean }
 */
async function checkExportStatus(contractTitle: string, contractName: string, folderName: string, updatedAt: Date) {
  const exportDir = uploadsPath('export', 'contract');
  
  try {
    await fs.mkdir(exportDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const files = await fs.readdir(exportDir);
  
  // Look for zip files matching pattern: title_contractName_folderName_*
  const sanitizedTitle = contractTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const sanitizedContractName = contractName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const prefix = `${sanitizedTitle}_${sanitizedContractName}_${sanitizedFolderName}_`;
  
  const folderZips = files.filter(f => f.startsWith(prefix) && f.endsWith('.zip'));

  if (folderZips.length === 0) {
    return { exists: false, filename: null, needsUpdate: true };
  }

  const currentFilename = generateExportFilename(contractTitle, contractName, folderName, updatedAt);
  const existingFilename = folderZips[0].replace('.zip', '');

  // Check if the existing filename matches the current timestamp
  if (existingFilename === currentFilename) {
    return { exists: true, filename: folderZips[0], needsUpdate: false };
  }

  // Different timestamp means folder was updated, need to regenerate
  return { exists: true, filename: folderZips[0], needsUpdate: true };
}

/**
 * Delete old export file(s) for a folder
 * @param contractTitle
 * @param contractName
 * @param folderName
 */
async function deleteOldExports(contractTitle: string, contractName: string, folderName: string) {
  const exportDir = uploadsPath('export', 'contract');
  
  try {
    const files = await fs.readdir(exportDir);
    const sanitizedTitle = contractTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const sanitizedContractName = contractName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const prefix = `${sanitizedTitle}_${sanitizedContractName}_${sanitizedFolderName}_`;
    
    const folderZips = files.filter(f => f.startsWith(prefix) && f.endsWith('.zip'));

    for (const file of folderZips) {
      await fs.unlink(path.resolve(exportDir, file));
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.warn(`Failed to delete old exports: ${error.message}`);
    } else {
      console.warn(`Failed to delete old exports: Unknown error`);
    }
  }
}

/**
 * Generate relative path for file in zip based on folder hierarchy
 * @param item 
 * @param allContents 
 * @param rootFolder 
 * @returns Relative path for zip file with folder structure
 */
function generateZipPath(item: any, allContents: any[], rootFolder: any): string {
  if (item.id === rootFolder.id) {
    return item.name;
  }

  // Build path from root folder to this item using parentId relationships
  const pathParts: string[] = [];
  let currentItem = item;

  // Traverse up the folder hierarchy
  while (currentItem && currentItem.id !== rootFolder.id) {
    pathParts.unshift(currentItem.name);
    
    if (currentItem.parentId) {
      // Find parent in contents
      currentItem = allContents.find(c => c.id === currentItem.parentId);
    } else {
      break;
    }
  }

  // Join path parts with forward slash for ZIP format
  return pathParts.join('/');
}

/**
 * Create zip file from folder contents
 * @param folderId 
 * @param zipPath 
 * @param folderContents 
 * @returns Promise that resolves when zip is complete
 */
async function createZipFile(
  folderId: string,
  zipPath: string,
  folderContents: any[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Zip file created successfully: ${zipPath}`);
      resolve();
    });

    output.on('error', (err: Error) => {
      reject(new Error(`Output stream error: ${err.message}`));
    });

    archive.on('error', (err: Error) => {
      reject(new Error(`Archive error: ${err.message}`));
    });

    archive.on('warning', (err: any) => {
      if (err.code === 'ENOENT') {
        // File not found, skip this file
        console.warn(`Warning: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Add root folder and all contents
    const rootFolder = folderContents.find(item => item.id === folderId);
    if (!rootFolder) {
      reject(new Error('Root folder not found in contents'));
      return;
    }

    // Track files and folders to add
    const filesToAdd: Array<{ path: string; name: string }> = [];
    const foldersInZip = new Set<string>(); // Track folder paths already added to ZIP

    // Process items asynchronously
    (async () => {
      try {
        // Add each file and folder to the archive
        for (const item of folderContents) {
          // Skip the root folder itself
          if (item.id === folderId) {
            continue;
          }

          // Generate the path in ZIP
          const zipPath = generateZipPath(item, folderContents, rootFolder);

          if (item.fileType === 'file' && item.filePath) {
            // Construct file path on disk
            // For files, get the depth 0 folder ID from the parent folder (item.parentId)
            const depth0FolderId = item.parentId ? await getDepth0FolderId(item.parentId) : folderId;
            const fileUploadPath = uploadsPath(
              'csms',
              'contracts',
              item.contractId,
              depth0FolderId,
              item.id,
              item.filePath
            );

            filesToAdd.push({
              path: fileUploadPath,
              name: zipPath
            });
          } else if (item.fileType === 'folder') {
            // Add folder to ZIP (creates folder structure)
            // Only add if not already added
            if (!foldersInZip.has(zipPath)) {
              // Add an empty entry for the folder (with trailing slash)
              archive.append('', { name: `${zipPath}/` });
              foldersInZip.add(zipPath);
            }
          }
        }

        // Add files to archive
        let fileIndex = 0;
        const addNextFile = async () => {
          if (fileIndex >= filesToAdd.length) {
            // All files added, finalize archive
            archive.finalize();
            return;
          }

          const file = filesToAdd[fileIndex];
          fileIndex++;

          try {
            // Check if file exists
            const stats = await fs.stat(file.path);
            if (stats.isFile()) {
              archive.file(file.path, { name: file.name });
            }
          } catch (err: unknown) {
            // File doesn't exist, skip it
            if (err instanceof Error && err.message.includes('ENOENT')) {
              console.warn(`File not found, skipping: ${file.path}`);
            }
          }

          await addNextFile();
        };

        await addNextFile();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

/**
 * Export folder to zip file
 * Implements the business logic:
 * 1. Check if export exists by comparing updatedAt timestamp
 * 2. If timestamp differs, delete old export and create new one
 * 3. If timestamp matches, return existing export
 * 4. Generate all folder contents into zip
 * 
 * @param folderId 
 * @returns { success: boolean; filename: string; zipPath: string; isNew: boolean }
 */
export async function exportFolderToZip(folderId: string) {
  try {
    // Get folder details
    const folder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, folderId)
    });

    if (!folder) {
      throw new Error(`Folder with ID ${folderId} not found`);
    }

    // Get contract details for title
    const contractRecord = await db.query.contract.findFirst({
      where: eq(contract.id, folder.contractId)
    });

    if (!contractRecord) {
      throw new Error(`Contract with ID ${folder.contractId} not found`);
    }

    // Extract contract number/name (numberContract field)
    const contractName = contractRecord.numberContract;
    const contractTitle = contractRecord.title;

    // Check export status
    const exportStatus = await checkExportStatus(contractTitle, contractName, folder.name, folder.updatedAt);

    // If export exists and is up to date, return it
    if (!exportStatus.needsUpdate && exportStatus.exists && exportStatus.filename) {
      return {
        success: true,
        filename: exportStatus.filename,
        zipPath: path.resolve(process.cwd(), '../uploads/export/contract', exportStatus.filename),
        isNew: false,
        message: 'Export already exists and is up to date'
      };
    }

    // Delete old exports if they exist
    if (exportStatus.exists) {
      await deleteOldExports(contractTitle, contractName, folder.name);
    }

    // Get all folder contents
    const folderContents = await getAllFolderContents(folderId);

    // Generate new filename and path using contract title, contract name, and folder name
    const newFilename = generateExportFilename(contractTitle, contractName, folder.name, folder.updatedAt);
  const exportDir = uploadsPath('export', 'contract');
    const zipPath = path.resolve(exportDir, `${newFilename}.zip`);

    // Ensure export directory exists
    await fs.mkdir(exportDir, { recursive: true });

    // Create zip file
    await createZipFile(folderId, zipPath, folderContents);

    return {
      success: true,
      filename: `${newFilename}.zip`,
      zipPath: zipPath,
      isNew: true,
      message: 'Export created successfully'
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to export folder to zip: ${error.message}`);
    }
    throw new Error('Failed to export folder to zip: Unknown error');
  }
}

/**
 * Get export file stream for download
 * @param folderId 
 * @returns Read stream of zip file
 */
export async function getExportFileStream(folderId: string) {
  const exportDir = uploadsPath('export', 'contract');
  const files = await fs.readdir(exportDir);
  
  const folderZips = files.filter(f => f.startsWith(`${folderId}_`) && f.endsWith('.zip'));

  if (folderZips.length === 0) {
    throw new Error('No export file found for this folder');
  }

  const zipPath = path.resolve(exportDir, folderZips[0]);
  return {
    stream: createReadStream(zipPath),
    filename: folderZips[0]
  };
}

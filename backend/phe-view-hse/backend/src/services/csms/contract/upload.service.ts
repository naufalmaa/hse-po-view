import { db } from '../../../db/index.ts'
import { contractFolder, contract, approvalLog } from '../../../db/schema/csms.schema.ts'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { getTimestampFilename } from '../../../utils/utils.ts'
import type { UploadedFile } from '../../../types/file.ts'
import { eq, sql, like, asc } from 'drizzle-orm'
import { updateAllParentFoldersCompletionStatus, updateFolderCompletionStatus, areAllChildrenComplete, isFolderStructureComplete, isK3LLFolderComplete } from './folder-completion.service.ts'
import { getApprovalSummary } from './approval.service.ts'
import { exportEvaluasiToPDF } from './send-evaluasi-email.service.ts'
import { uploadsPath } from '../../../config/env.config.ts'

// Constants for evaluation documents folder name
const EVALUASI_FOLDER_NAME = 'DOKUMEN EVALUASI';

/**
 * Get or create the "DOKUMEN EVALUASI" folder for a contract
 * This folder is at depth 0 and serves as the container for final evaluation documents
 * @param contractId The contract ID
 * @returns The folder record
 */
async function getOrCreateEvaluasiFolder(contractId: string) {
  // Check if the folder already exists
  // Note: depth is a generated column in PostgreSQL, so we filter after query
  const existingFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.contractId, contractId),
        eq(fields.name, EVALUASI_FOLDER_NAME),
        eq(fields.fileType, 'folder')
      )
  });
  
  // Filter to only include depth 0 folders (path = id in ltree)
  const existingFolder = existingFolders.find(f => f.path === f.id) || null;

  if (existingFolder) {
    return existingFolder;
  }

  // Create the folder if it doesn't exist
  const [newFolder] = await db.insert(contractFolder).values({
    contractId,
    parentId: null,
    name: EVALUASI_FOLDER_NAME,
    description: 'Dokumen Evaluasi Akhir - Final evaluation documents from all PB and PA assessments',
    path: sql`''::ltree`,
    fileType: 'folder',
    isComplete: false,
    isCopy: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  // Update the path with the correct value using the generated ID
  await db.update(contractFolder).set({
    path: sql`${newFolder.id}::ltree`,
    updatedAt: new Date(),
  }).where(eq(contractFolder.id, newFolder.id));

  // Return the updated folder
  return await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, newFolder.id)
  });
}

// Function to update the isCopy status of all parent folders up the hierarchy
async function updateParentFoldersIsCopyStatus(folderId: string) {
  // Get the current folder to find its parent
  const currentFolder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  });
  
  if (currentFolder && currentFolder.parentId) {
    // Get all siblings (children of the same parent) to check their isCopy status
    const siblings = await db.query.contractFolder.findMany({
      where: eq(contractFolder.parentId, currentFolder.parentId)
    });
    
    if (siblings.length > 0) {
      // Determine the isCopy status for the parent based on siblings
      let parentIsCopy = 0;
      if (siblings.some(s => (s.isCopy ?? 0) === 0)) {
        parentIsCopy = 0;
      } else if (siblings.some(s => (s.isCopy ?? 0) === 2)) {
        parentIsCopy = 2;
      } else if (siblings.every(s => (s.isCopy ?? 0) === 1)) {
        parentIsCopy = 1;
      }
      
      // Update the parent folder's isCopy status
      await db.update(contractFolder).set({
        isCopy: parentIsCopy,
        updatedAt: new Date(),
      }).where(eq(contractFolder.id, currentFolder.parentId));
      
      // Recursively update all ancestors
      await updateParentFoldersIsCopyStatus(currentFolder.parentId);
    }
  }
}

interface UploadMultipleFilesToFolderInput {
  folderId: string
  files: UploadedFile[]
  note?: string
}

/**
 * Get the depth 0 (root assessment) folder ID for a given folder by traversing up the hierarchy
 * @param folderId The folder ID to start from
 * @returns The depth 0 folder ID, or the original folderId if already at depth 0
 */
async function getDepth0FolderId(folderId: string): Promise<string> {
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  })

  if (!folder) {
    return folderId
  }

  // If already depth 0, return this folder's ID
  if (folder.depth === 0) {
    return folderId
  }

  // Otherwise, traverse up to find the depth 0 folder
  let currentFolder = folder
  while (currentFolder?.depth != null && currentFolder.depth > 0 && currentFolder.parentId) {
    const parentFolder = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, currentFolder.parentId)
    })
    if (!parentFolder) {
      // If we can't find parent, return current folder ID
      return currentFolder.id
    }
    currentFolder = parentFolder
  }

  return currentFolder.id
}

interface GenerateApprovedEvaluationsInput {
  contractId: string
}

interface EvaluationExportResult {
  folderId: string
  folderName: string
  isFullyApproved: boolean
  success: boolean
  fileName?: string
  filePath?: string
  url?: string
  error?: string
  regenerated?: boolean
}

/**
 * Generate evaluation documents from all approved PB/PA folders for a contract
 * This function:
 * 1. Finds all PB and PA assessment folders for the contract
 * 2. Checks which ones are fully approved (isFullyApproved = true)
 * 3. Exports the approved evaluations as PDF files
 * 4. Saves them to the "DOKUMEN EVALUASI" folder
 * @param input GenerateApprovedEvaluationsInput
 * @returns Object with results of the export operations
 */
export async function generateApprovedEvaluations(input: GenerateApprovedEvaluationsInput) {
  const { contractId } = input

  // Verify contract exists
  const existingContract = await db.query.contract.findFirst({
    where: eq(contract.id, contractId)
  })

  if (!existingContract) {
    throw new Error(`Contract with ID ${contractId} not found`)
  }

  // Get or create the "DOKUMEN EVALUASI" folder
  const evaluasiFolder = await getOrCreateEvaluasiFolder(contractId)

  if (!evaluasiFolder) {
    throw new Error(`Failed to create or find "DOKUMEN EVALUASI" folder`)
  }

  // Get all PB and PA assessment folders for this contract (depth 0 folders)
  // Note: depth is a generated column in PostgreSQL (nlevel(path) - 1), so we use path comparison
  // For depth 0 folders, path = folder_id (single-level ltree)
  const assessmentFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, or }) =>
      and(
        eq(fields.contractId, contractId),
        eq(fields.fileType, 'folder'),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA')
        )
      )
  })
  
  // Filter to only include depth 0 folders (path = id in ltree)
  const depth0AssessmentFolders = assessmentFolders.filter(f => f.path === f.id)

  const results: EvaluationExportResult[] = []

  // Process each assessment folder
  for (const folder of depth0AssessmentFolders) {
    try {
      // Get approval status for this folder
      const approvalSummary = await getApprovalSummary(folder.id)

      // Check if fully approved
      if (!approvalSummary.isFullyApproved) {
        results.push({
          folderId: folder.id,
          folderName: folder.name,
          isFullyApproved: false,
          success: false,
          error: 'Folder is not fully approved yet'
        })
        continue
      }

      // Check if folder is marked as complete and final - if so, always generate/regenerate the file
      const forceRegenerate = folder.isComplete && folder.isFinal;

      // Check if this evaluation already exists in the evaluasi folder
      // First, determine what the expected filename would be
      const typeMatch = folder.name.match(/-\s*(PB|PA)\s*$/);
      const assessmentType = typeMatch ? (typeMatch[1] === 'PB' ? 'Penilaian Berjalan' : 'Penilaian Akhir') : '';
      const dateMatch = folder.name.match(/^([\d-]+)/);
      const dateStr = dateMatch ? dateMatch[1] : '';
      const expectedFilename = `Hasil Evaluasi - ${assessmentType} - ${dateStr}.pdf`;
      
      const existingFiles = await db.query.contractFolder.findMany({
        where: (fields, { eq, and }) =>
          and(
            eq(fields.parentId, evaluasiFolder.id),
            eq(fields.name, expectedFilename) // Exact match on expected filename
          )
      })

      // If already exported, check if regeneration is needed
      if (existingFiles.length > 0) {
        if (forceRegenerate) {
          // If forceRegenerate is true, delete all existing files first
          for (const existingFile of existingFiles) {
            try {
              const oldFileDir = uploadsPath(
                'csms',
                'contracts',
                'final',
                contractId,
                evaluasiFolder.id,
                existingFile.id
              );
              await fs.rm(oldFileDir, { recursive: true, force: true });
              await db.delete(contractFolder).where(eq(contractFolder.id, existingFile.id));
            } catch (err) {
              // Continue even if deletion fails
            }
          }
        } else {
          // Check if regeneration is needed based on update timestamps
          const existingFile = existingFiles[0];
          
          // Check if there are updates that require regeneration
          // 1. Check if folder has been updated after the existing file was created
          const folderUpdatedAt = folder.assessmentDate || folder.updatedAt;
          const fileCreatedAt = existingFile.createdAt;
          
          // 2. Check if there are new approvals after the existing file was created
          const approvalLogs = await db.query.approvalLog.findMany({
            where: eq(approvalLog.folderId, folder.id),
            orderBy: [asc(approvalLog.updatedAt)],
          });
          
          // Get the latest approval update
          let latestApprovalUpdatedAt: Date | null = null;
          if (approvalLogs.length > 0) {
            const lastApproval = approvalLogs[approvalLogs.length - 1];
            latestApprovalUpdatedAt = lastApproval.updatedAt;
          }
          
          // Determine if regeneration is needed - compare against file's CREATED timestamp
          const needsRegeneration = 
            (folderUpdatedAt && fileCreatedAt && folderUpdatedAt > fileCreatedAt) ||
            (latestApprovalUpdatedAt && fileCreatedAt && latestApprovalUpdatedAt > fileCreatedAt);
          
          if (!needsRegeneration) {

            // But clean up any duplicate files if there are multiple
            if (existingFiles.length > 1) {
              for (let i = 1; i < existingFiles.length; i++) {
                const duplicateFile = existingFiles[i];
                try {
                  const duplicateFileDir = uploadsPath(
                    'csms',
                    'contracts',
                    'final',
                    contractId,
                    evaluasiFolder.id,
                    duplicateFile.id
                  );
                  await fs.rm(duplicateFileDir, { recursive: true, force: true });
                  await db.delete(contractFolder).where(eq(contractFolder.id, duplicateFile.id));
                } catch (err) {
                }
              }
            }
            
            continue;
          }
          
          // Delete the old physical file from disk
          const oldFileDir = uploadsPath(
            'csms',
            'contracts',
            'final',
            contractId,
            evaluasiFolder.id,
            existingFile.id
          );
          try {
            await fs.rm(oldFileDir, { recursive: true, force: true });
          } catch (err) {
          }

          // Delete the old database record
          await db.delete(contractFolder).where(eq(contractFolder.id, existingFile.id));
        }
      }

      // Export the evaluation as PDF
      const exportResult = await exportEvaluasiToPDF({ contractId, folderId: folder.id })

      if (!exportResult) {
        results.push({
          folderId: folder.id,
          folderName: folder.name,
          isFullyApproved: true,
          success: false,
          error: 'Failed to generate PDF'
        })
        continue
      }

      // Create the file record in the database
      const renamed = getTimestampFilename(exportResult.filename)
      const newFileIsCopy = ((evaluasiFolder.isCopy ?? 0) === 1 || (evaluasiFolder.isCopy ?? 0) === 2) ? 2 : 0;

      const [newFile] = await db.insert(contractFolder).values({
        contractId: contractId,
        parentId: evaluasiFolder.id,
        name: exportResult.filename,
        description: `Exported evaluation for ${folder.name}`,
        path: sql`''::ltree`,
        fileType: 'file',
        filePath: '',
        isComplete: true,
        isCopy: newFileIsCopy,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning()

      // Update the path with the correct value
      const filePath = evaluasiFolder.path ? `${evaluasiFolder.path}.${newFile.id}` : newFile.id

      // Save the PDF file
      const fileUploadPath = uploadsPath(
        'csms',
        'contracts',
        'final',
        contractId,
        evaluasiFolder.id,
        newFile.id
      )

      await fs.mkdir(fileUploadPath, { recursive: true })

      const savedFilePath = path.resolve(fileUploadPath, renamed)
      await fs.writeFile(savedFilePath, exportResult.pdfBuffer)

      // Update the file record with the correct path
      await db.update(contractFolder).set({
        path: sql`${filePath}::ltree`,
        filePath: renamed,
        updatedAt: new Date(),
        isComplete: true,
      }).where(eq(contractFolder.id, newFile.id))

      results.push({
        folderId: folder.id,
        folderName: folder.name,
        isFullyApproved: true,
        success: true,
      })
    } catch (error: any) {
      results.push({
        folderId: folder.id,
        folderName: folder.name,
        isFullyApproved: true,
        success: false,
        error: error.message || 'Failed to export evaluation'
      })
    }
  }

  // Update the completion status of the evaluasi folder
  const isComplete = await areAllChildrenComplete(evaluasiFolder.id)
  await updateFolderCompletionStatus(evaluasiFolder.id, isComplete)

  // Update the evaluasi folder's isCopy status based on its children
  const children = await db.query.contractFolder.findMany({
    where: eq(contractFolder.parentId, evaluasiFolder.id)
  })

  if (children.length > 0) {
    let folderIsCopy = 0;
    if (children.some(c => (c.isCopy ?? 0) === 0)) {
      folderIsCopy = 0;
    } else if (children.some(c => (c.isCopy ?? 0) === 2)) {
      folderIsCopy = 2;
    } else if (children.every(c => (c.isCopy ?? 0) === 1)) {
      folderIsCopy = 1;
    }

    await db.update(contractFolder).set({
      isCopy: folderIsCopy,
      updatedAt: new Date(),
    }).where(eq(contractFolder.id, evaluasiFolder.id));
  }

  const successfulExports = results.filter(r => r.success)
  const failedExports = results.filter(r => !r.success)

  return {
    success: successfulExports.length > 0,
    message: failedExports.length > 0
      ? `Generated ${successfulExports.length} evaluations, ${failedExports.length} failed (some folders may not be approved yet)`
      : `Successfully generated ${successfulExports.length} evaluation documents`,
    data: {
      results,
      totalAssessmentFolders: assessmentFolders.length,
      fullyApprovedFolders: results.filter(r => r.isFullyApproved).length,
      exportedFiles: successfulExports.length
    },
    evaluasiFolderId: evaluasiFolder.id
  }
}

interface UploadEvaluationDocumentsInput {
  contractId: string
  files?: UploadedFile[]
  note?: string
}

/**
 * Upload evaluation documents to the "DOKUMEN EVALUASI" folder for a contract
 * This is used for uploading final evaluation documents that combine all PB and PA assessments
 * @deprecated Use generateApprovedEvaluations instead - this now automatically generates from approved PB/PA folders
 * @param input UploadEvaluationDocumentsInput
 * @returns Object with success status and file information for all uploaded files
 */
export async function uploadEvaluationDocuments(input: UploadEvaluationDocumentsInput) {
  // This function is deprecated - redirect to generateApprovedEvaluations
  return generateApprovedEvaluations({ contractId: input.contractId })
}

/**
 * Upload multiple files to a specific contract folder
 * @param input UploadMultipleFilesToFolderInput
 * @returns Object with success status and file information for all uploaded files
 */
export async function uploadMultipleFilesToContractFolder(input: UploadMultipleFilesToFolderInput) {
  const { folderId, files, note = '' } = input

  // Verify folder exists
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId)
  })

  if (!folder) {
    throw new Error(`Folder with ID ${folderId} not found`)
  }

  // Check if root assessment folder is already finalized
  const depth0FolderId = await getDepth0FolderId(folderId)
  const rootFolder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, depth0FolderId)
  })

  if (rootFolder && rootFolder.isFinal) {
    throw new Error("Folder penilaian sudah difinalisasi. Berkas tidak dapat ditambahkan atau diubah.")
  }

  // Prevent uploading directly to parent structure folders that should only hold subfolders
  if (folder.name === 'A. RENCANA K3LL' || /^[3-8]\s/.test(folder.name)) {
    throw new Error("File tidak dapat diunggah langsung ke folder induk elemen. Silakan unggah ke dalam subfolder terkait.")
  }

  const results = [];
  
  // Process each file upload
  for (const fileData of files) {
    try {
      // Instead of updating the existing folder, create a new child item (file) under that folder
      const contractId = folder.contractId
      
      // Process file upload
      const renamed = getTimestampFilename(fileData.filename)

      // Determine new file's isCopy status
      const newFileIsCopy = ((folder.isCopy ?? 0) === 1 || (folder.isCopy ?? 0) === 2) ? 2 : 0;

      // Create a new file record as a child of the folder (ID will be auto-generated by database)
      const [newFile] = await db.insert(contractFolder).values({
        contractId: contractId, // Using the extracted contractId variable
        parentId: folderId,
        name: fileData.filename,
        description: note,
        path: sql`''::ltree`, // Temporary empty path, will update after getting the ID
        fileType: 'file', // Set fileType to 'file' instead of the MIME type
        filePath: '', // Temporary empty path, will update after getting the ID
        isComplete: true, // Files are always complete once uploaded
        isCopy: newFileIsCopy, // New uploaded files are 2 if parent is copy, 0 otherwise
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning()

      // Now update the path and filePath with the correct values using the generated ID
      const filePath = folder.path ? `${folder.path}.${newFile.id}` : newFile.id
      // Get the depth 0 folder ID to use in the upload path instead of contractId
      const depth0FolderId = await getDepth0FolderId(folderId)
      const fileUploadPath = uploadsPath('csms', 'contracts', contractId, depth0FolderId, newFile.id)
      const thumbnailFolder = path.resolve(fileUploadPath, 'thumbnail')
      
      await fs.mkdir(fileUploadPath, { recursive: true })
      await fs.mkdir(thumbnailFolder, { recursive: true })

      // Save file
      const savedFilePath = path.resolve(fileUploadPath, renamed)
      await fs.writeFile(savedFilePath, fileData.buffer)

      // Generate thumbnail for images
      if (fileData.mimetype.startsWith('image/')) {
        const thumbPath = path.resolve(thumbnailFolder, renamed)
        await sharp(fileData.buffer).resize(300).jpeg({ quality: 70 }).toFile(thumbPath)
      }

      // Update the file record with the correct path and filePath
      await db.update(contractFolder).set({
        path: sql`${filePath}::ltree`,
        filePath: renamed, // Store only the renamed filename, not the full path
        updatedAt: new Date(),
        isComplete: true, // Ensure the file is marked as complete
      }).where(eq(contractFolder.id, newFile.id))

      // Since we just uploaded a file to this folder, check if all children are now complete
      // Update the completion status of the folder where the file was uploaded
      // Get the folder to determine its type
      const updatedFolder = await db.query.contractFolder.findFirst({
        where: eq(contractFolder.id, folderId)
      });
      
      let isComplete = false;
      
      if (updatedFolder) {
        // Check if this is an assessment folder (PB or PA or PSB)
        const isAssessmentFolder = updatedFolder.name.endsWith(' - PB') || 
                                  updatedFolder.name.endsWith(' - PA') || 
                                  updatedFolder.name.endsWith(' - PSB');
        
        if (isAssessmentFolder) {
          // For assessment folders, use isFolderStructureComplete
          isComplete = await isFolderStructureComplete(folderId);
        } else {
          // For regular folders, check if all children are complete
          // If it's part of K3LL structure, use isK3LLFolderComplete, otherwise use areAllChildrenComplete
          const isK3LLFolder = updatedFolder.name === 'A. RENCANA K3LL' || 
                              /^([1-8])\s/.test(updatedFolder.name) ||  // Numbered K3LL folders (1, 2, 3, etc.)
                              /^([1-8])\.(\d+)/.test(updatedFolder.name); // Sub-numbered K3LL folders (1.1, 1.2, etc.)
          
          if (isK3LLFolder) {
            isComplete = await isK3LLFolderComplete(folderId);
          } else {
            isComplete = await areAllChildrenComplete(folderId);
          }
        }
      }
      
      await updateFolderCompletionStatus(folderId, isComplete);

      // Update the completion status of all parent folders
      await updateAllParentFoldersCompletionStatus(folderId);
      
      // Update the parent folder's isCopy status based on all its children
      // If all children have isCopy: true, then the folder is also a copy
      const children = await db.query.contractFolder.findMany({
        where: eq(contractFolder.parentId, folderId)
      });
      
      // If there are no children, keep the original isCopy value
      if (children.length > 0) {
        // Determine the isCopy status for the folder based on its children
        let folderIsCopy = 0;
        if (children.some(c => (c.isCopy ?? 0) === 0)) {
          folderIsCopy = 0;
        } else if (children.some(c => (c.isCopy ?? 0) === 2)) {
          folderIsCopy = 2;
        } else if (children.every(c => (c.isCopy ?? 0) === 1)) {
          folderIsCopy = 1;
        }
        
        await db.update(contractFolder).set({
          isCopy: folderIsCopy,
          updatedAt: new Date(),
        }).where(eq(contractFolder.id, folderId));
      }
      
      // Update all parent folders up the hierarchy to reflect the correct isCopy status
      await updateParentFoldersIsCopyStatus(folderId);

      results.push({
        success: true,
        fileName: fileData.filename,
        filePath: renamed, // Return only the renamed filename
        folderId: newFile.id, // Return the new file's ID as it acts as a folder now
        fileType: 'file' // Return 'file' instead of the MIME type
      });
    } catch (error: any) {
      results.push({
        success: false,
        fileName: fileData.filename,
        error: error.message || 'Failed to upload file'
      });
    }
  }

  const successfulUploads = results.filter(result => result.success);
  const failedUploads = results.filter(result => !result.success);

  return {
    success: successfulUploads.length > 0,
    message: failedUploads.length > 0 
      ? `Uploaded ${successfulUploads.length} files, ${failedUploads.length} failed` 
      : `Successfully uploaded ${successfulUploads.length} files`,
    data: {
      successfulUploads,
      failedUploads
    }
  }
}
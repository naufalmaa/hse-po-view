import { uploadSmartCardObservations } from './upload.service.ts';
import { saveUploadHistory } from './uploadHistory.service.ts';
import { cleanupTempFile } from './excelUtils.ts';
import path from 'path';
import fs from 'fs/promises';

export interface UploadFileResult {
  filename: string;
  status: 'success' | 'error';
  uploadHistoryId?: string;
  summary?: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    skippedRows: number;
    insertedRows: number;
  };
  error?: string;
}

export interface ProcessUploadResult {
  success: boolean;
  message: string;
  results: UploadFileResult[];
  hasErrors: boolean;
}

export interface FilePart {
  type: string;
  filename?: string;
  mimetype?: string;
  toBuffer: () => Promise<Buffer>;
}

export async function processFileUpload(parts: AsyncIterable<FilePart>, userId: string): Promise<ProcessUploadResult> {
  const uploadResults: UploadFileResult[] = [];
  let hasErrors = false;

  try {
    for await (const part of parts) {
      if (part.type === 'file') {
        if (!part.filename || !part.mimetype) {
          uploadResults.push({
            filename: part.filename || 'unknown',
            status: 'error',
            error: 'Invalid file upload',
          });
          hasErrors = true;
          continue;
        }

        // Validate file type
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ];

        if (!allowedTypes.includes(part.mimetype)) {
          const errorMessage = 'Invalid file type. Please upload an Excel file (.xlsx or .xls)';
          
          uploadResults.push({
            filename: part.filename,
            status: 'error',
            error: errorMessage,
          });
          
          // Save validation error to history
          await saveUploadHistory({
            userId,
            filename: part.filename,
            status: 'error',
            errorMessage,
            hasErrors: true,
          });
          
          hasErrors = true;
          continue;
        }

        // Process this file
        try {
          const buffer = await part.toBuffer();
          
          // Validate buffer size
          if (buffer.length === 0) {
            uploadResults.push({
              filename: part.filename,
              status: 'error',
              error: 'Uploaded file is empty',
            });
            hasErrors = true;
            continue;
          }
          
          if (buffer.length > 100 * 1024 * 1024) { // 100MB limit
            uploadResults.push({
              filename: part.filename,
              status: 'error',
              error: 'File too large. Maximum size is 100MB',
            });
            hasErrors = true;
            continue;
          }

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.resolve(process.cwd(), '../uploads', 'smartcards');
          await fs.mkdir(uploadsDir, { recursive: true });

          const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
          const tempFileName = `${timestamp}-${part.filename}`;
          const tempFilePath = path.resolve(uploadsDir, tempFileName);

          // Write and process file
          await fs.writeFile(tempFilePath, buffer);
          
          try {
            const result = await uploadSmartCardObservations(tempFilePath, part.filename, userId);
            
            // Clean up temp file
            await cleanupTempFile(tempFilePath);
            
            const uploadResult = {
              filename: part.filename,
              status: 'success' as const,
              uploadHistoryId: result.uploadHistoryId, // Include upload history ID
              summary: result.summary,
            };
            
            uploadResults.push(uploadResult);
            
            // Mark as having errors if there are processing errors
            if (result.summary.errorRows > 0) {
              hasErrors = true;
            }
            
          } catch (processingError) {
            // Clean up temp file on processing error
            await cleanupTempFile(tempFilePath);
            
            const errorMessage = processingError instanceof Error ? processingError.message : 'Processing failed';
            
            const uploadResult = {
              filename: part.filename,
              status: 'error' as const,
              error: errorMessage,
            };
            
            uploadResults.push(uploadResult);
            
            // Save failed upload to history
            await saveUploadHistory({
              userId,
              filename: part.filename,
              status: 'error',
              errorMessage,
              hasErrors: true,
            });
            
            hasErrors = true;
          }
          
        } catch (bufferError: any) {
          // Handle specific stream errors
          let errorMessage = 'Failed to read uploaded file';
          if (bufferError.code === 'ERR_STREAM_PREMATURE_CLOSE' || 
              bufferError.message?.includes('Premature close') ||
              bufferError.message?.includes('premature close')) {
            errorMessage = 'File upload was interrupted';
          }
          
          uploadResults.push({
            filename: part.filename,
            status: 'error',
            error: errorMessage,
          });
          hasErrors = true;
        }
      }
    }
  } catch (streamError) {
    throw new Error('Failed to process upload stream. Please try uploading again.');
  }

  // Check if any files were processed
  if (uploadResults.length === 0) {
    throw new Error('No files uploaded');
  }

  // Generate summary message
  const successCount = uploadResults.filter(r => r.status === 'success').length;
  const errorCount = uploadResults.filter(r => r.status === 'error').length;
  
  let message = `Upload completed: ${successCount} successful`;
  if (errorCount > 0) {
    message += `, ${errorCount} failed`;
  }
  if (hasErrors) {
    message += '. Check error validation page for details.';
  }

  return {
    success: true,
    message,
    results: uploadResults,
    hasErrors,
  };
}
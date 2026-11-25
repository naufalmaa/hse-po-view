import type { UploadedFile } from '../../types/file.ts';

/**
 * Process multipart form data to extract fields and files
 * @param parts - The multipart parts iterator from Fastify
 * @returns Object containing rawFields and filesMap
 */
export async function handleMultipartUpload(parts: AsyncIterableIterator<any>) {
  const rawFields: Record<string, any> = {};
  const filesMap: Record<string, UploadedFile[]> = {};

  for await (const part of parts) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer();
      const file: UploadedFile = {
        buffer,
        filename: part.filename,
        mimetype: part.mimetype,
      };
      if (!filesMap[part.fieldname]) filesMap[part.fieldname] = [];
      filesMap[part.fieldname].push(file);
    } else if (part.type === 'field') {
      try {
        const val = part.value;
        const isJson = typeof val === 'string' && ['{', '['].includes(val.trim()[0]);
        rawFields[part.fieldname] = isJson ? JSON.parse(val) : val;
      } catch {
        rawFields[part.fieldname] = part.value;
      }
    }
  }

  return { rawFields, filesMap };
}

/**
 * Extract uploaded files based on the entry structure
 * @param entry - Entry containing file references
 * @param filesMap - Map of uploaded files
 * @returns Array of uploaded files
 */
export function extractUploadedFiles(
  entry: { files?: { file: string }[] } | undefined,
  filesMap: Record<string, UploadedFile[]>
): UploadedFile[] {
  if (!entry?.files?.length) return [];
  
  return entry.files
    .map((f) => filesMap[f.file])
    .filter(Boolean)
    .flat();
}

/**
 * Process certificates with their associated files
 * @param certificates - Certificate data
 * @param filesMap - Map of uploaded files
 * @returns Processed certificate data with files
 */
export function processCertificatesWithFiles(
  certificates: any,
  filesMap: Record<string, UploadedFile[]>
) {
  if (certificates && typeof certificates === 'object') {
    const { files: certFiles, ...certData } = certificates;
    const relatedFiles: UploadedFile[] = [];

    if (Array.isArray(certFiles)) {
      for (const f of certFiles) {
        const group = filesMap[f.file];
        if (Array.isArray(group)) relatedFiles.push(...group);
      }
    }

    return {
      ...certData,
      files: relatedFiles,
    };
  }
  
  return undefined;
}
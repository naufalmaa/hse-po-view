import config from "../config/env.config.ts";

export function getFullDocumentFileUrl(randomId: string, file: string): string {
  const baseUrl = (config.server.baseUrl || "").replace(/\/+$/, "");
  return `${baseUrl}/api/document/user/file/${randomId}/${file}`;
}

export function transformDocumentFileUpload(item: any): any {
  if (!item || !item.fileUpload) return item;

  const newFileUpload: Record<string, string[]> = {};
  for (const [key, files] of Object.entries(item.fileUpload)) {
    if (Array.isArray(files)) {
      newFileUpload[key] = files.map((file: string) => {
        return getFullDocumentFileUrl(item.randomId, file);
      });
    }
  }
  item.fileUpload = newFileUpload;
  return item;
}

export function getFullContractFileUrl(fileId: string, filename: string): string {
  const baseUrl = (config.server.baseUrl || "").replace(/\/+$/, "");
  return `${baseUrl}/api/v1/user/csms/contract/file/${fileId}`;
}

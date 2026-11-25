import { db } from "../../../db/index.ts";
import { contract } from "../../../db/schema/csms.schema.ts";
import { subContractors } from "../../../db/schema/auth.schema.ts";
import { eq } from "drizzle-orm";
import { buildDeskripsi, dedupeByElementNumber, formatNoteCellHtml, isExportableK3LLFolder } from "./export-catatan-perbaikan.rules.ts";
import path from "path";
import fs from "fs/promises";
import { uploadsPath } from "../../../config/env.config.ts";

/**
 * Parse note content to extract Deskripsi ketidaksesuaian and Tindakan perbaikan
 */
function parseNoteContent(note: string | null): { deskripsi: string; tindakan: string } {
  if (!note) {
    return { deskripsi: "", tindakan: "" };
  }

  // Normalize line breaks and clean up
  const normalized = note.replace(/\r\n/g, "\n").trim();
  
  // Try to find "Tindakan perbaikan" section
  const tindakanMatch = normalized.match(/Tindakan\s*perbaikan\s*:?\s*([\s\S]*?)$/i);
  const deskripsiMatch = normalized.match(/Deskripsi\s*ketidaksesuaian\s*:?\s*([\s\S]*?)(?=Tindakan\s*perbaikan|$)/i);
  
  let deskripsi = "";
  let tindakan = "";
  
  if (deskripsiMatch && deskripsiMatch[1]) {
    deskripsi = deskripsiMatch[1].trim();
  } else if (!tindakanMatch) {
    // If no structured format, use the whole note as deskripsi
    deskripsi = normalized.replace(/^Catatan\s*/i, "").trim();
  }
  
  if (tindakanMatch && tindakanMatch[1]) {
    tindakan = tindakanMatch[1].trim();
  }
  
  return { deskripsi, tindakan };
}

export interface CatatanPerbaikanItem {
  folderId: string;
  folderName: string;
  deskripsiKetidaksesuaian: string;
  tindakanPerbaikan: string;
  targetPenyelesaian: string;
  pic: string;
  status: "OPEN" | "CLOSE";
  tanggalPenyelesaian: string;
  buktiRemarks: string;
  depth: number;
  fileType: string;
  /** inside "A. RENCANA K3LL" (used to pick one row when a period holds an element number twice) */
  underRencana?: boolean;
}

export interface CatatanPerbaikanData {
  contractId: string;
  contractTitle: string;
  contractNumber: string;
  contractorName: string;
  auditorName: string;
  generatedDate: Date;
  folderName: string;
  improvementItems: CatatanPerbaikanItem[];
  totalRevisionItems: number;
  auditorSignatures?: string[];
  assessmentDate?: Date | string | null;
}

/**
 * Get improvement/revision notes for a specific folder (depth 0) within a contract
 */
export async function getCatatanPerbaikanData(contractId: string, folderId: string, auditorName = ""): Promise<CatatanPerbaikanData | null> {
  // Get contract details
  const contractData = await db.query.contract.findFirst({
    where: eq(contract.id, contractId),
  });

  if (!contractData) {
    return null;
  }

  // Get contractor details
  const contractor = await db.query.subContractors.findFirst({
    where: eq(subContractors.id, contractData.contractorId),
  });

  if (!contractor) {
    return null;
  }

  // Get the specific root folder (depth 0)
  const rootFolder = await db.query.contractFolder.findFirst({
    where: (cf, { eq, and }) => and(eq(cf.id, folderId), eq(cf.contractId, contractId), eq(cf.depth, 0)),
  });

  if (!rootFolder) {
    return null;
  }

  // If no auditorName was provided, try to get auditors from the root folder's userId array
  let finalAuditorName = auditorName;
  if (!auditorName && Array.isArray(rootFolder.userId) && rootFolder.userId.length > 0) {
    // Fetch user names for the userIds in the root folder
    const userRecords = await db.query.users.findMany({
      where: (fields, { inArray }) => rootFolder.userId && rootFolder.userId.length > 0 
        ? inArray(fields.id, rootFolder.userId)
        : eq(fields.id, '00000000-0000-0000-0000-000000000000'), // dummy condition that returns no results
      columns: {
        id: true,
        name: true
      }
    });
    
    // Join user names with " & " separator
    if (userRecords.length > 0) {
      finalAuditorName = userRecords.map(user => user.name).join(" & ");
    }
  }

  // Fetch auditor signatures
  let auditorSignatures: string[] = [];
  const getSignatureBase64 = async (userId: string, signature: string | null): Promise<string | undefined> => {
    if (!signature) return undefined;
    try {
      const signaturePath = uploadsPath('users', userId, signature);
      const buffer = await fs.readFile(signaturePath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(signature).toLowerCase();
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      if (ext === '.gif') mimeType = 'image/gif';
      if (ext === '.webp') mimeType = 'image/webp';
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      return undefined;
    }
  };

  if (rootFolder.userId && Array.isArray(rootFolder.userId) && rootFolder.userId.length > 0) {
    for (const auditorId of rootFolder.userId) {
      if (!auditorId) continue;
      const auditor = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, auditorId as string),
      });
      if (auditor && auditor.signature) {
        const sig = await getSignatureBase64(auditor.id, auditor.signature);
        if (sig) {
          auditorSignatures.push(sig);
        }
      }
    }
  }

  // Get all folders that are children of this root folder
  const allFolders = await db.query.contractFolder.findMany({
    where: (cf, { eq }) => eq(cf.contractId, contractId),
  });

  // Get all descendants of the root folder
  const getDescendants = (parentId: string): string[] => {
    const children = allFolders.filter((f) => f.parentId === parentId).map((f) => f.id);
    return [parentId, ...children.flatMap((childId) => getDescendants(childId))];
  };

  const descendantIds = getDescendants(folderId);
  
  const folderById = new Map(allFolders.map((f) => [f.id, f]));
  const isUnderRencana = (f: { parentId: string | null }): boolean => {
    let parent = f.parentId ? folderById.get(f.parentId) : undefined;
    for (let guard = 0; parent && guard < 50; guard++) {
      if (parent.name === 'A. RENCANA K3LL') return true;
      parent = parent.parentId ? folderById.get(parent.parentId) : undefined;
    }
    return false;
  };

  // Include only allowed K3LL folders that are descendants
  const improvementItems: CatatanPerbaikanData['improvementItems'] = allFolders
    .filter((f) => {
      // Must be a descendant
      if (!descendantIds.includes(f.id)) return false;
      // If it's a folder, it must be "A. RENCANA K3LL" or a numbered K3LL element (matched by number, not exact name)
      if (f.fileType === "folder") {
        return isExportableK3LLFolder(f.name);
      }
      return true;
    })
    .map((folder) => {
      const parsed = parseNoteContent(folder.note);
      return {
        folderId: folder.id,
        folderName: folder.name,
        // User note (PHE) first, then the contractor note, in the same cell
        deskripsiKetidaksesuaian: buildDeskripsi(parsed.deskripsi, folder.noteContractor),
        tindakanPerbaikan: parsed.tindakan,
        targetPenyelesaian: "",
        pic: contractor.name,
        status: folder.status === "accept" ? "CLOSE" as const : "OPEN" as const,
        tanggalPenyelesaian: "",
        buktiRemarks: "",
        depth: folder.depth ?? 0,
        fileType: folder.fileType ?? "folder",
        underRencana: isUnderRencana(folder),
      };
    })
    .sort((a, b) => {
      // Sort by depth first (shallow first)
      const depthDiff = a.depth - b.depth;
      if (depthDiff !== 0) return depthDiff;
      // Then by status (OPEN first)
      if (a.status === "OPEN" && b.status !== "OPEN") return -1;
      if (b.status === "OPEN" && a.status !== "OPEN") return 1;
      return 0;
    });

  return {
    contractId,
    contractTitle: contractData.title,
    contractNumber: contractData.numberContract,
    contractorName: contractor.name,
    auditorName: finalAuditorName,
    generatedDate: new Date(),
    folderName: rootFolder.name,
    improvementItems,
    totalRevisionItems: improvementItems.filter((i) => i.status === "OPEN").length,
    auditorSignatures,
    assessmentDate: (() => {
      let date = rootFolder.assessmentDate;
      if (!date && rootFolder.name) {
        // Extract date part before " - PB" or " - PA" (format: "17-07-2023 - PB" -> "17-07-2023")
        const match = rootFolder.name.match(/^([\d\-]+)/);
        if (match) {
          // Convert dd-mm-yyyy to Date
          const parts = match[1].split("-");
          if (parts.length === 3) {
            const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-mm-dd
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate;
            }
          }
        }
      }
      return date || contractData.finalAssessmentDate;
    })(),
  };
}

/**
 * Generate HTML for Catatan Perbaikan (Improvement Notes) PDF
 * Format: FORM MONITORING TINDAK LANJUT PB
 */
export async function generateCatatanPerbaikanHTML(catatanData: CatatanPerbaikanData): Promise<string> {
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const displayDate = catatanData.assessmentDate || catatanData.generatedDate;

  // Format bullet content to display each "-" item on a new line with proper spacing
  // escaped, line breaks kept (see export-catatan-perbaikan.rules.ts)
  const formatBulletContent = (content: string): string => formatNoteCellHtml(content);

  // Extract folder number from folder name (e.g., "6.4 Investigasi..." -> "6.4")
  const extractFolderNumber = (folderName: string): string => {
    const match = folderName.match(/^([\d.]+)/);
    return match ? match[1] : folderName;
  };

  // Check if folder number has decimal (e.g., "3.1" has decimal, "3" does not)
  const hasDecimalNumber = (folderName: string): boolean => {
    const num = extractFolderNumber(folderName);
    return num.includes(".");
  };

  // Check if a folder has children in the list
  const hasChildren = (folderName: string): boolean => {
    const folderNum = extractFolderNumber(folderName);
    // Check if any other item starts with this folder number followed by a dot
    return catatanData.improvementItems.some(item => {
      const itemNum = extractFolderNumber(item.folderName);
      return itemNum.startsWith(folderNum + ".");
    });
  };

  // Filter items:
  // 1. Exclude fileType "file"
  // 2. Exclude depth 0 (root assessment folder like "17-07-2023 - PB")
  // 3. Exclude "A. RENCANA K3LL" folder
  // 4. For parent folders (3, 4, 5, 6, 7, 8 without decimals that have children) - skip them
  // 5. Include ALL others: folders 1, 2, and all decimal folders (3.1, 4.2, etc.)
  const leafItems = dedupeByElementNumber(catatanData.improvementItems
    .filter(item => {
      // Exclude depth 0 (root folder)
      if (item.depth === 0) return false;
      // Exclude files
      if (item.fileType === "file") return false;
      // Exclude "A. RENCANA K3LL" folder
      if (item.folderName.startsWith("A.")) return false;
      
      // Always include items with decimals (3.1, 4.2, etc.)
      if (hasDecimalNumber(item.folderName)) return true;
      
      // For folders without decimals (1, 2, 3, 4, etc.):
      // Only EXCLUDE if they are parent categories (3-8) that have children
      const folderNum = extractFolderNumber(item.folderName);
      const isParentWithChildren = /^[3-8]$/.test(folderNum) && hasChildren(item.folderName);
      
      // Include if it's NOT a parent category with children (includes 1, 2, and standalone 3-8)
      return !isParentWithChildren;
    }))
    .sort((a, b) => {
      const numA = extractFolderNumber(a.folderName);
      const numB = extractFolderNumber(b.folderName);
      
      // Natural sort by numbers separated by dots
      const partsA = numA.split(".").map(p => parseInt(p, 10) || 0);
      const partsB = numB.split(".").map(p => parseInt(p, 10) || 0);
      
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const valA = partsA[i] || 0;
        const valB = partsB[i] || 0;
        if (valA !== valB) return valA - valB;
      }
      return 0;
    });

  // Render table rows - each folder item becomes its own row
  const renderTableRows = (): string => {
    let rows = "";

    for (const item of leafItems) {
      const folderNumber = extractFolderNumber(item.folderName);
      const deskripsi = item.deskripsiKetidaksesuaian?.trim() || "-";
      const tindakan = item.tindakanPerbaikan?.trim() || "-";
      
      // Determine status background color: OPEN = yellow, CLOSE = green
      const statusBgColor = item.status === "OPEN" ? "#FFFF00" : "#90EE90";
      
      rows += `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top;">${folderNumber}</td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
            ${deskripsi === "-" ? "-" : formatBulletContent(deskripsi)}
          </td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
            ${tindakan === "-" ? "-" : formatBulletContent(tindakan)}
          </td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top;"></td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: middle;">${item.pic || "-"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: middle; background-color: ${statusBgColor}; font-weight: bold;">${item.status || "-"}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; vertical-align: top;"></td>
          <td style="border: 1px solid #000; padding: 8px; vertical-align: top;"></td>
        </tr>
      `;
    }

    return rows;
  };

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8"/>
      <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
      <title>Form Monitoring Tindak Lanjut PB - ${catatanData.folderName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000;
          line-height: 1.4;
          background: white;
        }
        
        .container {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 30px 40px;
        }
        
        .document-header {
          text-align: right;
          margin-bottom: 30px;
          color:rgb(0, 0, 0);
          font-size: 12px;
        }
        
        .title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }
        
        .orange-bar {
          background:rgb(255, 193, 0);
          height: 20px;
          width: 100%;
          margin-bottom: 20px;
        }
        
        .auditor-info {
          margin-bottom: 25px;
        }
        
        .auditor-info p {
          margin: 2px 0;
          font-weight: bold;
          font-size: 11px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th {
          border: 1px solid #000;
          padding: 8px 5px;
          text-align: center;
          font-weight: normal;
          font-size: 10px;
          color: #000;
        }
        
        td {
          font-size: 10px;
          line-height: 1.5;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          color: #6B7280;
          font-size: 10px;
        }
        
        @media print {
          .container {
            padding: 15px;
          }
          
          body {
            font-size: 9px;
          }
          
          th, td {
            font-size: 9px;
            padding: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Document Header -->
        <div class="document-header">
          Lampiran 18 TKO PENGELOLAAN CSMS B8-004/PHE04000/2021-S9 Rev 01
        </div>
        
        <!-- Title -->
        <div class="title">
          FORM MONITORING TINDAK LANJUT PB
        </div>
        
        <!-- Orange Bar -->
        <div class="orange-bar"></div>
        
        <!-- Auditor Info -->
        <div class="auditor-info">
          <p>Auditor: ${catatanData.auditorName || "-"}</p>
          <p>Tanggal Penilaian: ${formatDate(displayDate)}</p>
        </div>
        
        <!-- Main Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 4%;">No</th>
              <th style="width: 22%;">Deskripsi ketidaksesuaian</th>
              <th style="width: 22%;">Tindakan perbaikan</th>
              <th style="width: 10%;">Target Penyelesaian</th>
              <th style="width: 6%;">PIC</th>
              <th style="width: 6%;">Status</th>
              <th style="width: 10%;">Tanggal Penyelesaian</th>
              <th style="width: 20%;">Bukti & Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${leafItems.length > 0 
              ? renderTableRows()
              : `<tr><td colspan="8" style="border: 1px solid #000; padding: 20px; text-align: center; color: #6B7280;">Tidak ada item perbaikan yang diperlukan</td></tr>`
            }
          </tbody>
        </table>
        
        <!-- Signature Section -->
        <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
          <!-- Left: Dibuat Oleh -->
          <div style="text-align: left; width: 45%;">
            <p style="font-weight: bold; margin-bottom: 5px;">Dibuat Oleh,</p>
            <p style="margin-bottom: 5px;">Jakarta, ${formatDate(displayDate)}</p>
            <div style="min-height: 60px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
              ${catatanData.auditorSignatures && catatanData.auditorSignatures.length > 0 
                ? catatanData.auditorSignatures.map((sig, idx) => {
                    // Adjust size if there are many auditors
                    const isMany = catatanData.auditorSignatures!.length > 2;
                    const maxWidth = isMany ? '80px' : '100px';
                    const maxHeight = isMany ? '45px' : '55px';
                    return `<img src="${sig}" alt="Auditor Signature ${idx + 1}" style="max-height: ${maxHeight}; max-width: ${maxWidth}; object-fit: contain;" />`;
                  }).join('')
                : '<div style="height: 60px;"></div>'}
            </div>
            <p style="font-weight: bold; margin-bottom: 5px;">${catatanData.auditorName || "_________________"}</p>
            <p>PHE OSES</p>
          </div>
          
          <!-- Right: Disetujui Oleh -->
          <div style="text-align: left; width: 45%;">
            <p style="font-weight: bold; margin-bottom: 5px;">Disetujui Oleh,</p>
            <p style="margin-bottom: 60px;">Jakarta, _________________</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold; margin-bottom: 5px;">_________________</p>
            <p>${catatanData.contractorName}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

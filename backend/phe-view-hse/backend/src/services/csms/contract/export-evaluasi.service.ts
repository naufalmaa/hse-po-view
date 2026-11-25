import { db } from "../../../db/index.ts";
import { contract } from "../../../db/schema/csms.schema.ts";
import { subContractors } from "../../../db/schema/auth.schema.ts";
import { eq } from "drizzle-orm";
import { getAllK3LLNames } from "./k3ll-structure.service.ts";
import path from "path";
import fs from "fs/promises";
import { uploadsPath } from "../../../config/env.config.ts";

export interface EvaluasiData {
  contractId: string;
  riskAssessmentId?: string;
  riskLevel?: string;
  contractTitle: string;
  contractNumber: string;
  contractorName: string;
  startDate: Date | string;
  endDate: Date | string;
  finalAssessmentDate: Date | string;
  overallScore: number;
  rootFolderName: string;
  assessmentLocation?: string;
  assessmentStatus?: string;
  assessmentFolders: {
    folderId: string;
    name: string;
    score: number;
    bobot: number;
    nilaiAkhir: number;
    status: string;
    depth: number;
    fileType: string;
    children?: any[];
  }[];
  evaluatorName?: string;
  evaluatorSignature?: string;
  evaluatorApprovedAt?: Date | string;
  verifikatorName?: string;
  auditorSignatures?: string[];
  verifikatorSignature?: string;
  verifikatorApprovedAt?: Date | string;
  managerName?: string;
  managerSignature?: string;
  managerApprovedAt?: Date | string;
  assessmentDate?: Date | string;
}

/**
 * Format date from evaluasi data (either from folder name or finalAssessmentDate)
 */
export function getFormattedAssessmentDate(evaluasiData: EvaluasiData): string {
  const formatDate = (date: Date | string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (evaluasiData.rootFolderName) {
    // Extract date part before " - PB" or " - PA" (format: "17-07-2023 - PB" -> "17-07-2023")
    const match = evaluasiData.rootFolderName.match(/^([\d\-]+)/);
    if (match) {
      // Convert dd-mm-yyyy to Date and format
      const parts = match[1].split("-");
      if (parts.length === 3) {
        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-mm-dd
        return formatDate(new Date(dateStr));
      }
      return match[1];
    }
  }
  return formatDate(evaluasiData.finalAssessmentDate);
}

/**
 * Get evaluation data for a specific folder (depth 0) within a contract
 */
export async function getEvaluasiData(contractId: string, folderId: string): Promise<EvaluasiData | null> {
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
  // Note: depth is a generated column in PostgreSQL, so we filter after query
  const allContractFolders = await db.query.contractFolder.findMany({
    where: (cf, { eq }) => eq(cf.contractId, contractId),
  });
  
  const rootFolder = allContractFolders.find(f => f.id === folderId && f.path === f.id) || null;

  if (!rootFolder) {
    return null;
  }

  // Use the same folders for building tree
  const allFolders = allContractFolders;

  // Get all K3LL names (including "A. RENCANA K3LL") for filtering
  const allowedK3LLNames = getAllK3LLNames();

  // Build nested structure for this folder and its children only
  const buildFolderTree = (parentId: string | null): any[] => {
    return allFolders
      .filter((f) => {
        // Must be a child of parentId
        if (f.parentId !== parentId) return false;
        // If it's a folder, it must be in the allowed K3LL structure
        if (f.fileType === "folder") {
          return allowedK3LLNames.has(f.name);
        }
        // Keep files for now (they will be skipped during HTML generation anyway)
        return true;
      })
      .map((folder) => {
        const children = buildFolderTree(folder.id);
        const score = folder.score ? parseFloat(folder.score.toString()) : 0;
        // Calculate bobot based on number of active siblings at same level (excluding N/A)
        const siblings = allFolders.filter((f) => {
          if (f.parentId !== parentId || f.fileType !== "folder") return false;
          const s = f.score ? parseFloat(f.score.toString()) : 0;
          return s !== -1;
        });
        const bobot = siblings.length > 0 ? siblings.length : 1;
        // Calculate nilaiAkhir (score / bobot)
        const nilaiAkhir = score === -1 ? -1 : score / bobot;
        
        return {
          folderId: folder.id,
          name: folder.name,
          score,
          bobot,
          nilaiAkhir,
          status: folder.status,
          depth: folder.depth,
          fileType: folder.fileType,
          children,
        };
      });
  };

  // Get approval logs for this folder to fetch approver names and signatures
  const approvalLogs = await db.query.approvalLog.findMany({
    where: (al, { eq }) => eq(al.folderId, folderId),
  });

  // Fetch user details for each approver
  let evaluatorName = undefined;
  let evaluatorSignature = undefined;
  let evaluatorApprovedAt = undefined;
  let verifikatorName = undefined;
  let auditorSignatures: string[] = [];
  let verifikatorSignature = undefined;
  let verifikatorApprovedAt = undefined;
  let managerName = undefined;
  let managerSignature = undefined;
  let managerApprovedAt = undefined;

  // Get auditor signatures from rootFolder.userId (contractFolder.userId array)
  const getSignatureBase64 = async (userId: string, signature: string | null): Promise<string | undefined> => {
    if (!signature) {
      return undefined;
    }
    
    try {
      const signaturePath = uploadsPath('users', userId, signature);
      
      const buffer = await fs.readFile(signaturePath);
      const base64 = buffer.toString('base64');
      
      // Determine mime type
      const ext = path.extname(signature).toLowerCase();
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      if (ext === '.gif') mimeType = 'image/gif';
      if (ext === '.webp') mimeType = 'image/webp';
      
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return dataUrl;
    } catch (error) {
      return undefined;
    }
  };

  // Fetch auditor signatures from rootFolder.userId
  if (rootFolder.userId && rootFolder.userId.length > 0) {
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

  // Get approval details from approval logs

  for (const log of approvalLogs) {
    const userId = log.userId;
    if (!userId) continue;
    
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId as string),
    });
    
    if (user) {
      if (log.approvalLevel === 'evaluator') {
        evaluatorName = user.name;
        evaluatorSignature = await getSignatureBase64(user.id, user.signature);
        evaluatorApprovedAt = log.updatedAt;
      } else if (log.approvalLevel === 'verifikator') {
        verifikatorName = user.name;
        verifikatorSignature = await getSignatureBase64(user.id, user.signature);
        verifikatorApprovedAt = log.updatedAt;
      } else if (log.approvalLevel === 'manager') {
        managerName = user.name;
        managerSignature = await getSignatureBase64(user.id, user.signature);
        managerApprovedAt = log.updatedAt;
      }
    }
  }

  // Determine assessment status based on folder name (PA = Final, PB = Interim)
  const isPenilaianAkhir = rootFolder.name.toUpperCase().includes("PA");
  const assessmentStatus = isPenilaianAkhir ? "Final" : "Interim";

  return {
    contractId,
    riskAssessmentId: contractData.riskAssessmentId || "-",
    riskLevel: contractData.riskLevel || "N/A",
    contractTitle: contractData.title,
    contractNumber: contractData.numberContract,
    contractorName: contractor.name,
    startDate: contractData.startDate as Date | string,
    endDate: contractData.endDate as Date | string,
    finalAssessmentDate: contractData.finalAssessmentDate as Date | string,
    overallScore: rootFolder.score ? parseFloat(rootFolder.score.toString()) : 0,
    rootFolderName: rootFolder.name,
    assessmentFolders: buildFolderTree(folderId),
    assessmentStatus,
    evaluatorName,
    evaluatorSignature,
    evaluatorApprovedAt,
    auditorSignatures,
    verifikatorName,
    verifikatorSignature,
    verifikatorApprovedAt,
    managerName,
    managerSignature,
    managerApprovedAt,
    assessmentDate: rootFolder.assessmentDate ?? undefined,
  };
}

/**
 * Generate HTML for Form Penilaian Berjalan (PB) or Penilaian Akhir (PA) PDF
 * Matches the official Lampiran 20 STK PENGELOLAAN CSMS format
 */
export async function generateEvaluasiHTML(evaluasiData: EvaluasiData): Promise<string> {
  const formatDate = (date: Date | string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Determine if this is Penilaian Akhir (PA) or Penilaian Berjalan (PB)
  const isPenilaianAkhir = evaluasiData.rootFolderName?.toUpperCase().includes("PA") ?? false;
  const formTitle = isPenilaianAkhir ? "FORM PENILAIAN AKHIR (PA)" : "FORM PENILAIAN BERJALAN (PB)";
  const evaluasiType = isPenilaianAkhir ? "Penilaian Akhir (PA)" : "Penilaian Berjalan (PB)";

  // Extract date from depth 0 folder name (format: "17-07-2023 - PB" -> "17-07-2023")
  // const getDepth0Date = (): string => {
  //   if (evaluasiData.rootFolderName) {
  //     // Extract date part before " - PB" or " - PA"
  //     const match = evaluasiData.rootFolderName.match(/^([\d\-]+)/);
  //     if (match) {
  //       // Convert dd-mm-yyyy to Date and format
  //       const parts = match[1].split("-");
  //       if (parts.length === 3) {
  //         const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-mm-dd
  //         return formatDate(new Date(dateStr));
  //       }
  //       return match[1];
  //     }
  //   }
  //   return formatDate(evaluasiData.finalAssessmentDate);
  // };
  // Use assessment date (only updated when score, status, or note is modified)
  const assessmentDateFromName = evaluasiData.assessmentDate 
    ? formatDate(evaluasiData.assessmentDate)
    : getFormattedAssessmentDate(evaluasiData);

  // Extract folder number from name (e.g., "3.1 Struktur..." -> "3.1")
  const extractFolderNumber = (name: string): string => {
    const match = name.match(/^([\d.]+|[A-Z]\.?)/);
    return match ? match[1] : "";
  };

  // Check if folder is a parent category (like 3, 4, 5, 6, 7, 8 - white bold styling)
  const isParentCategory = (name: string): boolean => {
    const num = extractFolderNumber(name);
    // Numbers 3-8 without decimals are parent categories (white, bold)
    // 1, 2 are mandatory (yellow), A is just a header
    if (/^\d+$/.test(num) && !num.includes(".")) {
      const numVal = parseInt(num, 10);
      return numVal >= 3; // 3, 4, 5, 6, 7, 8 are white bold parents
    }
    return false;
  };

  // Check if folder is mandatory (marked with *)
  const isMandatory = (name: string): boolean => {
    const num = extractFolderNumber(name);
    return ["1", "2", "4.1", "5.1"].includes(num);
  };

  // Build flat list of items for the table
  interface TableRow {
    no: string;
    name: string;
    score: number;
    bobot: string;
    nilaiAkhir: number;
    isParent: boolean;
    isLetterPrefix: boolean;
    isMandatory: boolean;
    isSubTotal: boolean;
    isGrandTotal: boolean;
    depth: number;
  }

  // Sort function for folder numbers (A, 1, 2, 3, ..., 1.1, 1.2, etc.)
  const sortByFolderNumber = (a: any, b: any): number => {
    const numA = extractFolderNumber(a.name);
    const numB = extractFolderNumber(b.name);
    
    // Handle letter prefixes (A, B, etc.) - put them first
    const isLetterA = /^[A-Z]$/.test(numA);
    const isLetterB = /^[A-Z]$/.test(numB);
    
    if (isLetterA && !isLetterB) return -1;
    if (!isLetterA && isLetterB) return 1;
    if (isLetterA && isLetterB) return numA.localeCompare(numB);
    
    // Split by dots for numeric comparison
    const partsA = numA.split(".").map(p => parseInt(p, 10) || 0);
    const partsB = numB.split(".").map(p => parseInt(p, 10) || 0);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const valA = partsA[i] || 0;
      const valB = partsB[i] || 0;
      if (valA !== valB) return valA - valB;
    }
    return 0;
  };

  const buildTableRows = (folders: any[], parentNo: string = ""): TableRow[] => {
    const rows: TableRow[] = [];
    
    // Sort folders by their number/letter prefix
    const sortedFolders = [...folders].sort(sortByFolderNumber);
    
    for (const folder of sortedFolders) {
      // Skip files
      if (folder.fileType === "file") continue;
      
      const folderNum = extractFolderNumber(folder.name);
      const isParent = isParentCategory(folder.name); // 3-8 are parents
      const isLetterPrefix = /^[A-Z]\.?$/.test(folderNum); // A., B., etc. are headers
      const mandatory = isMandatory(folder.name);
      
      // Count active folder children (excluding files and N/A folders) for bobot calculation
      const folderChildren = folder.children?.filter((c: any) => c.fileType === "folder") || [];
      const activeChildren = folderChildren.filter((c: any) => c.score !== -1);
      const siblingCount = activeChildren.length;
      
      // Calculate bobot for sub-items
      let bobotStr = "";
      if (!isParent && !isLetterPrefix && siblingCount === 0 && folder.bobot && folder.score !== -1) {
        bobotStr = `1/${folder.bobot}`;
      }
      
      rows.push({
        no: folderNum,
        name: folder.name.replace(/^[\d.]+\s*/, "").replace(/^[A-Z]\.\s*/, ""),
        score: folder.score || 0,
        bobot: bobotStr,
        nilaiAkhir: folder.nilaiAkhir || 0,
        isParent,
        isLetterPrefix,
        isMandatory: mandatory,
        isSubTotal: false,
        isGrandTotal: false,
        depth: folder.depth || 0,
      });
      
      // Process children recursively (they will also be sorted)
      if (folder.children && folder.children.length > 0) {
        const childRows = buildTableRows(folder.children, folderNum);
        rows.push(...childRows);
        
        // Add subtotal row after parent category children (3, 4, 5, 6, 7, 8)
        if (isParent && folderChildren.length > 0) {
          // Calculate total score for active children
          const childScoreSum = activeChildren.reduce((sum: number, c: any) => sum + (c.score || 0), 0);
          const subtotalNilai = siblingCount > 0 ? Math.round(childScoreSum / siblingCount) : 0;
          
          rows.push({
            no: "",
            name: `Sub Total Elemen ${folderNum}`,
            score: 0,
            bobot: `${childScoreSum}/${siblingCount}`,
            nilaiAkhir: subtotalNilai,
            isParent: false,
            isLetterPrefix: false,
            isMandatory: false,
            isSubTotal: true,
            isGrandTotal: false,
            depth: folder.depth || 0,
          });
        }
      }
    }
    
    return rows;
  };

  const tableRows = buildTableRows(evaluasiData.assessmentFolders);

  // Get depth 1 score directly from assessment folders (sum of active depth 1 folder scores)
  const depth1Score = evaluasiData.assessmentFolders
    .filter(f => f.depth === 1 && f.fileType === "folder" && f.score !== -1)
    .reduce((sum, f) => sum + (f.score || 0), 0);
  // Depth 0 score is the overallScore
  const depth0Score = evaluasiData.overallScore;

  // Render table rows
  const renderTableRows = (): string => {
    let html = "";
    
    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i];
      const score = row.score;
      
      // Determine row styling
      let rowBgColor = "#fff";
      let textColor = "#000";
      let fontWeight = "normal";
      
      if (row.isMandatory) {
        // Yellow for mandatory items (1, 2, 4.1, 5.1)
        rowBgColor = "#FFFF00";
      } else if (row.isParent) {
        // White background, bold for parent categories (4, 5, 6, 7, 8)
        rowBgColor = "#fff";
        fontWeight = "bold";
      } else if (row.isLetterPrefix) {
        // White background, bold for letter prefixes (A., B.)
        rowBgColor = "#fff";
        fontWeight = "bold";
      } else if (row.isSubTotal) {
        rowBgColor = "#FFFF00"; // Yellow for subtotals
        fontWeight = "bold";
      }
      
      // Show score in the appropriate column (skip for letter prefix and parent category rows)
      const skipScoreDisplay = row.isLetterPrefix || row.isParent;
      const score0 = !skipScoreDisplay && !row.isSubTotal && score === 0 ? "0" : "";
      const score3 = !skipScoreDisplay && !row.isSubTotal && score > 0 && score <= 3 ? String(score) : "";
      const score6 = !skipScoreDisplay && !row.isSubTotal && score > 3 && score <= 6 ? String(score) : "";
      const score10 = !skipScoreDisplay && !row.isSubTotal && score > 6 && score <= 10 ? String(score) : "";
      const scoreNA = !skipScoreDisplay && !row.isSubTotal && score === -1 ? "✓" : "";
      const bobotDisplay = (!skipScoreDisplay || row.isSubTotal) ? (row.bobot || "") : "";
      const nilaiDisplay = row.isSubTotal ? (row.nilaiAkhir > 0 ? row.nilaiAkhir.toFixed(0) : "") : "";
      
      // For subtotal rows, merge columns like grand total
      if (row.isSubTotal) {
        html += `
          <tr style="background-color: #f4f4f4; font-weight: bold;">
            <td colspan="7" style="border: 1px solid #000; padding: 4px 6px;">${row.name}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${bobotDisplay}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${nilaiDisplay}</td>
          </tr>
        `;
      } else if (skipScoreDisplay) {
        // For parent categories (A, 3, 4, 5, 6, 7, 8), merge the name column across score columns
        html += `
          <tr style="background-color: ${rowBgColor};">
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor}; font-weight: ${fontWeight};">${row.no}</td>
            <td colspan="8" style="border: 1px solid #000; padding: 4px 6px; color: ${textColor}; font-weight: ${fontWeight};">${row.name}</td>
          </tr>
        `;
      } else {
        html += `
          <tr style="background-color: ${rowBgColor};">
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor}; font-weight: ${fontWeight};">${row.no}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; color: ${textColor}; font-weight: ${fontWeight};">${row.name}${row.isMandatory ? "*" : ""}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${score0}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${score3}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${score6}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${score10}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${scoreNA}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor};">${bobotDisplay}</td>
            <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; color: ${textColor}; font-weight: ${fontWeight};"></td>
          </tr>
        `;
      }
    }
    
    // Add grand total rows
    html += `
      <tr style="background-color: #f4f4f4; font-weight: bold;">
        <td colspan="7" style="border: 1px solid #000; padding: 4px 6px;">SUB TOTAL RENCANA K3LL**</td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${depth1Score.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f4f4f4; font-weight: bold;">
        <td colspan="7" style="border: 1px solid #000; padding: 4px 6px;">SUB TOTAL RENCANA K3LL (skala 100)</td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;"></td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${depth0Score.toFixed(2)}%</td>
      </tr>
    `;
    
    return html;
  };

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8"/>
      <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
      <title>Form ${evaluasiType}</title>
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
          max-width: 1000px;
          margin: 0 auto;
          padding: 30px 40px;
        }
        
        .document-header {
          text-align: right;
          margin-bottom: 20px;
          color:rgb(0, 0, 0);
          font-size: 11px;
        }
        
        .title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
          color:rgb(0, 0, 0);
        }
        
        .orange-bar {
          background: rgb(55, 95, 147);
          height: 20px;
          width: 100%;
          margin-bottom: 20px;
        }
        
        .contract-info {
          margin-bottom: 20px;
        }
        
        .contract-info table {
          border: none;
        }
        
        .contract-info td {
          padding: 3px 0;
          border: none;
          vertical-align: top;
        }
        
        .contract-info td:first-child {
          width: 150px;
          font-weight: normal;
        }
        
        .contract-info td:nth-child(2) {
          width: 20px;
          text-align: center;
        }
        
        .instruction {
          margin-bottom: 20px;
          text-align: justify;
          font-size: 11px;
        }
        
        .main-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .main-table th {
          background-color: #003299;
          color: white;
          border: 1px solid #000;
          padding: 8px 5px;
          text-align: center;
          font-weight: normal;
          font-size: 10px;
        }
        
        .main-table td {
          font-size: 11px;
          line-height: 1.4;
        }
        
        .notes-section {
          margin-top: 30px;
          font-size: 11px;
        }
        
        .notes-section h4 {
          margin-bottom: 5px;
        }
        
        .notes-section ul {
          margin-left: 20px;
          margin-bottom: 15px;
        }
        
        .notes-section li {
          margin-bottom: 5px;
        }
        
        .summary-section {
          margin-top: 20px;
          font-size: 11px;
        }
        
        .summary-section h4 {
          margin-bottom: 5px;
        }
        
        .keterangan-section {
          margin-top: 20px;
        }
        
        .keterangan-section h4 {
          color:rgb(0, 0, 0);
          text-decoration: underline;
          margin-bottom: 10px;
        }
        
        .keterangan-box {
          border: 1px solid #000;
          min-height: 60px;
          padding: 10px;
          margin-bottom: 20px;
        }
        
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          margin-top: 30px;
        }
        
        .signature-table td {
          border: 1px solid #000;
          padding: 8px 5px;
          text-align: center;
          vertical-align: middle;
          width: 33.33%;
          font-size: 11px;
          height: 20px;
        }
        
        .signature-table .header {
          background-color: #fff;
          padding: 8px 5px;
          height: auto;
        }
        
        .signature-table .spacer {
          height: 80px;
          border: 1px solid #000;
          border-bottom: none;
          padding: 0;
        }
        
        .signature-table .position {
          font-weight: 500;
          padding: 4px 5px;
          height: auto;
          border: 1px solid #000;
          border-top: none;
        }
        
        .signature-table .name-row td {
          text-align: left;
          padding: 2px 5px;
          height: auto;
        }
        
        .signature-table .date-row td {
          text-align: left;
          padding: 2px 5px;
          height: auto;
        }
        
        @media print {
          .container {
            padding: 15px;
          }
          
          body {
            font-size: 9px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Document Header -->
        <div class="document-header">
          Lampiran ${isPenilaianAkhir ? '21' : '20'} STK PENGELOLAAN CSMS B8-004/PHE04000/2021-S9 Rev 01
        </div>
        
        <!-- Title -->
        <div class="title">
          ${formTitle}
        </div>
        
        <!-- Orange Bar -->
        <div class="orange-bar"></div>
        
        <!-- Contract Information -->
        <div class="contract-info">
          <table>
            <tr>
              <td>Risk Assessment ID</td>
              <td>:</td>
              <td>${evaluasiData.riskAssessmentId || "-"}</td>
            </tr>
            <tr>
              <td>Risk Level</td>
              <td>:</td>
              <td>${evaluasiData.riskLevel || "N/A"}</td>
            </tr>
            <tr>
              <td>Nomor Kontrak</td>
              <td>:</td>
              <td>${evaluasiData.contractNumber}</td>
            </tr>
            <tr>
              <td>Nama Pekerjaan</td>
              <td>:</td>
              <td>${evaluasiData.contractTitle}</td>
            </tr>
            <tr>
              <td>Nama Kontraktor</td>
              <td>:</td>
              <td>${evaluasiData.contractorName}</td>
            </tr>
            <tr>
              <td>Tanggal Penilaian</td>
              <td>:</td>
              <td>${assessmentDateFromName}</td>
            </tr>
            <tr>
              <td>Tempat Penilaian</td>
              <td>:</td>
              <td>${evaluasiData.assessmentLocation || "-"}</td>
            </tr>
            <tr>
              <td>Status (Interim/Final)</td>
              <td>:</td>
              <td>${evaluasiData.assessmentStatus || "Interim"}</td>
            </tr>
          </table>
        </div>
        
        <!-- Instruction -->
        <div class="instruction">
          Berikan penilaian pada form dibawah berdasarkan pada Kriteria Evaluasi ${evaluasiType}, implementasi aspek-aspek K3LL dan Rencana K3LL (HSSE Plan) yang telah disepakati dalam Kontrak.
        </div>
        
        <!-- Main Assessment Table -->
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 5%;">No</th>
              <th rowspan="2" style="width: 40%;">Elemen</th>
              <th colspan="5" style="width: 25%;">Nilai</th>
              <th rowspan="2" style="width: 10%;">Bobot/<br/>Persentase</th>
              <th rowspan="2" style="width: 8%;">Nilai</th>
            </tr>
            <tr>
              <th style="width: 5%;">0</th>
              <th style="width: 5%;">3</th>
              <th style="width: 5%;">6</th>
              <th style="width: 5%;">10</th>
              <th style="width: 5%;">N/A</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 
              ? renderTableRows()
              : `<tr><td colspan="9" style="border: 1px solid #000; padding: 20px; text-align: center;">Tidak ada data penilaian</td></tr>`
            }
          </tbody>
        </table>
        
        <!-- Notes Section -->
        <div class="notes-section">
          <h4>Catatan:</h4>
          <ul>
            <li>*Elemen 1, Elemen 2, Elemen 4.1 dan Elemen 5.1 merupakan elemen mandatory/wajib dengan nilai minimum 6.</li>
            <li>Total bobot untuk Rencana K3LL adalah . Apabila berdasarkan sifat pekerjaan ada beberapa elemen yang tidak berlaku (N/A), maka dihitung proporsional sehingga total tetap. Apabila ada ketentuan dari penerimaan bersyarat (<i>conditional acceptance</i>) untuk elemen tertentu, maka ketentuan tersebut juga dimasukkan dalam kriteria penilaian elemen tersebut.</li>
          </ul>
        </div>
        
        <!-- Summary Section -->
        <div class="summary-section">
          <h4>IKHTISAR</h4>
          <p>Nilai numerik di bawah ini adalah peringkat pembobotan yang dihitung berdasarkan penilaian saat audit dilakukan. Total merupakan skor keseluruhan hasil Audit.</p>
          <br/>
          <p><strong>TOTAL PENILAIAN ${depth0Score.toFixed(2)}%</strong></p>
          <ul>
            <li><strong>Lulus</strong> / <s>Tidak Lulus</s> (Lingkari salah satu)</li>
          </ul>
        </div>
        
        <!-- Keterangan Section -->
        <div class="keterangan-section">
          <h4>*Keterangan (*Kolom Keterangan Harus diisi dengan sesuai catatan/temuan saat audit dilengkapi dengan due date yang jelas)</h4>
          <div class="keterangan-box"></div>
        </div>
        
        <!-- Signature Section -->
        <table class="signature-table">
          <tr class="header-row">
            <td class="header">Dievaluasi oleh</td>
            <td class="header">Diverifikasi</td>
            <td class="header">Disetujui oleh</td>
          </tr>
          <tr class="signature-row" style="height: 80px;">
            <td class="signature-cell" style="vertical-align: middle; padding: 0px; border: 1px solid #000; border-bottom: none;">
              ${evaluasiData.evaluatorSignature ? `<img src="${evaluasiData.evaluatorSignature}" alt="Evaluator Signature" style="max-width: 150px; max-height: 70px; object-fit: contain; display: block; margin: auto; background: transparent;" />` : ''}
            </td>
            <td class="signature-cell" style="vertical-align: middle; padding: 0px; border: 1px solid #000; border-bottom: none;">
              ${evaluasiData.verifikatorSignature ? `<img src="${evaluasiData.verifikatorSignature}" alt="Verifikator Signature" style="max-width: 150px; max-height: 70px; object-fit: contain; display: block; margin: auto; background: transparent;" />` : ''}
            </td>
            <td class="signature-cell" style="vertical-align: middle; padding: 0px; border: 1px solid #000; border-bottom: none;">
              ${evaluasiData.managerSignature ? `<img src="${evaluasiData.managerSignature}" alt="Manager Signature" style="max-width: 150px; max-height: 70px; object-fit: contain; display: block; margin: auto; background: transparent;" />` : ''}
            </td>
          </tr>
          <tr class="position-row">
            <td class="position">Fungsi Pengguna</td>
            <td class="position" style="text-align: left;">
              ${evaluasiData.auditorSignatures && evaluasiData.auditorSignatures.length > 0 
                ? evaluasiData.auditorSignatures.map(s => `<img src="${s}" alt="Auditor Signature" style="max-width: 40px; max-height: 25px; object-fit: contain; vertical-align: middle; background: transparent; margin-right: 3px;" />`).join('')
                : ''}
              <span>Verifikator</span>
            </td>
            <td class="position">Manager Lini fungsi Pengguna</td>
          </tr>
          <tr class="name-row">
            <td>Nama : ${evaluasiData.evaluatorName || ''}</td>
            <td>Nama : ${evaluasiData.verifikatorName || ''}</td>
            <td>Nama : ${evaluasiData.managerName || ''}</td>
          </tr>
          <tr class="date-row">
            <td>Tanggal : ${evaluasiData.evaluatorApprovedAt ? formatDate(evaluasiData.evaluatorApprovedAt) : ''}</td>
            <td>Tanggal : ${evaluasiData.verifikatorApprovedAt ? formatDate(evaluasiData.verifikatorApprovedAt) : ''}</td>
            <td>Tanggal : ${evaluasiData.managerApprovedAt ? formatDate(evaluasiData.managerApprovedAt) : ''}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return html;
}

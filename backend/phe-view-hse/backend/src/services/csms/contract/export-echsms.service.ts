import { db } from "../../../db/index.ts";
import { contract, contractFolder } from "../../../db/schema/csms.schema.ts";
import { subContractors } from "../../../db/schema/auth.schema.ts";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { resolveExistingUploadFile, uploadsPath } from "../../../config/env.config.ts";

interface RowMapping {
  row: number;
  pattern: RegExp;
}

const ELEMENT_ROW_MAPPINGS: RowMapping[] = [
  { row: 13, pattern: /^(1|1\.1)(\s|$)/ },
  { row: 15, pattern: /^(2|2\.1)(\s|$)/ },
  { row: 16, pattern: /^(2|2\.1)(\s|$)/ },
  { row: 18, pattern: /^3\.1(\s|$)/ },
  { row: 19, pattern: /^3\.2(\s|$)/ },
  { row: 20, pattern: /^3\.3(\s|$)/ },
  { row: 21, pattern: /^3\.4(\s|$)/ },
  { row: 22, pattern: /^3\.5(\s|$)/ },
  { row: 23, pattern: /^3\.6(\s|$)/ },
  { row: 25, pattern: /^4\.1(\s|$)/ },
  { row: 26, pattern: /^4\.2(\s|$)/ },
  { row: 27, pattern: /^4\.3(\s|$)/ },
  { row: 28, pattern: /^4\.4(\s|$)/ },
  { row: 29, pattern: /^4\.5(\s|$)/ },
  { row: 30, pattern: /^4\.6(\s|$)/ },
  { row: 31, pattern: /^4\.7(\s|$)/ },
  { row: 32, pattern: /^4\.8(\s|$)/ },
  { row: 34, pattern: /^5\.1(\s|$)/ },
  { row: 35, pattern: /^5\.2(\s|$)/ },
  { row: 36, pattern: /^5\.3(\s|$)/ },
  { row: 37, pattern: /^5\.4(\s|$)/ },
  { row: 39, pattern: /^6\.1(\s|$)/ },
  { row: 40, pattern: /^6\.2(\s|$)/ },
  { row: 41, pattern: /^6\.3(\s|$)/ },
  { row: 42, pattern: /^6\.4(\s|$)/ },
  { row: 43, pattern: /^6\.5(\s|$)/ },
  { row: 45, pattern: /^7\.1(\s|$)/ },
  { row: 46, pattern: /^7\.2(\s|$)/ },
  { row: 48, pattern: /^8\.1(\s|$)/ },
  { row: 49, pattern: /^8\.2(\s|$)/ },
];

/**
 * Format assessment date from root folder or finalAssessmentDate
 */
function formatAssessmentDate(dateVal?: Date | string | null, folderName?: string): string {
  const formatDate = (date: Date | string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (dateVal) {
    return formatDate(dateVal);
  }

  if (folderName) {
    const match = folderName.match(/^([\d\-]+)/);
    if (match) {
      const parts = match[1].split("-");
      if (parts.length === 3) {
        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return formatDate(parsed);
        }
      }
      return match[1];
    }
  }

  return "-";
}

export interface ExportEchsmsResult {
  buffer: Buffer;
  filename: string;
}

export async function exportEchsmsService(
  contractId: string,
  folderId: string
): Promise<ExportEchsmsResult | null> {
  // 1. Fetch Contract Data
  const contractData = await db.query.contract.findFirst({
    where: eq(contract.id, contractId),
  });

  if (!contractData) {
    return null;
  }

  // 2. Fetch Contractor Data
  const contractor = await db.query.subContractors.findFirst({
    where: eq(subContractors.id, contractData.contractorId),
  });

  if (!contractor) {
    return null;
  }

  // 3. Fetch Root Folder (depth 0) and all contract folders
  const allFolders = await db.query.contractFolder.findMany({
    where: eq(contractFolder.contractId, contractId),
  });

  const rootFolder = allFolders.find(
    (f) => f.id === folderId && (f.depth === 0 || f.path === f.id)
  );

  if (!rootFolder) {
    return null;
  }

  // 4. Locate template file
  const templateFilename = "ECHSEMS_2026_Template.xlsx";
  let templatePath = resolveExistingUploadFile(templateFilename);

  if (!templatePath || !fs.existsSync(templatePath)) {
    const fallbackPath = uploadsPath(templateFilename);
    if (fs.existsSync(fallbackPath)) {
      templatePath = fallbackPath;
    } else {
      const directUploads = path.resolve(process.cwd(), "uploads", templateFilename);
      const parentUploads = path.resolve(process.cwd(), "..", "uploads", templateFilename);
      if (fs.existsSync(directUploads)) {
        templatePath = directUploads;
      } else if (fs.existsSync(parentUploads)) {
        templatePath = parentUploads;
      }
    }
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templateFilename}`);
  }

  // 5. Load Excel workbook from template
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet("ECHSEMS");
  if (!worksheet) {
    throw new Error("Worksheet 'ECHSEMS' not found in template");
  }

  // 6. Format header string for Cell C6
  // Format: [Nomor Kontrak] - [Nama Pekerjaan] - [Nama Kontraktor] - [Tanggal Penilaian]
  let assessmentDateStr = formatAssessmentDate(rootFolder.assessmentDate, rootFolder.name);
  if (assessmentDateStr === "-" && contractData.finalAssessmentDate) {
    assessmentDateStr = formatAssessmentDate(contractData.finalAssessmentDate);
  }

  const headerText = `${contractData.numberContract || "-"} - ${contractData.title || "-"} - ${contractor.name || "-"} - ${assessmentDateStr}`;
  worksheet.getCell("C6").value = headerText;

  // 7. Get descendants of this root folder
  const getDescendants = (parentId: string): typeof allFolders => {
    const directChildren = allFolders.filter((f) => f.parentId === parentId);
    return [...directChildren, ...directChildren.flatMap((c) => getDescendants(c.id))];
  };

  const assessmentFolders = getDescendants(folderId).filter((f) => f.fileType === "folder");

  // 8. Populate Score (Col E = 5) and Remark (Col G = 7)
  for (const mapping of ELEMENT_ROW_MAPPINGS) {
    const matchedFolder = assessmentFolders.find((f) => mapping.pattern.test(f.name));

    if (matchedFolder) {
      // Parse score
      let scoreVal: number | string = 0;
      if (matchedFolder.score !== null && matchedFolder.score !== undefined) {
        const parsed = parseFloat(matchedFolder.score.toString());
        if (parsed === -1) {
          scoreVal = "N/A";
        } else if (!isNaN(parsed)) {
          scoreVal = parsed;
        }
      }

      // Parse remark / note
      const remarkVal = matchedFolder.note ? matchedFolder.note.trim() : "";

      // Set cell values
      worksheet.getCell(`E${mapping.row}`).value = scoreVal;
      worksheet.getCell(`G${mapping.row}`).value = remarkVal;
    }
  }

  // 9. Generate buffer and return
  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  const safeContractNo = (contractData.numberContract || "CONTRACT").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `ECHSEMS-${safeContractNo}-${Date.now()}.xlsx`;

  return {
    buffer,
    filename,
  };
}

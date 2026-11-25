import { db } from "../../../db/index.ts";
import ExcelJS from "exceljs";

// manual vs AI comparison (same rules as the "Hasil CSMS AI" dashboard)
const LEVELS = [0, 3, 6, 10];
const level = (s: number) => LEVELS.reduce((b, l, i) => (Math.abs(l - s) < Math.abs(LEVELS[b] - s) ? i : b), 0);
const isAiNote = (n?: string | null) => !!n && n.startsWith("HASIL PENILAIAN AI");
const headOf = (n?: string | null) => {
  const h = n?.split("\n")[1] ?? "";
  const c = h.match(/Tingkat keyakinan:\s*([\d.,]+)/);
  const m = h.match(/Mode:\s*(\S+)/);
  return { confidence: c ? parseFloat(c[1].replace(",", ".")) : null, mode: m?.[1] ?? null };
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const styleHeader = (ws: ExcelJS.Worksheet) => {
  const r = ws.getRow(1);
  r.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  r.height = 25;
  r.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "5B21B6" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
};

export async function exportAiEvaluationExcelService(contractId: string, folderId: string): Promise<Buffer> {
  // Get all folders for this contract
  const allFolders = await db.query.contractFolder.findMany({
    where: (cf, { eq }) => eq(cf.contractId, contractId),
  });

  const rootFolder = allFolders.find(f => f.id === folderId) || null;
  if (!rootFolder) {
    throw new Error("Root folder not found");
  }

  // Find if there is a child folder named "A. RENCANA K3LL"
  const rencanaK3llFolder = allFolders.find(
    f => f.parentId === folderId && f.name === "A. RENCANA K3LL" && f.fileType === "folder"
  );

  // If "A. RENCANA K3LL" is found, retrieve its children (elements 1-8). Otherwise, retrieve the direct children.
  const parentFolderIdForElements = rencanaK3llFolder ? rencanaK3llFolder.id : folderId;

  // Get depth 1 children (main elements) under the selected folder
  const mainElements = allFolders
    .filter(f => f.parentId === parentFolderIdForElements && f.fileType === "folder")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const elements: typeof allFolders = [];

  for (const mainElem of mainElements) {
    const isCat1or2 = /^([12])\s/.test(mainElem.name) || mainElem.name === '1 Kepemimpinan dan Komitmen' || mainElem.name === '2 Kebijakan dan Sasaran Strategis K3LL';
    if (isCat1or2) {
      elements.push(mainElem);
      continue;
    }

    // Find sub-folders under this main element (sub-children like 3.1, 3.2, etc.)
    const subFolders = allFolders
      .filter(f => f.parentId === mainElem.id && f.fileType === "folder")
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    if (subFolders.length > 0) {
      elements.push(...subFolders);
    } else {
      elements.push(mainElem);
    }
  }

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: summary per category (manual vs AI)
  const summary = workbook.addWorksheet("Ringkasan per Kategori");
  summary.columns = [
    { header: "Kategori", key: "code", width: 10 },
    { header: "Nama kategori", key: "name", width: 45 },
    { header: "Skor manual", key: "manual", width: 14 },
    { header: "Skor AI", key: "ai", width: 12 },
    { header: "Selisih (tingkat)", key: "gap", width: 16 },
    { header: "Elemen dinilai AI", key: "n", width: 16 },
    { header: "Sama persis", key: "exact", width: 13 },
    { header: "Keyakinan < 0,85", key: "low", width: 16 },
  ];
  styleHeader(summary);
  const catTotals: { manual: number[]; ai: number[] } = { manual: [], ai: [] };
  for (const mainElem of mainElements.filter((m) => /^[1-8]\s/.test(m.name))) {
    const code = mainElem.name.split(" ")[0];
    const els = /^[12]\s/.test(mainElem.name)
      ? [mainElem]
      : allFolders.filter((f) => f.parentId === mainElem.id && f.fileType === "folder" && new RegExp(`^${code}\\.\\d+`).test(f.name));
    const manual = avg(els.filter((e) => e.status !== "pending" && Number(e.score) >= 0).map((e) => Number(e.score)));
    const ai = avg(els.filter((e) => isAiNote(e.aiReasoning) && Number(e.aiScore) >= 0).map((e) => Number(e.aiScore)));
    const scored = els.filter((e) => isAiNote(e.aiReasoning));
    const compared = scored.filter((e) => e.status !== "pending" && Number(e.score) >= 0);
    if (manual !== null) catTotals.manual.push(manual);
    if (ai !== null) catTotals.ai.push(ai);
    summary.addRow({
      code,
      name: mainElem.name.replace(/^\S+\s+/, ""),
      manual: manual ?? "-",
      ai: ai ?? "-",
      gap: manual !== null && ai !== null ? level(ai) - level(manual) : "-",
      n: scored.length,
      exact: compared.filter((e) => level(Number(e.aiScore)) === level(Number(e.score))).length,
      low: scored.filter((e) => (headOf(e.aiReasoning).confidence ?? 1) < 0.85).length,
    });
  }
  const total = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / (xs.length * 10)) * 1000) / 10 : "-");
  const totalRow = summary.addRow({ code: "Total", name: "Skor total (0 sampai 100)", manual: total(catTotals.manual), ai: total(catTotals.ai) });
  totalRow.font = { name: "Arial", size: 10, bold: true };

  const worksheet = workbook.addWorksheet("AI Evaluation Report");

  // Grid lines visible
  worksheet.views = [{ showGridLines: true }];

  // Column definitions
  worksheet.columns = [
    { header: "Category ID", key: "categoryId", width: 15 },
    { header: "Folder Name", key: "folderName", width: 40 },
    { header: "Human Score", key: "humanScore", width: 15 },
    { header: "AI Predicted Score", key: "aiScore", width: 20 },
    { header: "AI Status", key: "aiStatus", width: 15 },
    { header: "AI Reasoning", key: "aiReasoning", width: 100 },
    { header: "AI Processed At", key: "aiProcessedAt", width: 25 },
    { header: "Selisih (tingkat)", key: "gap", width: 16 },
    { header: "Keyakinan AI", key: "confidence", width: 14 },
    { header: "Mode", key: "mode", width: 14 }
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F81BD" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "medium", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } }
    };
  });

  // Populate rows
  elements.forEach((folder) => {
    // Parse Category ID from folder name (e.g. "1 Kepemimpinan dan Komitmen" -> "1")
    const match = folder.name.match(/^([\d\.]+)/);
    const categoryId = match ? match[1] : folder.name;

    const row = worksheet.addRow({
      categoryId: categoryId,
      folderName: folder.name,
      humanScore: folder.score ? parseFloat(folder.score.toString()) : 0,
      aiScore: folder.aiScore ? parseFloat(folder.aiScore.toString()) : 0,
      aiStatus: folder.aiStatus ? folder.aiStatus.toUpperCase() : "PENDING",
      aiReasoning: folder.aiReasoning || "-",
      aiProcessedAt: folder.aiProcessedAt ? new Date(folder.aiProcessedAt).toLocaleString("id-ID") : "-",
      gap: isAiNote(folder.aiReasoning) && folder.status !== "pending" && Number(folder.score) >= 0
        ? level(Number(folder.aiScore)) - level(Number(folder.score)) : "-",
      confidence: headOf(folder.aiReasoning).confidence ?? "-",
      mode: headOf(folder.aiReasoning).mode ?? "-",
    });

    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.border = {
        top: { style: "thin", color: { argb: "D3D3D3" } },
        left: { style: "thin", color: { argb: "D3D3D3" } },
        bottom: { style: "thin", color: { argb: "D3D3D3" } },
        right: { style: "thin", color: { argb: "D3D3D3" } }
      };

      if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 5 || colNumber === 7) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      // Highlight AI Status colors
      if (colNumber === 5) {
        const val = cell.value?.toString().toLowerCase();
        if (val === "accept" || val === "accepted") {
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "276A3C" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D4EDDA" } };
        } else if (val === "reject" || val === "rejected" || val === "failed") {
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "721C24" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8D7DA" } };
        }
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}

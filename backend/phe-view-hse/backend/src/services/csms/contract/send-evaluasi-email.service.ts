import { htmlToPdf } from "../../../utils/htmlToPdf.ts";
import { db } from "../../../db/index.ts";
import { evaluationEmailLog } from "../../../db/schema/csms.schema.ts";
import emailService, { type EvaluationReportNotification } from "../email.service.ts";
import { getEvaluasiData, generateEvaluasiHTML, getFormattedAssessmentDate } from "./export-evaluasi.service.ts";

/**
 * Options for exporting evaluation as PDF
 */
export interface ExportEvaluasiOptions {
  contractId: string;
  folderId: string;
}

/**
 * Options for sending evaluation report via email
 */
export interface SendEvaluasiEmailOptions {
  contractId: string;
  folderId: string;
  recipientUserIds: string[];
}

/**
 * Generate PDF from evaluation HTML content
 */
export async function generateEvaluasiPDF(htmlContent: string): Promise<Buffer> {
  return await htmlToPdf(htmlContent, {
    format: "A4",
    margin: "20px",
  });
}

/**
 * Export evaluation as PDF for download
 * Returns PDF buffer and filename
 */
export async function exportEvaluasiToPDF(
  options: ExportEvaluasiOptions
): Promise<{ pdfBuffer: Buffer; filename: string } | null> {
  const { contractId, folderId } = options;

  // Get evaluation data for specific folder
  const evaluasiData = await getEvaluasiData(contractId, folderId);

  if (!evaluasiData) {
    return null;
  }

  // Generate HTML content
  const htmlContent = await generateEvaluasiHTML(evaluasiData);

  // Generate PDF
  const pdfBuffer = await generateEvaluasiPDF(htmlContent);

  // Create filename based on contract number
  // Format: "27-01-2026 - PB" -> "Hasil Evaluasi - Penilaian Berjalan - 27-01-2026.pdf"
  const folderName = evaluasiData.rootFolderName;
  const typeMatch = folderName.match(/-\s*(PB|PA)\s*$/);
  const assessmentType = typeMatch ? (typeMatch[1] === 'PB' ? 'Penilaian Berjalan' : 'Penilaian Akhir') : '';
  const dateMatch = folderName.match(/^([\d-]+)/);
  const dateStr = dateMatch ? dateMatch[1] : '';
  const filename = `Hasil Evaluasi - ${assessmentType} - ${dateStr}.pdf`;

  return { pdfBuffer, filename };
}

/**
 * Send evaluation report via email to users
 */
export async function sendEvaluasiReportEmail(
  options: SendEvaluasiEmailOptions
): Promise<void> {
  const { contractId, folderId, recipientUserIds } = options;

  // Get evaluation data for specific folder
  const evaluasiData = await getEvaluasiData(contractId, folderId);

  if (!evaluasiData) {
    throw new Error("Evaluation data not found");
  }

  // Fetch user emails from database
  const recipientUsers = await db.query.users.findMany({
    where: (u, { inArray }) => inArray(u.id, recipientUserIds),
  });

  if (recipientUsers.length === 0) {
    throw new Error("No valid recipients found");
  }

  // Generate HTML content
  const htmlContent = await generateEvaluasiHTML(evaluasiData);

  // Generate PDF
  const pdfBuffer = await generateEvaluasiPDF(htmlContent);

  // Prepare email notification
  const evaluationNotification: EvaluationReportNotification = {
    contractorName: evaluasiData.contractorName,
    contractNumber: evaluasiData.contractNumber,
    contractTitle: evaluasiData.contractTitle,
    evaluationDate: getFormattedAssessmentDate(evaluasiData),
    overallScore: evaluasiData.overallScore,
  };

  // Send email with PDF attachment
  const recipients = recipientUsers
    .filter(user => user.email !== null && user.email !== undefined)
    .map(user => ({
      email: user.email as string,
      name: user.name,
    }));

  try {
    await emailService.sendEvaluationReportEmail(
      recipients,
      evaluationNotification,
      pdfBuffer
    );

    // Log successful email sends
    for (const user of recipientUsers) {
      if (user.email) {
        await db.insert(evaluationEmailLog).values({
          contractId,
          folderId,
          userId: user.id,
          email: user.email,
          status: 'sent',
          sentAt: new Date(),
        });
      }
    }
  } catch (error) {
    // Log failed email sends
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    for (const user of recipientUsers) {
      if (user.email) {
        await db.insert(evaluationEmailLog).values({
          contractId,
          folderId,
          userId: user.id,
          email: user.email,
          status: 'failed',
          errorMessage,
          sentAt: new Date(),
        });
      }
    }
    throw error;
  }
}

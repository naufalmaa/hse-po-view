import Brevo from '@getbrevo/brevo';
import env from '../../config/env.config.ts';
import axios from 'axios';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface QualificationExpiryNotification {
  contractorName: string;
  title: string;
  expiredDate: Date;
  daysUntilExpiry: number;
}

export interface AssessmentFolderNotification {
  contractorName: string;
  contractName: string;
  folderName: string;
  assessmentDate: Date;
  daysUntilAssessment: number;
  assessmentType: string;
}

// New interfaces for grouped notifications
export interface GroupedQualificationExpiryNotification {
  notifications: QualificationExpiryNotification[];
}

export interface GroupedAssessmentFolderNotification {
  notifications: AssessmentFolderNotification[];
}

export interface EvaluationReportNotification {
  contractorName: string;
  contractNumber: string;
  contractTitle: string;
  evaluationDate: string;
  overallScore: number;
}

// Brevo email client
let apiInstance: Brevo.TransactionalEmailsApi | null = null;

// Initialize Brevo API client if API key is provided
if (env.email?.brevo?.apiKey) {
  apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(0, env.email.brevo.apiKey); // 0 corresponds to 'apiKey'
}

class EmailService {
  private apiInstance: Brevo.TransactionalEmailsApi | null = null;

  constructor() {
    this.apiInstance = apiInstance;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.apiInstance) {
      console.warn('Email service not configured. Skipping email sending.');
      return;
    }

    try {
      // Create email object
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;
      sendSmtpEmail.textContent = options.text;
      
      sendSmtpEmail.sender = {
        name: env.email.fromName,
        email: env.email.fromAddress
      };
      
      // Convert recipients to Brevo format
      if (Array.isArray(options.to)) {
        sendSmtpEmail.to = options.to.map(email => ({
          email: email,
          name: email,
        }));
      } else {
        sendSmtpEmail.to = [{
          email: options.to,
          name: options.to,
        }];
      }

      // Send email
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.info(`Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendQualificationExpiryNotification(
    recipients: { email: string; name: string }[],
    notification: QualificationExpiryNotification
  ): Promise<void> {
    if (!recipients.length) return;

    const emailAddresses = recipients.map(r => r.email);
    
    const subject = `Pemberitahuan Masa Berlaku: ${notification.title}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="background-color: #004b87; color: white; padding: 16px 24px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <h2 style="margin: 0; font-size: 20px;">Pemberitahuan Masa Berlaku</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">SERTIFIKAT e-CHSEMS&nbsp;•&nbsp;PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="padding: 24px;">
          <p>Yth. <strong>Mitra Kerja</strong>,</p>
          <p>
            Kami ingin menginformasikan bahwa sertifikat berikut akan <strong>segera mencapai masa kedaluwarsa</strong>.
            Mohon agar dilakukan perpanjangan sebelum tanggal kedaluwarsa agar proses operasional tetap berjalan dengan lancar.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Mitra Kerja</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractorName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Tanggal Kedaluwarsa</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.expiredDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Sisa Waktu</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.daysUntilExpiry} hari lagi</td>
            </tr>
          </table>

          <p>Harap segera melakukan tindakan perpanjangan sertifikasi sebelum masa berlaku berakhir.</p>

          <p style="margin-top: 24px;">Hormat kami,<br/>
          <strong>Administrator Sistem e-CHSEMS</strong><br/>
          PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="background-color: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center; padding: 12px; border-top: 1px solid #e5e7eb;">
          Email ini dikirim secara otomatis oleh sistem e-CHSEMS. Mohon tidak membalas email ini.
        </div>
      </div>
    `;

    const text = `
    Pemberitahuan Masa Berlaku - SERTIFIKAT e-CHSEMS
    PT Pertamina Hulu Energi OSES

    Mitra Kerja: ${notification.contractorName}
    Judul Sertifikat: ${notification.title}
    Tanggal Kedaluwarsa: ${notification.expiredDate.toLocaleDateString('id-ID')}
    Sisa Waktu: ${notification.daysUntilExpiry} hari lagi

    Harap segera melakukan perpanjangan sebelum masa berlaku berakhir.
    `;

    await this.sendEmail({
      to: emailAddresses,
      subject,
      html,
      text,
    });
  }

  // New method for grouped qualification notifications
  async sendGroupedQualificationExpiryNotifications(
    recipients: { email: string; name: string }[],
    notification: GroupedQualificationExpiryNotification
  ): Promise<void> {
    if (!recipients.length || !notification.notifications.length) return;

    const emailAddresses = recipients.map(r => r.email);
    
    const subject = `Pemberitahuan Masa Berlaku (${notification.notifications.length} Sertifikat)`;

    // Build HTML table for multiple certificates
    let certificatesTable = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Mitra Kerja</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Sertifikat</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Tanggal Kedaluwarsa</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Sisa Waktu</th>
          </tr>
        </thead>
        <tbody>
    `;

    notification.notifications.forEach(cert => {
      certificatesTable += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 10px;">${cert.contractorName}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${cert.title}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${cert.expiredDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${cert.daysUntilExpiry} hari lagi</td>
        </tr>
      `;
    });

    certificatesTable += `
        </tbody>
      </table>
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="background-color: #004b87; color: white; padding: 16px 24px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <h2 style="margin: 0; font-size: 20px;">Pemberitahuan Masa Berlaku Sertifikat</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">SERTIFIKAT e-CHSEMS&nbsp;•&nbsp;PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="padding: 24px;">
          <p>Yth. <strong>Mitra Kerja</strong>,</p>
          <p>
            Kami ingin menginformasikan bahwa ${notification.notifications.length} sertifikat berikut akan <strong>segera mencapai masa kedaluwarsa</strong>.
            Mohon agar dilakukan perpanjangan sebelum tanggal kedaluwarsa agar proses operasional tetap berjalan dengan lancar.
          </p>

          ${certificatesTable}

          <p>Harap segera melakukan tindakan perpanjangan sertifikasi sebelum masa berlaku berakhir.</p>

          <p style="margin-top: 24px;">Hormat kami,<br/>
          <strong>Administrator Sistem e-CHSEMS</strong><br/>
          PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="background-color: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center; padding: 12px; border-top: 1px solid #e5e7eb;">
          Email ini dikirim secara otomatis oleh sistem e-CHSEMS. Mohon tidak membalas email ini.
        </div>
      </div>
    `;

    // Build text version
    let text = `
    Pemberitahuan Masa Berlaku Sertifikat - SERTIFIKAT e-CHSEMS
    PT Pertamina Hulu Energi OSES

    Daftar Sertifikat yang akan Kedaluwarsa:
    `;

    notification.notifications.forEach(cert => {
      text += `
    - Mitra Kerja: ${cert.contractorName}
      Sertifikat: ${cert.title}
      Tanggal Kedaluwarsa: ${cert.expiredDate.toLocaleDateString('id-ID')}
      Sisa Waktu: ${cert.daysUntilExpiry} hari lagi
      `;
    });

    text += `
    Harap segera melakukan perpanjangan sebelum masa berlaku berakhir.
    `;

    await this.sendEmail({
      to: emailAddresses,
      subject,
      html,
      text,
    });
  }

  async sendAssessmentFolderNotification(
    recipients: { email: string; name: string }[],
    notification: AssessmentFolderNotification
  ): Promise<void> {
    if (!recipients.length) return;

    const emailAddresses = recipients.map(r => r.email);
    
    const subject = `Pemberitahuan Batas Waktu ${notification.assessmentType}: ${notification.folderName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="background-color: #004b87; color: white; padding: 16px 24px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <h2 style="margin: 0; font-size: 20px;">Pemberitahuan Batas Waktu Penilaian</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">PENILAIAN &nbsp;•&nbsp;PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="padding: 24px;">
          <p>Yth. <strong>Mitra Kerja</strong>,</p>
          <p>
            Kami ingin menginformasikan bahwa folder penilaian berikut akan <strong>segera mencapai batas waktu</strong>.
            Mohon agar dilakukan tindakan yang diperlukan sebelum batas waktu agar proses operasional tetap berjalan dengan lancar.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Mitra Kerja</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractorName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Nama Kontrak</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Penilaian</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.folderName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Jenis Penilaian</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.assessmentType}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Batas Waktu</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.assessmentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Sisa Waktu</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.daysUntilAssessment} hari lagi</td>
            </tr>
          </table>

          <p>Harap segera melakukan tindakan yang diperlukan sebelum batas waktu berakhir.</p>

          <p style="margin-top: 24px;">Hormat kami,<br/>
          <strong>Administrator Sistem</strong><br/>
          PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="background-color: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center; padding: 12px; border-top: 1px solid #e5e7eb;">
          Email ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.
        </div>
      </div>
    `;

    const text = `
    Pemberitahuan Batas Waktu Penilaian
    PT Pertamina Hulu Energi OSES

    Mitra Kerja: ${notification.contractorName}
    Kontrak: ${notification.contractName}
    Penilaian: ${notification.folderName}
    Jenis Penilaian: ${notification.assessmentType}
    Batas Waktu: ${notification.assessmentDate.toLocaleDateString('id-ID')}
    Sisa Waktu: ${notification.daysUntilAssessment} hari lagi

    Harap segera melakukan tindakan yang diperlukan sebelum batas waktu berakhir.
    `;

    await this.sendEmail({
      to: emailAddresses,
      subject,
      html,
      text,
    });
  }

  async sendEvaluationReportEmail(
    recipients: { email: string; name: string }[],
    notification: EvaluationReportNotification,
    pdfBuffer: Buffer
  ): Promise<void> {
    if (!recipients.length) return;

    const emailAddresses = recipients.map(r => r.email);
    
    const subject = `Laporan Evaluasi Kontrak: ${notification.contractNumber}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="background-color: #004b87; color: white; padding: 16px 24px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <h2 style="margin: 0; font-size: 20px;">Laporan Hasil Evaluasi</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">SERTIFIKAT e-CHSEMS&nbsp;•&nbsp;PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="padding: 24px;">
          <p>Yth. <strong>Mitra Kerja</strong>,</p>
          <p>
            Kami ingin menginformasikan bahwa laporan hasil evaluasi kontrak Anda telah selesai dan terlampir dalam email ini.
            Silakan review dan hubungi kami jika ada pertanyaan.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Mitra Kerja</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractorName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Nomor Kontrak</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractNumber}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Judul Kontrak</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.contractTitle}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Tanggal Evaluasi</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${new Date(notification.evaluationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Skor Keseluruhan</td>
              <td style="border: 1px solid #ddd; padding: 10px;">${notification.overallScore.toFixed(2)}%</td>
            </tr>
          </table>

          <p>Laporan detail terlampir sebagai PDF di email ini.</p>

          <p style="margin-top: 24px;">Hormat kami,<br/>
          <strong>Administrator Sistem e-CHSEMS</strong><br/>
          PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="background-color: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center; padding: 12px; border-top: 1px solid #e5e7eb;">
          Email ini dikirim secara otomatis oleh sistem e-CHSEMS. Mohon tidak membalas email ini.
        </div>
      </div>
    `;

    const text = `
    Laporan Hasil Evaluasi - SERTIFIKAT e-CHSEMS
    PT Pertamina Hulu Energi OSES

    Mitra Kerja: ${notification.contractorName}
    Nomor Kontrak: ${notification.contractNumber}
    Judul Kontrak: ${notification.contractTitle}
    Tanggal Evaluasi: ${new Date(notification.evaluationDate).toLocaleDateString('id-ID')}
    Skor Keseluruhan: ${notification.overallScore.toFixed(2)}%

    Laporan detail terlampir sebagai PDF.
    `;

    if (!env.email?.brevo?.apiKey) {
      console.warn('Email service not configured. Skipping email sending.');
      return;
    }

    try {
      // Use Brevo HTTP API directly
      // Ensure proper base64 encoding from Buffer
      const base64Content = Buffer.isBuffer(pdfBuffer) 
        ? pdfBuffer.toString('base64') 
        : Buffer.from(pdfBuffer).toString('base64');
      
      const payload = {
        sender: {
          name: env.email.fromName,
          email: env.email.fromAddress
        },
        to: emailAddresses.map(email => ({
          email: email,
          name: email,
        })),
        subject,
        htmlContent: html,
        textContent: text,
        attachment: [
          {
            content: base64Content,
            name: `evaluation_report_${notification.contractNumber}.pdf`
          }
        ]
      };

      // Send email with PDF attachment
      await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': env.email.brevo.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.info(`Evaluation report email sent successfully to ${emailAddresses.join(', ')}`);
    } catch (error: any) {
      const detailedMessage = error.response?.data?.message || error.message || 'Unknown error occurred while sending email';
      console.error('Failed to send evaluation report email:', detailedMessage, error.response?.data);
      const enhancedError = new Error(detailedMessage);
      (enhancedError as any).response = error.response;
      throw enhancedError;
    }
  }

  // New method for grouped assessment notifications
  async sendGroupedAssessmentFolderNotifications(
    recipients: { email: string; name: string }[],
    notification: GroupedAssessmentFolderNotification
  ): Promise<void> {
    if (!recipients.length || !notification.notifications.length) return;

    const emailAddresses = recipients.map(r => r.email);
    
    const subject = `Pemberitahuan Batas Waktu Penilaian (${notification.notifications.length} Folder)`;

    // Build HTML table for multiple assessments
    let assessmentsTable = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Mitra Kerja</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Kontrak</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Penilaian</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Jenis</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Batas Waktu</th>
            <th style="border: 1px solid #ddd; padding: 10px; font-weight: bold; background-color: #f3f4f6;">Sisa Waktu</th>
          </tr>
        </thead>
        <tbody>
    `;

    notification.notifications.forEach(assessment => {
      assessmentsTable += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.contractorName}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.contractName}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.folderName}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.assessmentType}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.assessmentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${assessment.daysUntilAssessment} hari lagi</td>
        </tr>
      `;
    });

    assessmentsTable += `
        </tbody>
      </table>
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="background-color: #004b87; color: white; padding: 16px 24px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
          <h2 style="margin: 0; font-size: 20px;">Pemberitahuan Batas Waktu Penilaian</h2>
          <p style="margin: 4px 0 0; font-size: 14px;">PENILAIAN &nbsp;•&nbsp;PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="padding: 24px;">
          <p>Yth. <strong>Mitra Kerja</strong>,</p>
          <p>
            Kami ingin menginformasikan bahwa ${notification.notifications.length} folder penilaian berikut akan <strong>segera mencapai batas waktu</strong>.
            Mohon agar dilakukan tindakan yang diperlukan sebelum batas waktu agar proses operasional tetap berjalan dengan lancar.
          </p>

          ${assessmentsTable}

          <p>Harap segera melakukan tindakan yang diperlukan sebelum batas waktu berakhir.</p>

          <p style="margin-top: 24px;">Hormat kami,<br/>
          <strong>Administrator Sistem</strong><br/>
          PT Pertamina Hulu Energi OSES</p>
        </div>

        <div style="background-color: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center; padding: 12px; border-top: 1px solid #e5e7eb;">
          Email ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.
        </div>
      </div>
    `;

    // Build text version
    let text = `
    Pemberitahuan Batas Waktu Penilaian
    PT Pertamina Hulu Energi OSES

    Daftar Folder Penilaian yang akan Mencapai Batas Waktu:
    `;

    notification.notifications.forEach(assessment => {
      text += `
    - Mitra Kerja: ${assessment.contractorName}
      Kontrak: ${assessment.contractName}
      Penilaian: ${assessment.folderName}
      Jenis: ${assessment.assessmentType}
      Batas Waktu: ${assessment.assessmentDate.toLocaleDateString('id-ID')}
      Sisa Waktu: ${assessment.daysUntilAssessment} hari lagi
      `;
    });

    text += `
    Harap segera melakukan tindakan yang diperlukan sebelum batas waktu berakhir.
    `;

    await this.sendEmail({
      to: emailAddresses,
      subject,
      html,
      text,
    });
  }
}

export default new EmailService();
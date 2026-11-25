import path from 'path';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  employees,
  contracts,
  mcus,
  bpjs,
  vaccinations,
  certificates,
  sika,
  employeeStatus,
  attendance,
} from '../../db/schema/employee.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { uploadEmployeeFilesService } from './upload.service.ts';
import { getTimestampFilename } from '../../utils/utils.ts';
import { createOrUpdateUserAccountForEmployee } from './create-user-account.service.ts';
import { recalculateLogManhoursForDate } from '../daily-report/logManhoursTrigger.service.ts';
import type { UploadedFile } from '../../types/file.ts';
import type { CreateFullEmployeeInput } from '../../schema/employee.schema.ts';
import { getEmployeeDetailService } from './detail.service.ts';

interface CertificateInput {
  name: string;
  expiredDate?: string;
  isPermanent?: boolean;
  status?: string;
  files?: UploadedFile[];
}

interface CreateEmployeeWithImageInput extends Omit<CreateFullEmployeeInput, 'image' | 'certificates'> {
  image?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
  certificates?: CertificateInput | CertificateInput[];
  files?: {
    contract?: UploadedFile[];
    mcu?: UploadedFile[];
    bpjs?: UploadedFile[];
    vaccination?: UploadedFile[];
    sika?: UploadedFile[];
  };
}

export const createEmployeeService = async (data: CreateEmployeeWithImageInput) => {
  const {
    contract,
    mcu,
    bpjs: bpjsData,
    vaccination,
    certificates: certList,
    sika: sikaData,
    image,
    files,
    ...employeeData
  } = data;

  let renamedImage = '';
  if (image) {
    renamedImage = getTimestampFilename(image.filename);
  }

  let projectName = employeeData.projectName;
  if (employeeData.projectId) {
    const [sub] = await db
      .select({ name: subtypes.name })
      .from(subtypes)
      .where(eq(subtypes.id, employeeData.projectId));
    if (sub?.name) {
      projectName = sub.name;
    }
  }

  const rawPayload = {
    ...employeeData,
    projectName,
    image: image ? renamedImage : null,
    verifiedBy: null,
    verifiedDate: null,
    remarks: null,
  };

  const cleanedPayload = Object.fromEntries(
    Object.entries(rawPayload).filter(([, v]) => v !== undefined && v !== '')
  ) as typeof rawPayload;

  let employee;
  try {
    [employee] = await db.insert(employees).values(cleanedPayload).returning();
  } catch (error: any) {
    // Handle specific database constraint errors
    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    // Check for NOT NULL constraint on sub_contractor_id
    if (errorMessage.includes('sub_contractor_id') && (errorCode === '23502' || errorMessage.includes('not-null'))) {
      const err = new Error(
        'Perusahaan/Kontraktor (Sub Contractor) wajib dipilih. Pastikan Anda telah memilih perusahaan yang valid sebelum membuat karyawan baru.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Check for foreign key constraint
    if (errorCode === '23503' && errorMessage.includes('sub_contractor_id')) {
      const err = new Error(
        'Perusahaan/Kontraktor yang dipilih tidak ditemukan dalam sistem. Silakan pilih perusahaan yang valid.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Check for duplicate identity number
    if (errorMessage.includes('identity_number') || errorMessage.includes('unique')) {
      const err = new Error(
        'Nomor identitas (KTP/Paspor) sudah terdaftar dalam sistem. Gunakan nomor identitas yang berbeda.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Check for duplicate HSSE passport number
    if (errorMessage.includes('hsse_passport_number') || errorMessage.includes('hsse_passport_number')) {
      const err = new Error(
        'Nomor HSSE Passport sudah terdaftar. Gunakan nomor yang berbeda atau perbarui data karyawan yang ada.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Re-throw the original error with better context
    const err = new Error(
      `Gagal membuat data karyawan: ${errorMessage}. Periksa kembali data yang Anda masukkan dan pastikan semua field wajib sudah diisi.`
    );
    (err as any).statusCode = 400;
    throw err;
  }
  const employeeId = employee.id;

  // === Create employeeStatus record if statusOnDuty is explicitly set (true or false)
  if (typeof employee.statusOnDuty === 'boolean') {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (employee.statusOnDuty === true) {
      // Create ON DUTY status
      await db.insert(employeeStatus).values({
        employeeId,
        isOnDuty: true,
        lastCheckIn: now,
        currentCycleStartDate: today,
        updatedAt: now,
      });

      // Create attendance record for ON DUTY
      await db.insert(attendance).values({
        employeeId,
        attendanceDate: today,
        statusAfter: 'on_duty',
        photoEvidence: null,
        notes: 'Status awal pada saat pembuatan data karyawan',
        position: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Create OFF DUTY status
      await db.insert(employeeStatus).values({
        employeeId,
        isOnDuty: false,
        lastCheckOut: now,
        currentCycleStartDate: null,
        updatedAt: now,
      });

      // Create attendance record for OFF DUTY
      await db.insert(attendance).values({
        employeeId,
        attendanceDate: today,
        statusAfter: 'off_duty',
        photoEvidence: null,
        notes: 'Initial status on employee creation',
        position: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Trigger recalculation of log_manhours for today
    await recalculateLogManhoursForDate(today);
  }

  if (image) {
    const employeeFolder = path.resolve(process.cwd(), '../uploads', 'employees', employeeId);
    await fs.mkdir(employeeFolder, { recursive: true });
    await fs.writeFile(path.join(employeeFolder, renamedImage), image.buffer);
  }

  if (contract && Object.keys(contract).length > 0) {
    const [inserted] = await db.insert(contracts).values({ ...contract, employeeId }).returning();
    if (files?.contract?.length) {
      await uploadEmployeeFilesService({
        employeeId,
        files: files.contract,
        type: 'contracts',
        relatedId: inserted.id,
      });
    }
  }

  if (mcu && Object.keys(mcu).length > 0) {
    const [inserted] = await db.insert(mcus).values({ ...mcu, employeeId }).returning();
    if (files?.mcu?.length) {
      await uploadEmployeeFilesService({
        employeeId,
        files: files.mcu,
        type: 'mcus',
        relatedId: inserted.id,
      });
    }
  }

  if (bpjsData && Object.keys(bpjsData).length > 0) {
    const [inserted] = await db.insert(bpjs).values({ ...bpjsData, employeeId }).returning();
    if (files?.bpjs?.length) {
      await uploadEmployeeFilesService({
        employeeId,
        files: files.bpjs,
        type: 'bpjs',
        relatedId: inserted.id,
      });
    }
  }

  if (vaccination && Object.keys(vaccination).length > 0) {
    const [inserted] = await db.insert(vaccinations).values({ ...vaccination, employeeId }).returning();
    if (files?.vaccination?.length) {
      await uploadEmployeeFilesService({
        employeeId,
        files: files.vaccination,
        type: 'vaccinations',
        relatedId: inserted.id,
      });
    }
  }

  if (certList) {
    const certs = Array.isArray(certList) ? certList : [certList];
    
    for (const cert of certs) {
      if (typeof cert === 'object' && cert.name) {
        const { files: certFiles, ...certData } = cert as any;
        const [inserted] = await db.insert(certificates).values({ ...certData, employeeId }).returning();

        if (certFiles?.length) {
          await uploadEmployeeFilesService({
            employeeId,
            files: certFiles,
            type: 'certificates',
            relatedId: inserted.id,
          });
        }
      }
    }
  }

  if (sikaData && Object.keys(sikaData).length > 0) {
    const [inserted] = await db.insert(sika).values({ ...sikaData, employeeId }).returning();
    if (files?.sika?.length) {
      await uploadEmployeeFilesService({
        employeeId,
        files: files.sika,
        type: 'sika',
        relatedId: inserted.id,
      });
    }
  }

  const detail = await getEmployeeDetailService(employeeId);

  // === Create user account if hssePassportNumber exists
  if (employeeData.hssePassportNumber && employeeData.employeeName) {
    await createOrUpdateUserAccountForEmployee({
      hssePassportNumber: employeeData.hssePassportNumber,
      employeeName: employeeData.employeeName,
      dateOfBirth: employeeData.dateOfBirth,
      image: renamedImage || null,
    });
  }

  return { detail };
};

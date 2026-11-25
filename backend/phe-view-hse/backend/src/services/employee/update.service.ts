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
  certificates as employeeCertificates,
  sika,
} from '../../db/schema/employee.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { uploadEmployeeFilesService as UploadFiles } from './upload.service.ts';
import { getEmployeeDetailService } from './detail.service.ts';
import { getTimestampFilename } from '../../utils/utils.ts';
import { createOrUpdateUserAccountForEmployee } from './create-user-account.service.ts';
import { recalculateLogManhoursForDate } from '../daily-report/logManhoursTrigger.service.ts';
import type { UploadedFile } from '../../types/file.ts';
import type { CreateFullEmployeeInput } from '../../schema/employee.schema.ts';

interface CertificateInput {
  id?: string;
  name: string;
  expiredDate?: string;
  isPermanent?: boolean;
  status?: string;
  files?: UploadedFile[];
}

interface UpdateEmployeeWithImageInput extends Omit<CreateFullEmployeeInput, 'image' | 'certificates'> {
  employeeId: string;
  image?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
  contract?: any;
  mcu?: any;
  bpjs?: any;
  vaccination?: any;
  sika?: any;
  certificates?: CertificateInput;
  files?: {
    contract?: UploadedFile[];
    mcu?: UploadedFile[];
    bpjs?: UploadedFile[];
    vaccination?: UploadedFile[];
    sika?: UploadedFile[];
    certificate?: UploadedFile[];
  };
}

export const updateEmployeeService = async (data: UpdateEmployeeWithImageInput) => {
  const {
    employeeId,
    image,
    contract,
    mcu,
    bpjs: bpjsData,
    vaccination,
    certificates,
    sika: sikaData,
    files = {},
    ...employeeData
  } = data;

  // === Get current employee data before update
  const [currentEmployee] = await db.select().from(employees).where(eq(employees.id, employeeId));

  // Track if hssePassportNumber is being updated or newly added
  const oldHssePassportNumber = currentEmployee?.hssePassportNumber;
  const newHssePassportNumber = employeeData.hssePassportNumber;
  // Create/update user if: new passport is provided AND (old was empty OR different from new)
  const shouldCreateOrUpdateUser = newHssePassportNumber && (!oldHssePassportNumber || newHssePassportNumber !== oldHssePassportNumber);

  // === Save Image
  let renamedImage = '';
  if (image) {
    renamedImage = getTimestampFilename(image.filename);
    const employeeFolder = path.resolve(process.cwd(), '../uploads', 'employees', employeeId);
    await fs.mkdir(employeeFolder, { recursive: true });
    await fs.writeFile(path.join(employeeFolder, renamedImage), image.buffer);
  }

  // Synchronize projectName if projectId is provided
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

  // === Update Employee Table
  const payload = Object.fromEntries(
    Object.entries({
      ...employeeData,
      ...(projectName !== undefined ? { projectName } : {}),
      image: image ? renamedImage : undefined,
      updatedAt: new Date(),
    })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v])
  );

  await db.update(employees).set(payload).where(eq(employees.id, employeeId));

  try {
    const today = new Date().toISOString().slice(0, 10);
    await recalculateLogManhoursForDate(today);
  } catch (err) {
    console.warn('[EmployeeUpdate] Warning recalculating log manhours:', err);
  }

  // === CONTRACTS
  if (contract && typeof contract === 'object') {
    const { id: contractId, files: _files, ...rest } = contract;
    let currentId = contractId;

    if (currentId) {
      await db.update(contracts).set(rest).where(eq(contracts.id, currentId));
    } else {
      const [inserted] = await db.insert(contracts)
        .values({ employeeId, ...rest })
        .returning({ id: contracts.id });
      currentId = inserted.id;
    }

    if (files.contract?.length && currentId) {
      await UploadFiles({ employeeId, files: files.contract, type: 'contracts', relatedId: currentId });
    }
  }

  // === MCUS
  if (mcu && typeof mcu === 'object') {
    const { id: mcuId, files: _files, ...rest } = mcu;
    let currentId = mcuId;

    if (currentId) {
      await db.update(mcus).set(rest).where(eq(mcus.id, currentId));
    } else {
      const [inserted] = await db.insert(mcus)
        .values({ employeeId, ...rest })
        .returning({ id: mcus.id });
      currentId = inserted.id;
    }

    if (files.mcu?.length && currentId) {
      await UploadFiles({ employeeId, files: files.mcu, type: 'mcus', relatedId: currentId });
    }
  }

  // === BPJS
  if (bpjsData && typeof bpjsData === 'object') {
    const { id: bpjsId, files: _files, ...rest } = bpjsData;
    let currentId = bpjsId;

    if (currentId) {
      await db.update(bpjs).set(rest).where(eq(bpjs.id, currentId));
    } else {
      const [inserted] = await db.insert(bpjs)
        .values({ employeeId, ...rest })
        .returning({ id: bpjs.id });
      currentId = inserted.id;
    }

    if (files.bpjs?.length && currentId) {
      await UploadFiles({ employeeId, files: files.bpjs, type: 'bpjs', relatedId: currentId });
    }
  }

  // === VACCINATIONS
  if (vaccination && typeof vaccination === 'object') {
    const { id: vacId, files: _files, ...rest } = vaccination;
    let currentId = vacId;

    if (currentId) {
      await db.update(vaccinations).set(rest).where(eq(vaccinations.id, currentId));
    } else {
      const [inserted] = await db.insert(vaccinations)
        .values({ employeeId, ...rest })
        .returning({ id: vaccinations.id });
      currentId = inserted.id;
    }

    if (files.vaccination?.length && currentId) {
      await UploadFiles({ employeeId, files: files.vaccination, type: 'vaccinations', relatedId: currentId });
    }
  }

  // === SIKA
  if (sikaData && typeof sikaData === 'object') {
    const { id: sikaId, files: _files, ...rest } = sikaData;
    let currentId = sikaId;

    if (currentId) {
      await db.update(sika).set(rest).where(eq(sika.id, currentId));
    } else {
      const [inserted] = await db.insert(sika)
        .values({ employeeId, ...rest })
        .returning({ id: sika.id });
      currentId = inserted.id;
    }

    if (files.sika?.length && currentId) {
      await UploadFiles({ employeeId, files: files.sika, type: 'sika', relatedId: currentId });
    }
  }

  // === CERTIFICATES
  if (certificates && typeof certificates === 'object') {
    const { files: certFiles, id, ...certData } = certificates;
    const certPayload = Object.fromEntries(
      Object.entries(certData).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );

    let certId = id;
    if (certId) {
      await db.update(employeeCertificates).set(certPayload).where(eq(employeeCertificates.id, certId));
    } else {
      const [inserted] = await db.insert(employeeCertificates)
        .values({ employeeId, ...certPayload })
        .returning({ id: employeeCertificates.id });
      certId = inserted.id;
    }

    if (certFiles?.length && certId) {
      await UploadFiles({
        employeeId,
        files: certFiles,
        type: 'certificates',
        relatedId: certId,
      });
    }
  }

  // === Handle hssePassportNumber change or new addition - sync with users table
  if (shouldCreateOrUpdateUser && newHssePassportNumber && currentEmployee) {
    // Create or update user account with hssePassportNumber
    const employeeName = employeeData.employeeName || currentEmployee.employeeName;
    if (employeeName) {
      await createOrUpdateUserAccountForEmployee({
        hssePassportNumber: newHssePassportNumber,
        employeeName,
        dateOfBirth: employeeData.dateOfBirth || currentEmployee.dateOfBirth,
        image: renamedImage || currentEmployee.image || null,
      });
    }
  }

  const detail = await getEmployeeDetailService(employeeId);
  return { detail };
};

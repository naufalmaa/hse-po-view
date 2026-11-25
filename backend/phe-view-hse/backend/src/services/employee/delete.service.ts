import { db } from '../../db/index.ts';
import {
  employees,
  contracts,
  mcus,
  bpjs,
  vaccinations,
  certificates as employeeCertificates,
  sika,
  employeeFiles,
  alarmEmployeeLog,
  employeeStatus,
  smartCardObservations,
  attendance,
} from '../../db/schema/employee.schema.ts';
import type {
  DeleteByEmployeeIdInput,
  DeleteFileInput,
  DeleteSectionInput,
} from '../../types/employee.ts';
import {inArray, count} from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function deleteByEmployeeId({ employeeId, hardDelete }: DeleteByEmployeeIdInput) {
  const ids = Array.isArray(employeeId) ? employeeId : [employeeId];

  if (!hardDelete) {
    const connections: Record<string, number> = {};
    
    const [
      fileCount, contractCount, mcuCount, bpjsCount, 
      vaccinationCount, sikaCount, certificateCount, 
      alarmCount, statusCount, observationCount, attendanceCount
    ] = await Promise.all([
      db.select({ count: count() }).from(employeeFiles).where(inArray(employeeFiles.employeeId, ids)),
      db.select({ count: count() }).from(contracts).where(inArray(contracts.employeeId, ids)),
      db.select({ count: count() }).from(mcus).where(inArray(mcus.employeeId, ids)),
      db.select({ count: count() }).from(bpjs).where(inArray(bpjs.employeeId, ids)),
      db.select({ count: count() }).from(vaccinations).where(inArray(vaccinations.employeeId, ids)),
      db.select({ count: count() }).from(sika).where(inArray(sika.employeeId, ids)),
      db.select({ count: count() }).from(employeeCertificates).where(inArray(employeeCertificates.employeeId, ids)),
      db.select({ count: count() }).from(alarmEmployeeLog).where(inArray(alarmEmployeeLog.employeeId, ids)),
      db.select({ count: count() }).from(employeeStatus).where(inArray(employeeStatus.employeeId, ids)),
      db.select({ count: count() }).from(smartCardObservations).where(inArray(smartCardObservations.employeeId, ids)),
      db.select({ count: count() }).from(attendance).where(inArray(attendance.employeeId, ids)),
    ]);

    if (fileCount[0].count > 0) connections.files = Number(fileCount[0].count);
    if (contractCount[0].count > 0) connections.contracts = Number(contractCount[0].count);
    if (mcuCount[0].count > 0) connections.mcus = Number(mcuCount[0].count);
    if (bpjsCount[0].count > 0) connections.bpjs = Number(bpjsCount[0].count);
    if (vaccinationCount[0].count > 0) connections.vaccinations = Number(vaccinationCount[0].count);
    if (sikaCount[0].count > 0) connections.sika = Number(sikaCount[0].count);
    if (certificateCount[0].count > 0) connections.certificates = Number(certificateCount[0].count);
    if (alarmCount[0].count > 0) connections.alarms = Number(alarmCount[0].count);
    if (statusCount[0].count > 0) connections.status = Number(statusCount[0].count);
    if (observationCount[0].count > 0) connections.observations = Number(observationCount[0].count);
    if (attendanceCount[0].count > 0) connections.attendance = Number(attendanceCount[0].count);

    if (Object.keys(connections).length > 0) {
      return { employeeId: ids, connections, requiresConfirmation: true };
    }
  }

  const files = await db.select().from(employeeFiles).where(inArray(employeeFiles.employeeId, ids));

  for (const file of files) {
    if (!file.filePath || !file.employeeId) continue;

    const basePath = path.resolve(process.cwd(), '../uploads', 'employees', file.employeeId);
    await fs.rm(path.join(basePath, file.filePath), { force: true });
    await fs.rm(path.join(basePath, 'thumbnail', file.filePath), { force: true });
  }

  await db.delete(employeeFiles).where(inArray(employeeFiles.employeeId, ids));
  await db.delete(contracts).where(inArray(contracts.employeeId, ids));
  await db.delete(mcus).where(inArray(mcus.employeeId, ids));
  await db.delete(bpjs).where(inArray(bpjs.employeeId, ids));
  await db.delete(vaccinations).where(inArray(vaccinations.employeeId, ids));
  await db.delete(sika).where(inArray(sika.employeeId, ids));
  await db.delete(employeeCertificates).where(inArray(employeeCertificates.employeeId, ids));
  await db.delete(alarmEmployeeLog).where(inArray(alarmEmployeeLog.employeeId, ids));
  await db.delete(employeeStatus).where(inArray(employeeStatus.employeeId, ids));
  await db.delete(smartCardObservations).where(inArray(smartCardObservations.employeeId, ids));
  await db.delete(attendance).where(inArray(attendance.employeeId, ids));
  await db.delete(employees).where(inArray(employees.id, ids));

  return { employeeId : ids };
}

export async function deleteSectionById({ section, sectionId }: DeleteSectionInput) {
  const map = {
    contracts: { table: contracts, fileColumn: employeeFiles.contractId },
    mcus: { table: mcus, fileColumn: employeeFiles.mcuId },
    bpjs: { table: bpjs, fileColumn: employeeFiles.bpjsId },
    vaccinations: { table: vaccinations, fileColumn: employeeFiles.vaccinationId },
    sika: { table: sika, fileColumn: employeeFiles.sikaId },
    certificates: { table: employeeCertificates, fileColumn: employeeFiles.certificateId },
  };

  const entry = map[section];
  if (!entry) throw new Error('Invalid section name');

  const ids = Array.isArray(sectionId) ? sectionId : [sectionId];

  // Cari semua file yang punya foreign key ke section ini
  const files = await db.select().from(employeeFiles).where(inArray(entry.fileColumn, ids));

  // Hapus file fisik
  for (const file of files) {
    if (!file.employeeId || !file.filePath) continue;

    const uploadPath = path.resolve(process.cwd(), '../uploads', 'employees', file.employeeId);
    const filePath = path.join(uploadPath, file.filePath);
    const thumbPath = path.join(uploadPath, 'thumbnail', file.filePath);

    await fs.rm(filePath, { force: true });
    await fs.rm(thumbPath, { force: true });
  }

  // Hapus file record dari employeeFiles
  if (files.length > 0) {
    const fileIds = files.map(f => f.id);
    await db.delete(employeeFiles).where(inArray(employeeFiles.id, fileIds));
  }

  // Hapus data dari table section utama
  await db.delete(entry.table).where(inArray(entry.table.id, ids));

  return { sectionId : ids };
}

export async function deleteFile({ fileId }: DeleteFileInput) {
  const ids = Array.isArray(fileId) ? fileId : [fileId];

  const files = await db.select().from(employeeFiles).where(inArray(employeeFiles.id, ids));

  for (const file of files) {
    if (!file.employeeId || !file.filePath) continue;

    const uploadPath = path.resolve(process.cwd(), '../uploads', 'employees', file.employeeId);
    const filePath = path.join(uploadPath, file.filePath);
    const thumbPath = path.join(uploadPath, 'thumbnail', file.filePath);

    await fs.rm(filePath, { force: true });
    await fs.rm(thumbPath, { force: true });
  }

  await db.delete(employeeFiles).where(inArray(employeeFiles.id, ids));
  
  return { fileId: ids };
}

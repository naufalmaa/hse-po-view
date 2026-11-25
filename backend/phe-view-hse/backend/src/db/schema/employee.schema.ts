/* c8 ignore start */
import { pgTable, uuid, text, timestamp, date, boolean, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { subContractors } from "./auth.schema.ts";
import { subtypes, workLocations } from "./report.schema.ts";
import { vessels, users } from "./auth.schema.ts";

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  subContractorId: uuid('sub_contractor_id').notNull().references(() => subContractors.id),
  category: text('category'), // 'crew marine', 'mitra', 'project'
  employeeName: text('employee_name'),
  dateOfBirth: date('date_of_birth'),
  position: text('position'),
  image: text('image'),
  vesselId: uuid('vessel_id').references(() => vessels.id), // hanya untuk tipe 'crew marine'
  projectId: uuid('project_id').references(() => subtypes.id), // hanya untuk tipe 'project'
  projectName: text('project_name'), // hanya untuk tipe 'project'
  location: text('location'),
  identityNumber: text('identity_number'),
  hssePassportNumber: text('hsse_passport_number').unique(),
  statusOnDuty: boolean('status_on_duty').default(false),
  linkDataEmployee: text('link_data_employee'), // hanya untuk mitra kerja
  verifiedBy: text('verified_by'),
  verifiedDate: date('verified_date'),
  remarks: text('remarks'),
  otherHealthAssurance: text('other_health_assurance'), // Other Health Assurance
  ppe: text('ppe'), // Alat Pelindung Diri (Personal Protective Equipment)
  validationStatus: text('validation_status', {
    enum: ['pending', 'verified', 'rejected'],
  }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const bpjs = pgTable('employee_bpjs', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  bpjsEmployment: text('bpjs_employment'),
  bpjsHealth: text('bpjs_health'),
});

export const contracts = pgTable('employee_contracts', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  contractCode: text('contract_code'),
  expiredDate: date('expired_date'),
  expiredDateCompany: date('expired_date_company'),
});

export const vaccinations = pgTable('employee_vaccinations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  vaccineDate: date('vaccine_date'),
  vaccineStatus: text('vaccine_status'),
});

export const mcus = pgTable('employee_mcus', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  mcuDate: date('mcu_date'),
  mcuExpiredDate: date('mcu_expired_date'),
  mcuHospitalName: text('mcu_hospital_name'),
  mcuDeviationNotes: text('mcu_deviation_notes'),
  mcuFollowUp: text('mcu_follow_up'),
  ohihReview: text('ohih_review'),
  statusKelaikanBekerja: text('status_kelaikan_bekerja'), // Status Kelaikan Bekerja (work fitness status)
  skjScore: text('skj_score'), // Skor Kardiovaskuler Jakarta
});

export const certificates = pgTable('employee_certificates', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  name: text('name'), // e.g. 'Rigger', 'BST', etc.
  expiredDate: date('expired_date'),
  isPermanent: boolean('is_permanent').default(false),
  status: varchar("status", { length: 255 }),
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
});

export const sika = pgTable('employee_sika', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  type: text('type'),
  status: text('status'),
  expiredDate: date('expired_date'),
});

export const employeeFiles = pgTable('employee_files', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  contractId: uuid('contract_id').references(() => contracts.id),
  mcuId: uuid('mcu_id').references(() => mcus.id),
  bpjsId: uuid('bpjs_id').references(() => bpjs.id),
  vaccinationId: uuid('vaccination_id').references(() => vaccinations.id),
  certificateId: uuid('certificate_id').references(() => certificates.id),
  sikaId: uuid('sika_id').references(() => sika.id),
  type: text('type'), // 'mcu', 'certificate', 'bpjs', 'sika'
  fileName: text('file_name'),
  filePath: text('file_path'),
  fileType: text('file_type'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow()
});

export const alarmEmployeeLog = pgTable('employee_alarm_log', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').references(() => employees.id),
  type: text('type'), // 'contract', 'certificate', 'mcu', etc.
  message: text('message'),
  status: text('status'), // 'expired' | 'warning'
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow(),
});

export const employeeStatus = pgTable('employee_status', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id).unique(),
  isOnDuty: boolean('is_on_duty').default(false),
  lastCheckIn: timestamp('last_check_in', { withTimezone: true }),
  lastCheckOut: timestamp('last_check_out', { withTimezone: true }),
  currentCycleStartDate: date('current_cycle_start_date'), // Tanggal mulai hitung DOB untuk cycle saat ini
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Attendance (Absensi) Table - stores photo evidence for duty status changes
export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  attendanceDate: date('attendance_date').notNull(),
  statusAfter: text('status_after', {
    enum: ['on_duty', 'off_duty'],
  }).notNull(), // status after this attendance record
  workLocationId: uuid('work_location_id').references(() => workLocations.id, { onDelete: 'set null' }),
  photoEvidence: text('photo_evidence'), // Path to photo file
  notes: text('notes'),
  position: jsonb('position'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const smartCardObservations = pgTable('smart_card_observations', {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  // Employee Relation - hanya link ke employee table
  employeeId: uuid('employee_id').notNull().references(() => employees.id), // Relasi ke data pribadi employee

  // Observation Details
  observationDate: date('observation_date'), // Tanggal
  observationTime: text('observation_time'), // Waktu/Jam
  observationFunction: text('observation_function'), // Fungsi / Bagian
  observationArea: text('observation_area'), // Area Pengamatan
  specificLocation: text('specific_location'), // Lokasi Spesifik

  // Report Categories
  reportCategory: text('report_category'), // Pilih Kategori Laporan
  observedBehavior: text('observed_behavior'), // Perilaku yang Anda amati
  observedAspectCategory: text('observed_aspect_category'), // Kategori aspek yang Anda amati

  // Worker Safety
  worker: text('worker'), // PEKERJA
  ppeTypeObserved: text('ppe_type_observed'), // Jenis APD yang diamati
  unsafePpeCause: text('unsafe_ppe_cause'), // Penyebab APD Tidak Aman

  // Safety Categories
  equipmentTools: text('equipment_tools'), // PERALATAN & PERLENGKAPAN
  material: text('material'), // MATERIAL
  proceduresAdminControl: text('procedures_admin_control'), // PROSEDUR & PENGENDALIAN ADMINISTRATIF
  workEnvironment: text('work_environment'), // LINGKUNGAN KERJA

  // Intervention Details
  unsafeBehaviorDescription: text('unsafe_behavior_description'), // Deskripsikan temuan perilaku TIDAK AMAN yang Anda intervensi
  agreedFollowUp: text('agreed_follow_up'), // Tindak lanjut yang disepakati
  clsr: text('clsr'), // CLSR

  // Stop Work Authority
  stopWorkAuthority: boolean('stop_work_authority'), // Apakah anda memberhentikan pekerjaan ketika melihat perilaku dan atau kondisi lingkungan kerja tidak selamat
  currentInterventionStatus: text('current_intervention_status'), // Status Intervensi (saat ini)

  // Findings Details
  findingDescription: text('finding_description'), // Uraian Temuan
  rootCause: text('root_cause'), // Penyebab Dasar
  potentialImpact: text('potential_impact'), // Potensi Dampak
  currentHandling: text('current_handling'), // Penanganan Saat Ini
  followUpHandling: text('follow_up_handling'), // Penanganan Lanjutan (jika ada)
  followUpPriority: text('follow_up_priority'), // Prioritas Tindak Lanjut
  responsiblePerson: text('responsible_person'), // Penanganggung Jawab
  ucFindingStatus: text('uc_finding_status'), // Status Temuan UC

  // What-Who-How Analysis
  what: text('what'), // WHAT
  who: text('who'), // WHO
  how: text('how'), // HOW

  // Near Miss
  nearMissHandling: text('near_miss_handling'), // Penanganan Near Miss
  nearMissCategory: text('near_miss_category'), // Kategori Near Miss
  nearMissPotentialImpact: text('near_miss_potential_impact'), // Potensi Dampak Near Miss
  additionalNotes: text('additional_notes'), // Catatan / Keterangan Tambahan
  clsr2: text('clsr2'), // CLSR2
  currentNearMissStatus: text('current_near_miss_status'), // Status Near Miss (saat ini)

  // System fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Upload History Table
export const uploadHistory = pgTable('upload_history', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  status: text('status', {
    enum: ['success', 'error'],
  }).notNull(),
  totalRows: integer('total_rows'),
  validRows: integer('valid_rows'),
  errorRows: integer('error_rows'),
  skippedRows: integer('skipped_rows'),
  insertedRows: integer('inserted_rows'),
  firstId: integer('first_id'),
  lastId: integer('last_id'),
  errorMessage: text('error_message'),
  hasErrors: boolean('has_errors').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const uploadObservationErrors = pgTable('upload_observation_errors', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  uploadHistoryId: uuid('upload_history_id').references(() => uploadHistory.id, { onDelete: 'cascade' }), // Link to upload session
  originalRow: text('original_row'), // JSON string - raw row data from Excel
  errorType: text('error_type'), // e.g., "Employee not found", "Duplicate date", "Validation error"
  suggestions: text('suggestions'), // JSON string - list of possible matches for employee/company
  status: text('status', {
    enum: ['error', 'resolved'],
  }).default('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pobUnmatchedLogs = pgTable('pob_unmatched_logs', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  unmatchedCount: integer('unmatched_count').default(0),
  filename: text('filename'),
  data: jsonb('data').$type<any[]>(), // Store array of { excelData: any, suggestions: any[] }
});



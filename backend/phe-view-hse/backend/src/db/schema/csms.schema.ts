/* c8 ignore start */
import { pgTable, pgEnum, text, jsonb, date, timestamp, uuid, varchar, boolean, integer, numeric, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ltree } from "./custom/ltree.ts";
import { vector } from "./custom/pgvector.ts";
import { subContractors, vessels, users } from "./auth.schema.ts";

export const StatusContractEnum = pgEnum('StatusContractEnum', ['pending', 'accept', 'reject', 'revision'])

export const guideline = pgTable('csms_guideline', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow().notNull(),
})

export const risk_assessment = pgTable('csms_risk_assessment', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 100 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow().notNull(),
})

export const qualification_assessment = pgTable('csms_qualification_assessment', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  numberCertificate: varchar('number_certificate', { length: 255 }).notNull(),
  assessmentDate: date('assessment_date').notNull(),
  expiredDate: date('expired_date').notNull(),
  qualifiedValue: varchar('qualified_value', { length: 255 }).notNull(),
  assessmentResult: varchar('assessment_result', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow().notNull(),
})

export const contract = pgTable('csms_contract', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  vesselId: uuid('vessel_id').references(() => vessels.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  numberContract: varchar('number_contract', { length: 255 }).notNull(),
  riskAssessmentId: varchar('risk_assessment_id', { length: 255 }).default('-').notNull(),
  riskLevel: varchar('risk_level', { length: 50 }).default('N/A').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  nearestOngoingAssessmentDate: jsonb('nearest_ongoing_assessment_date'),
  finalAssessmentDate: date('final_assessment_date').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  extra: jsonb('extra')
})

export const file = pgTable('csms_file', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  guidelineId: uuid('guideline_id').references(() => guideline.id, { onDelete: 'cascade' }),
  riskAssessmentId: uuid('risk_assessment_id').references(() => risk_assessment.id, { onDelete: 'cascade' }),
  qualificationAssessmentId: uuid('qualification_assessment_id').references(() => qualification_assessment.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  note: text('note'),
})

export const contractFolder = pgTable('csms_contract_folder', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contract.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id')
    .references((): any => contractFolder.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  path: ltree('path').notNull(),
  depth: integer('depth').generatedAlwaysAs(sql`(nlevel(path) - 1)::integer`),
  fileType: varchar('file_type', { length: 50 }), // 'folder', 'file', 'assessment'
  filePath: text('file_path'),
  isComplete: boolean('is_complete'),
  status: StatusContractEnum('status').notNull().default('pending'),
  score: numeric('score', { precision: 5, scale: 2 }).notNull().default('0'),
  aiStatus: StatusContractEnum('ai_status').notNull().default('pending'),
  aiScore: numeric('ai_score', { precision: 5, scale: 2 }).notNull().default('0'),
  aiReasoning: text('ai_reasoning'),
  note: text('note'),
  noteContractor: text('note_contractor'), // Note from contractor role only
  userId: uuid('user_id').array(), // Array of user IDs
  isFinal: boolean('is_final'), // Add isFinal field for depth 0 folders
  isCopy: integer('is_copy').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  assessmentDate: timestamp('assessment_date', { withTimezone: true }),
  aiProcessedAt: timestamp('ai_processed_at', { withTimezone: true }),
  // who last changed the User note (note) / the contractor note (note_contractor), shown in the Catatan panel
  noteUpdatedBy: uuid('note_updated_by'),
  noteUpdatedAt: timestamp('note_updated_at', { withTimezone: true }),
  noteContractorUpdatedBy: uuid('note_contractor_updated_by'),
  noteContractorUpdatedAt: timestamp('note_contractor_updated_at', { withTimezone: true }),
}, (t) => [
  // created at boot by src/db/ensure/06-csms.ts (and scripts/sql/2026-11-17-csms-contract-folder-indexes.sql)
  index('csms_contract_folder_parent_id_idx').on(t.parentId),
  index('csms_contract_folder_contract_id_idx').on(t.contractId),
  index('csms_contract_folder_path_gist_idx').using('gist', t.path),
])

export const approvalLog = pgTable('csms_approval_log', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  folderId: uuid('folder_id').notNull().references(() => contractFolder.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').notNull().references(() => contract.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // User who approved (nullable if pending)
  approvalLevel: varchar('approval_level', { length: 50 }).notNull(), // 'evaluator' | 'verifikator' | 'manager'
  status: varchar('status', { length: 50 }).notNull(), // 'approved' | 'rejected' | 'pending'
  note: text('note'), // Optional note for rejection or additional info
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // FK lookups / ON DELETE CASCADE (see src/db/ensure/06-csms.ts)
  index('csms_approval_log_folder_id_idx').on(t.folderId),
  index('csms_approval_log_contract_id_idx').on(t.contractId),
])

export const alarmCsmsLog = pgTable('csms_alarm_log', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').references(() => contract.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'contract' or 'qualification'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: text('status'), // 'expired' | 'warning'
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  // FK lookups / ON DELETE CASCADE (see src/db/ensure/06-csms.ts)
  index('csms_alarm_log_contract_id_idx').on(t.contractId),
])

export const evaluationEmailLog = pgTable('csms_evaluation_email_log', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractId: uuid('contract_id').notNull().references(() => contract.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').notNull().references(() => contractFolder.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('sent'), // 'sent' | 'failed'
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // FK lookups / ON DELETE CASCADE (see src/db/ensure/06-csms.ts)
  index('csms_evaluation_email_log_folder_id_idx').on(t.folderId),
  index('csms_evaluation_email_log_contract_id_idx').on(t.contractId),
])

export const csmsKnowledgeBase = pgTable('csms_knowledge_base', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  categoryId: varchar('category_id', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  documentRequirements: jsonb('document_requirements'),
  validationRules: jsonb('validation_rules'),
  scoringRules: jsonb('scoring_rules'),
  userContext: text('user_context'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const csmsEvidenceChunk = pgTable('csms_evidence_chunk', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractFolderId: uuid('contract_folder_id')
    .notNull()
    .references(() => contractFolder.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // FK lookups / ON DELETE CASCADE (see src/db/ensure/06-csms.ts)
  index('csms_evidence_chunk_contract_folder_id_idx').on(t.contractFolderId),
])

export const csmsAiEvaluationJob = pgTable('csms_ai_evaluation_job', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractFolderId: uuid('contract_folder_id')
    .notNull()
    .references(() => contractFolder.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('queued'), // 'queued' | 'processing' | 'completed' | 'failed'
  progressMessage: text('progress_message'),
  errorMessage: text('error_message'),
  jurorScores: jsonb('juror_scores'), // { compliance: 6, evidence: 6, hse: 10 }
  // granular run: only these elements/groups of the assessment folder (null = whole folder)
  targetFolderIds: uuid('target_folder_ids').array(),
  mode: varchar('mode', { length: 20 }).notNull().default('thorough'), // 'fast' | 'thorough'
  // trial run of a rubric version on reference folders: results go to csms_ai_trial_result, folders keep their AI results
  trial: boolean('trial').notNull().default(false),
  rubricVersionId: uuid('rubric_version_id'),
  modelUsed: varchar('model_used', { length: 100 }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // FK lookups / ON DELETE CASCADE (see src/db/ensure/06-csms.ts)
  index('csms_ai_evaluation_job_contract_folder_id_idx').on(t.contractFolderId),
])
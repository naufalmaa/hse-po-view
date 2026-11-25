/* c8 ignore start */
import { integer, pgTable, text, timestamp, uuid, varchar, date, unique, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./auth.schema.ts";

export const subtypes = pgTable("subtypes", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  extra: jsonb('extra'),
}, (t) => [unique('subtypesNameKey').on(t.name)]);

export const workLocations = pgTable('work_locations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => subtypes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  latitude: varchar('latitude', { length: 50 }),
  longitude: varchar('longitude', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [unique('work_locations_project_name_unique').on(t.projectId, t.name)]);

export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportDate: date('report_date').notNull(),
  reportedBy: varchar('reported_by', { length: 100 }).notNull(),
  instansi: varchar('instansi', { length: 100 }).notNull(),
  formType: varchar('form_type', { length: 50 }).notNull(), // 'project' | 'marine'
  workLocationId: uuid('work_location_id').references(() => workLocations.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const dailyReportSubtypes = pgTable('daily_report_subtypes', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  subtypeId: uuid('subtype_id').notNull().references(() => subtypes.id, { onDelete: 'cascade' })
});

// project report
export const laggingIndicators = pgTable('report_lagging_indicators', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('description'),
  statusFreeLtaRi: boolean('status_free_lta_ri'),
  freeLtaDays: integer('free_lta_days'),
  freeRiDays: integer('free_ri_days'),
  recordableIncident: integer('recordable_incident'),
  nonRecordableIncident: integer('non_recordable_incident'),
  fatality: integer('fatality'),
  lti: integer('lti'),
  restrictedWorkDayCase: integer('restricted_work_day_case'),
  medicalTreatmentCase: integer('medical_treatment_case'),
  firstAid: integer('first_aid'),
  nearMiss: integer('near_miss'),
  unsafeAction: integer('unsafe_action'),
  unsafeCondition: integer('unsafe_condition'),
  environmentalDamage: integer('environmental_damage'),
  propertyDamage: integer('property_damage')
});

export const manhours = pgTable('report_manhours', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  pobPheOses: integer('pob_phe_oses'),
  pobContractor: integer('pob_contractor'),
  hoursPobPheOses: integer('hours_pob_phe_oses'),
  hoursPobContractor: integer('hours_pob_contractor')
});

export const meetings = pgTable('report_meetings', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('meeting_description'),
  jenisMeeting: text('jenis_meeting'),
  absencePercentage: integer('absence_percentage'),
  toolbox: integer('toolbox_meeting'),
  toolboxTalk: integer('tool_box_talk'),
  generalSafety: integer('general_safety_meeting'),
  safetyCommittee: integer('safety_committee_meeting'),
  preJob: integer('pre_job_safety_meeting'),
  monthlySafety: integer('monthly_safety_meeting'),
  hsseSiteOrientation: integer('hsse_site_orientation_meeting'),
  marineContractorMeeting: integer('marine_contractor_meeting'),
  safetyStandDownMeeting: integer('safety_stand_down_meeting'),
  managementVisit: integer('management_visit'),
  marineSafetyCampaign: integer('marine_safety_campaign'),
  learningFromCampaignEvent: integer('learning_from_campaign_event'),
  others: integer('others_meeting')
});

export const drills = pgTable('report_drills', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('drill_description'),
  totalParticipants: integer('total_participants'),
  fireDrill: integer('fire_drill'),
  abandonDrill: integer('abandon_drill'),
  musteringDrill: integer('mustering_drill'),
  medievacDrill: integer('medievac_drill'),
  h2sDrill: integer('h2s_drill'),
  oilPollutionPreventionDrill: integer('oil_pollution_prevention_drill'),
  steeringGearFailureDrill: integer('steering_gear_failure_drill'),
  manOverboardDrill: integer('man_overboard_drill'),
  groundingDrill: integer('grounding_drill'),
  firstAidDrill: integer('first_aid_drill'),
  collisionDrill: integer('collision_drill'),
  dryDrill: integer('dry_drill'),
  wetDrill: integer('wet_drill'),
  othersDrill: integer('others_drill')
});

export const trainings = pgTable('report_trainings', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('training_description'),
  totalParticipants: integer('total_participants'),
  clsr: integer('clsr'),
  akhlak: integer('akhlak'),
  unsafeActionCategory: integer('unsafe_action_category'),
  sika: integer('sika'),
  l2ra: integer('l2ra'),
  preSiteInduction: integer('pre_site_induction'),
  siteInduction: integer('site_induction'),
  shipboardTraining: integer('shipboard_training'),
  othersTraining: integer('others_training')
});

export const inspections = pgTable('report_inspections', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  type: varchar('type', { length: 20 })
    .notNull()
    .$type<'pre_use' | 'field'>(), // enforce enum type at type level
  description: text('description'),
  openFinding: integer('open_finding'),
  closeFinding: integer('close_finding'),
  outstandingFinding: integer('outstanding_finding'),
  noIssue: integer('no_issue'),
  lsaInspection: integer('lsa_inspection'),
  ffaInspection: integer('ffa_inspection'),
  ppeInspection: integer('ppe_inspection'),
  otherInspection: integer('other_inspection'),
  followUp: text('follow_up'),
  deadline: date('deadline'),
  finding: text('finding'),
  inspection: integer('inspection')
});

export const smartCards = pgTable('report_smart_cards', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('kartu_pintar_description'),
  unsafeAction: integer('unsafe_action'),
  unsafeCondition: integer('unsafe_condition'),
  nearMiss: integer('nearmiss'),
  processSafety: integer('process_safety'),

  nonParticipants: jsonb('non_participants')
    .$type<Array<{ name: string; company: string }>>()
    .default([])
});

export const permits = pgTable('report_permits', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  description: text('permit_to_work_description'),
  openDate: date('open_date'),
  noPTW: varchar('no_ptw', { length: 100 }),
  location: text('location'),
  RA_JSA: text('ra_jsa'),
  performingAuthority: text('performing_authority'),
  siteController: text('site_controller'),
  generalWork: integer('general_work'),
  breakingContainment: integer('breaking_containment'),
  hotWork: integer('hot_work'),
  criticalWork: integer('critical_work'),
  confinedSpace: integer('confined_space'),
  cwpL1: integer('cwp_l1'),
  hwspL1: integer('hwsp_l1'),
  confinedSpace1: integer('confined_space_1'),
  cwpL2: integer('cwp_l2'),
  hwspL2: integer('hwsp_l2'),
  confinedSpace2: integer('confined_space_2'),
  isolationConfirmationCertificate: integer('isolation_confirmation_certificate')
});

export const highlights = pgTable('report_highlights', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  dailyActivities: text('daily_activities'),
  dailyNextPlan: text('daily_next_plan'),
  weather: text('weather'),

  overstayPersonnel: jsonb('overstay_personnel')
    .$type<Array<{ name: string; company: string; dob?: string }>>()
    .default([])
});

// marine report
export const weather_sealevel = pgTable('report_weather_sealevel', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  regionWeather: jsonb('region_weather'),
  regionSealevel: jsonb('region_sealevel'),
  triggerAt: timestamp('trigger_at', { withTimezone: true }).notNull(),
});

export const operations = pgTable('report_operations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  region: varchar('region', { length: 10 })
    .notNull()
    .$type<'SBU' | 'CBU' | 'NBU'>(),  // 'SBU', 'CBU', 'NBU'
  currentHiPoActivity: text('current_hi_po_activity'),
  forecastHiPoActivity: text('forecast_hi_po_activity'),
  windSpeed: text('wind_speed'),
  seaLevel: text('sea_level'),
  skyCondition: text('sky_condition'),
  pitchingRolling: text('pitching_rolling')
});

export const vesselsUnderPoSummary = pgTable('report_vessels_under_po_summary', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  totalBoatToday: integer('total_boat_today'),
  totalBoatMonthly: integer('total_boat_monthly'),
  totalBoatYtd: integer('total_boat_ytd'),
  totalEmployeeToday: integer('total_employee_today'),
  totalEmployeeMonthly: integer('total_employee_monthly'),
  totalEmployeeYtd: integer('total_employee_ytd')
});

// supporting files
export const supportingFiles = pgTable('report_files', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => dailyReports.id),
  inspectionId: uuid('inspection_id').references(() => inspections.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
  drillId: uuid('drill_id').references(() => drills.id, { onDelete: 'cascade' }),
  trainingId: uuid('training_id').references(() => trainings.id, { onDelete: 'cascade' }),
  permitId: uuid('permit_id').references(() => permits.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  section: varchar('section', { length: 100 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

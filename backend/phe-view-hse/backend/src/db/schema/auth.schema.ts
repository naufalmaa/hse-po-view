import { type InferSelectModel, relations } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { alarmEmployeeLog, employees } from './employee.schema.ts'
import { alarmCsmsLog } from './csms.schema.ts';

export type User = InferSelectModel<typeof users>;

export const UserRoleEnum = pgEnum('UserRole', ['admin', 'user', 'evaluator', 'verifikator', 'manager', 'contractor', 'crew', 'employee']);

export const users = pgTable('users', {
  id: uuid().primaryKey().notNull().defaultRandom(),
  email: varchar({ length: 50 }).unique(),
  hssePassportNumber: text('hsse_passport_number').unique().references(() => employees.hssePassportNumber, { onDelete: 'cascade', onUpdate: 'cascade' }),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: varchar('name', { length: 50 }).notNull(),
  role: UserRoleEnum('role').notNull().default('user'),
  image: text('image'),
  signature: text('signature'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  banned: boolean().notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
});

export const userAlarmLog = pgTable('user_alarm_log', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  alarmEmployeeId: uuid('alarm_employee_id').references(() => alarmEmployeeLog.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  alarmCsmsId: uuid('alarm_csms_id').references(() => alarmCsmsLog.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subContractors = pgTable('sub_contractors', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  name: text('name').notNull(),
  category: varchar('category', { length: 255 }), // project | marine | mitra
});

export const vessels = pgTable('vessels', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  vesselName: text('vessel_name').notNull(),
  type: varchar('type', { length: 255 }),
  status: boolean('status').notNull().default(true),
  personnelCount: integer('personnel_count'),
  extra: jsonb('extra')
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  geometry: text('geometry'),
  status: boolean('status').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const contractorVessels = pgTable('contractor_vessels', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  vesselId: uuid('vessel_id').notNull().references(() => vessels.id, { onDelete: 'cascade' }),
});

export const userContractors = pgTable('user_contractors', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contractorId: uuid('contractor_id').notNull().references(() => subContractors.id, { onDelete: 'cascade' }),
  vesselId: uuid('vessel_id').references(() => vessels.id, { onDelete: 'cascade' }),
});

export const sessions = pgTable('sessions', {
  id: uuid().primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  impersonatedBy: uuid('impersonated_by'),
});

export const accounts = pgTable('accounts', {
  id: uuid().primaryKey().notNull().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  issuer: text('issuer'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const verifications = pgTable("verification", {
  id: uuid().primaryKey().notNull().defaultRandom(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));




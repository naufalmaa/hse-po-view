// db/schema/index.ts

import * as authSchema from './auth.schema.ts';
import * as reportSchema from './report.schema.ts';
import * as employeeSchema from './employee.schema.ts';
import * as csmsSchema from './csms.schema.ts';
import * as logManhoursSchema from './log-manhours.schema.ts';

// GROUP SCHEMA
export const schema = {
  ...authSchema,
  ...reportSchema,
  ...employeeSchema,
  ...csmsSchema,
  ...logManhoursSchema
};

// Export individual schemas for easier access
export * from './auth.schema.ts';
export * from './report.schema.ts';
export * from './employee.schema.ts';
export * from './csms.schema.ts';
export * from './log-manhours.schema.ts';
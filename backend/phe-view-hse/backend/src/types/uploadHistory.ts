// src/types/uploadHistory.ts
import { uploadHistory } from "../db/schema/employee.schema.ts";
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export interface ListUploadHistoryParams {
  limit?: number;
  page?: number;
  search?: string;
  status?: ('success' | 'error')[];
  hasErrors?: boolean[];
  date_start?: string;
  date_end?: string;
  sortBy?: string;
  orderBy?: 'asc' | 'desc';
  userId?: string;
  role?: string;
}

export interface UploadHistoryRecord {
  userId: string;
  filename: string;
  status: 'success' | 'error';
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  skippedRows?: number;
  insertedRows?: number;
  firstId?: number; // First ID inserted into smartCardObservations
  lastId?: number; // Last ID inserted into smartCardObservations
  errorMessage?: string;
  hasErrors?: boolean;
}

// Upload History Types
export type UploadHistory = InferSelectModel<typeof uploadHistory>;
export type UploadHistoryInsert = InferInsertModel<typeof uploadHistory>;
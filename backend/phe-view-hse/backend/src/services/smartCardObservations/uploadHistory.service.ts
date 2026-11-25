import type { AnyColumn } from 'drizzle-orm';
import type { ListUploadHistoryParams, UploadHistoryRecord } from '../../types/uploadHistory.ts';
import { db } from '../../db/index.ts';
import { uploadHistory } from '../../db/schema/employee.schema.ts';
import { desc, eq, asc, and, ilike, gte, lte, count, or, inArray } from 'drizzle-orm';

const sortByColumns: Record<string, AnyColumn> = {
  createdAt: uploadHistory.createdAt,
  filename: uploadHistory.filename,
  status: uploadHistory.status,
  totalRows: uploadHistory.totalRows,
  validRows: uploadHistory.validRows,
  errorRows: uploadHistory.errorRows,
  skippedRows: uploadHistory.skippedRows,
  insertedRows: uploadHistory.insertedRows,
};

export async function listUploadHistoryService(params: ListUploadHistoryParams): Promise<{
  data: any[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
    date_start: string;
    date_end: string;
  };
}> {
  const {
    limit = 10,
    page = 0,
    search,
    status,
    hasErrors,
    date_start,
    date_end,
    sortBy = 'createdAt',
    orderBy = 'desc',
    userId,
    role,
  } = params;

  const offset = page * limit;
  const whereConditions: any[] = [];

  // Filter upload history for contractor to only show their own uploads
  if (role === 'contractor' && userId) {
    whereConditions.push(eq(uploadHistory.userId, userId));
  }

  // Search functionality (filename, errorMessage)
  if (search) {
    const like = `%${search}%`;
    whereConditions.push(
      or(
        ilike(uploadHistory.filename, like),
        ilike(uploadHistory.errorMessage, like)
      )
    );
  }

  // Multiple status filter
  if (Array.isArray(status) && status.length > 0) {
    whereConditions.push(inArray(uploadHistory.status, status));
  }

  // Multiple hasErrors filter
  if (Array.isArray(hasErrors) && hasErrors.length > 0) {
    whereConditions.push(inArray(uploadHistory.hasErrors, hasErrors));
  }

  // Date range filters
  if (date_start) {
    whereConditions.push(gte(uploadHistory.createdAt, new Date(date_start)));
  }

  if (date_end) {
    whereConditions.push(lte(uploadHistory.createdAt, new Date(date_end)));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count for pagination
  const total = Number(
    (await db.select({ count: count() }).from(uploadHistory).where(whereClause))[0].count
  );
  const totalPages = Math.ceil(total / limit);

  // Apply sorting
  const sortColumn = sortByColumns[sortBy] ?? uploadHistory.createdAt;

  // Get paginated results
  const rows = await db
    .select()
    .from(uploadHistory)
    .where(whereClause)
    .orderBy(orderBy === 'desc' ? desc(sortColumn) : asc(sortColumn))
    .limit(limit)
    .offset(offset);

  // Calculate date range from results
  const createdDates = rows.map(r => r.createdAt).sort();
  const defaultStart = createdDates[0]?.toISOString().slice(0, 10) ?? '';
  const defaultEnd = createdDates[createdDates.length - 1]?.toISOString().slice(0, 10) ?? '';
  const finalStart = date_start ?? defaultStart;
  const finalEnd = date_end ?? defaultEnd;

  return {
    data: rows,
    meta: {
      total,
      page,
      view: limit,
      totalPages,
      date_start: finalStart,
      date_end: finalEnd,
    },
  };
}

export async function saveUploadHistory(record: UploadHistoryRecord): Promise<string> {
  const result = await db
    .insert(uploadHistory)
    .values({
      userId: record.userId,
      filename: record.filename,
      status: record.status,
      totalRows: record.totalRows,
      validRows: record.validRows,
      errorRows: record.errorRows,
      skippedRows: record.skippedRows,
      insertedRows: record.insertedRows,
      firstId: record.firstId,
      lastId: record.lastId,
      errorMessage: record.errorMessage,
      hasErrors: record.hasErrors || false,
    })
    .returning({ id: uploadHistory.id });

  return result[0].id;
}

export async function getUploadHistory(limit: number = 50) {
  // Use the standardized list service for backward compatibility
  const result = await listUploadHistoryService({ limit, page: 0 });
  return result.data;
}

export async function getUploadHistoryById(id: string) {
  const result = await db
    .select()
    .from(uploadHistory)
    .where(eq(uploadHistory.id, id))
    .limit(1);

  return result[0] || null;
}
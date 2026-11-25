import { db } from '../../../db/index.ts';
import { supportingFiles } from '../../../db/schema/report.schema.ts';
import {
  eq, and, like, desc, asc, count
} from 'drizzle-orm';
import env from "../../../config/env.config.ts";

const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsReportDir}`;

interface ListFilesParams {
  reportId?: string;
  sectionType?: string;
  search?: string;
  sort?: 'createdAt' | 'note' | 'filePath';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function listFiles(params: ListFilesParams = {}) {
  const {
    reportId,
    sectionType,
    search = '',
    sort = 'createdAt',
    order = 'desc',
    page = 0,
    limit = 10,
  } = params;

  const offset = page * limit;

  const conditions = [];

  if (reportId) {
    conditions.push(eq(supportingFiles.reportId, reportId));
  }

  if (sectionType) {
    conditions.push(eq(supportingFiles.section, sectionType));
  }

  if (search?.trim()) {
    const searchTerm = `%${search}%`;
    conditions.push(
      like(supportingFiles.note, searchTerm)
    );
  }

  const countSql = db
    .select({ count: count() })
    .from(supportingFiles)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await db.execute(countSql);
  const total = Number(countResult.rows[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limit);

  // Main query
  const orderBy = order === 'asc' ? asc : desc;
  const sortColumn = {
    createdAt: supportingFiles.createdAt,
    note: supportingFiles.note,
    filePath: supportingFiles.filePath,
  }[sort] ?? supportingFiles.createdAt;

  const query = db
    .select()
    .from(supportingFiles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy(sortColumn))
    .limit(limit)
    .offset(offset);

  const rows = await query;

  const result = rows.map(row => ({
    ...row,
    fileId: row.id,
    note: row.note ?? undefined,
    url: `${BASE_URL}/${row.reportId}/${row.filePath}`,
    thumbnailUrl: `${BASE_URL}/${row.reportId}/thumbnail/${row.filePath}`,
  }));

  return {
    data: result,
    meta: {
      total,
      page,
      limit,
      totalPages,
    }
  };
}

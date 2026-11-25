import { db } from '../../db/index.ts';
import { pobUnmatchedLogs } from '../../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

export const getPobUnmatchedLogDetailService = async (
  id: string,
  params: {
    page?: number;
    limit?: number;
    filter?: string;
    sortBy?: string;
    orderBy?: string;
  } = {}
) => {
  const { 
    page, 
    limit, 
    filter, 
    sortBy, 
    orderBy 
  } = params;

  const log = await db.query.pobUnmatchedLogs.findFirst({
    where: eq(pobUnmatchedLogs.id, id)
  });
  
  if (!log || !log.data) return null;

  let filteredData = [...log.data];

  // Apply filter
  const f = filter || 'all';
  if (f === 'with_suggestion') {
    filteredData = filteredData.filter(item => item.suggestions && item.suggestions.length > 0);
  } else if (f === 'without_suggestion') {
    filteredData = filteredData.filter(item => !item.suggestions || item.suggestions.length === 0);
  }

  // Apply sorting
  const sb = sortBy || 'similarity';
  const ob = orderBy || 'desc';
  filteredData.sort((a, b) => {
    let valA: any, valB: any;

    if (sb === 'similarity') {
      valA = a.suggestions && a.suggestions.length > 0 ? a.suggestions[0].similarity : 0;
      valB = b.suggestions && b.suggestions.length > 0 ? b.suggestions[0].similarity : 0;
    } else if (sb === 'name') {
      valA = a.excelData?.NAME || '';
      valB = b.excelData?.NAME || '';
    } else if (sb === 'company') {
      valA = a.excelData?.COMPANY || '';
      valB = b.excelData?.COMPANY || '';
    } else {
      valA = 0;
      valB = 0;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return ob === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    // Numeric sort (for similarity/score)
    return ob === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const total = filteredData.length;
  
  // Calculate summary based on all data
  const allData = log.data || [];
  const totalUnmatched = allData.length;
  const withSuggestion = allData.filter(item => item.suggestions && item.suggestions.length > 0).length;
  const highCertainty = allData.filter(item => 
    item.suggestions && item.suggestions.length > 0 && item.suggestions[0].similarity > 0.8
  ).length;
  const withoutSuggestion = totalUnmatched - withSuggestion;

  const summary = {
    totalUnmatched,
    withSuggestion,
    highCertainty,
    withoutSuggestion
  };

  // Apply pagination only if limit is provided
  if (limit && limit > 0) {
    const limitNum = Number(limit);
    const p = page || 0;
    const totalPages = Math.ceil(total / limitNum);
    const offset = p * limitNum;
    const paginatedData = filteredData.slice(offset, offset + limitNum);

    return {
      ...log,
      data: paginatedData,
      summary,
      meta: {
        total,
        page: p,
        view: limitNum,
        totalPages
      }
    };
  }

  return {
    ...log,
    data: filteredData,
    summary,
    meta: {
      total,
      page: 0,
      view: total,
      totalPages: 1
    }
  };
};

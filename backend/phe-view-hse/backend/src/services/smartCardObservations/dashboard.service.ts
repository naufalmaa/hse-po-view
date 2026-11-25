import { db } from '../../db/index.ts';
import { employees, smartCardObservations, uploadObservationErrors } from '../../db/schema/employee.schema.ts';
import { subContractors, vessels, userContractors } from '../../db/schema/auth.schema.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { eq, and, gte, lte, between, ilike, or, inArray, sql } from 'drizzle-orm';
import { parseExcelDate } from './excelUtils.ts';

export interface SmartCardDashboardParams {
  limit?: number;
  page?: number;
  search?: string;
  company?: string | string[];
  category?: string | string[];
  position?: string[];
  projectId?: string | string[];
  vesselId?: string | string[];
  date_start?: string;
  date_end?: string;
  sortBy?: string;
  orderBy?: 'asc' | 'desc';
  targetPerMonth?: number;
  employeeStatus?: 'all' | 'registered' | 'unmatched';
  userId?: string;
  role?: string;
}

// Levenshtein distance helper for similarity matching
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () => [] as number[]);
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

export async function getSmartCardDashboardService(params: SmartCardDashboardParams) {
  const {
    limit = 10,
    page = 0,
    search,
    company,
    category,
    position,
    projectId,
    vesselId,
    date_start,
    date_end,
    sortBy = 'employeeName',
    orderBy = 'asc',
    targetPerMonth = 10,
    employeeStatus = 'all',
    userId,
    role,
  } = params;

  // 1. Determine months in range
  const monthsInRange = getMonthsInRange(date_start, date_end);

  // 2. Build where conditions for employees
  const whereConditions: any[] = [];

  // Default: active employees
  whereConditions.push(eq(employees.statusOnDuty, true));

  // Search
  if (search) {
    const like = `%${search}%`;
    whereConditions.push(
      or(
        ilike(employees.employeeName, like),
        ilike(employees.position, like),
        ilike(subContractors.name, like)
      )
    );
  }

  // Filters
  if (role === 'contractor' && userId) {
    const contractorAccess = await db
      .select({
        contractorId: userContractors.contractorId,
        vesselId: userContractors.vesselId,
        category: subContractors.category
      })
      .from(userContractors)
      .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(userContractors.userId, userId));

    const allowedIds = contractorAccess.map(row => row.contractorId).filter(Boolean);
    const allowedVesselIds = contractorAccess.map(row => row.vesselId).filter((v): v is string => !!v);
    
    // Check if any subcontractor category is 'marine'
    const isMarineCategory = contractorAccess.some(row => row.category?.toLowerCase() === 'marine');

    if (allowedIds.length === 0) {
      whereConditions.push(eq(subContractors.id, '00000000-0000-0000-0000-000000000000'));
    } else {
      // Filter by contractor company (intersect if query company is set)
      if (Array.isArray(company) && company.length > 0) {
        const filteredCompanies = company.filter(c => allowedIds.includes(c));
        if (filteredCompanies.length === 0) {
          whereConditions.push(eq(subContractors.id, '00000000-0000-0000-0000-000000000000'));
        } else {
          whereConditions.push(inArray(subContractors.id, filteredCompanies));
        }
      } else if (typeof company === 'string' && company !== '') {
        if (allowedIds.includes(company)) {
          whereConditions.push(eq(subContractors.id, company));
        } else {
          whereConditions.push(eq(subContractors.id, '00000000-0000-0000-0000-000000000000'));
        }
      } else {
        whereConditions.push(inArray(subContractors.id, allowedIds));
      }
    }

    // Filter by vessel if contractor has vessels mapped
    if (allowedVesselIds.length > 0) {
      if (Array.isArray(vesselId) && vesselId.length > 0) {
        const filteredVessels = vesselId.filter(v => allowedVesselIds.includes(v));
        if (filteredVessels.length === 0) {
          whereConditions.push(eq(employees.vesselId, '00000000-0000-0000-0000-000000000000'));
        } else {
          whereConditions.push(inArray(employees.vesselId, filteredVessels));
        }
      } else if (typeof vesselId === 'string' && vesselId !== '') {
        if (allowedVesselIds.includes(vesselId)) {
          whereConditions.push(eq(employees.vesselId, vesselId));
        } else {
          whereConditions.push(eq(employees.vesselId, '00000000-0000-0000-0000-000000000000'));
        }
      } else {
        whereConditions.push(inArray(employees.vesselId, allowedVesselIds));
      }
    }

    if (isMarineCategory) {
      whereConditions.push(eq(employees.category, 'marine'));
    } else {
      // Category (normal filter logic)
      if (Array.isArray(category) && category.length > 0) {
        whereConditions.push(inArray(employees.category, category));
      } else if (typeof category === 'string' && category !== '') {
        whereConditions.push(eq(employees.category, category));
      }
    }
  } else {
    // Normal company filter
    if (Array.isArray(company) && company.length > 0) {
      whereConditions.push(inArray(subContractors.id, company));
    } else if (typeof company === 'string' && company !== '') {
      whereConditions.push(eq(subContractors.id, company));
    }

    // Normal vessel filter
    if (Array.isArray(vesselId) && vesselId.length > 0) {
      whereConditions.push(inArray(employees.vesselId, vesselId));
    } else if (typeof vesselId === 'string' && vesselId !== '') {
      whereConditions.push(eq(employees.vesselId, vesselId));
    }

    // Category (normal filter logic)
    if (Array.isArray(category) && category.length > 0) {
      whereConditions.push(inArray(employees.category, category));
    } else if (typeof category === 'string' && category !== '') {
      whereConditions.push(eq(employees.category, category));
    }
  }

  // Position
  if (Array.isArray(position) && position.length > 0) {
    whereConditions.push(inArray(employees.position, position));
  }

  // Project (Contractor category marine has no project filter, project filter is ignored if category marine is active)
  const isContractorMarine = role === 'contractor' && userId && await (async () => {
    const contractorAccess = await db
      .select({ category: subContractors.category })
      .from(userContractors)
      .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(userContractors.userId, userId));
    return contractorAccess.some(row => row.category?.toLowerCase() === 'marine');
  })();

  if (!isContractorMarine) {
    if (Array.isArray(projectId) && projectId.length > 0) {
      whereConditions.push(inArray(employees.projectId, projectId));
    } else if (typeof projectId === 'string' && projectId !== '') {
      whereConditions.push(eq(employees.projectId, projectId));
    }
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // 3. Query matching employees (all matched, since we paginate in memory to merge virtual rows cleanly)
  const employeeRows = employeeStatus === 'unmatched' ? [] : await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
      companyName: subContractors.name,
      category: employees.category,
      position: employees.position,
      companyId: employees.subContractorId,
      vesselId: employees.vesselId,
      vesselName: vessels.vesselName,
      vesselExtra: vessels.extra,
      projectId: employees.projectId,
      dbProjectName: subtypes.name,
      projectExtra: subtypes.extra,
      manualProjectName: employees.projectName,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .leftJoin(vessels, eq(employees.vesselId, vessels.id))
    .leftJoin(subtypes, eq(employees.projectId, subtypes.id))
    .where(whereClause);

  // 4. Fetch subcontractors to map company names in errors to IDs
  const contractorsList = await db.select({ id: subContractors.id, name: subContractors.name }).from(subContractors);
  const contractorsMap = new Map<string, string>();
  const contractorsNameMap = new Map<string, string>();
  contractorsList.forEach(c => {
    contractorsMap.set(c.name.toLowerCase().trim(), c.id);
    contractorsNameMap.set(c.id, c.name);
  });

  const unmatchedEmployees = new Map<string, { empName: string, companyId: string, companyName: string, errors: { dateStr: string, month: string }[], suggestions?: any[], errorId?: string }>();

  if (employeeStatus !== 'registered') {
    // 5. Fetch unresolved upload observation errors (status = 'error')
    const errorRows = await db
      .select()
      .from(uploadObservationErrors)
      .where(eq(uploadObservationErrors.status, 'error'));

    errorRows.forEach(err => {
      let original: any = err.originalRow;
      if (typeof original === 'string') {
        try {
          original = JSON.parse(original);
        } catch {
          return;
        }
      }
      if (!original) return;

      const empName = original.Nama?.trim() || 'Unknown';
      const compName = original['Nama Perusahaan']?.trim() || 'Unknown';

      // Map company name to company ID using similarity or exact match
      const compKey = compName.toLowerCase().trim();
      let companyId = contractorsMap.get(compKey);
      let matchedCompanyName = compName;
      if (companyId) {
        matchedCompanyName = contractorsNameMap.get(companyId) || compName;
      } else {
        let bestId = '';
        let bestSim = 0;
        contractorsList.forEach(c => {
          const sim = calculateSimilarity(c.name, compName);
          if (sim > bestSim) {
            bestSim = sim;
            bestId = c.id;
          }
        });
        if (bestSim > 0.5) {
          companyId = bestId;
          matchedCompanyName = contractorsNameMap.get(companyId) || compName;
        } else {
          return; // Skip if no subcontractor matched
        }
      }

      const obsDateStr = parseExcelDate(original.Tanggal);
      if (!obsDateStr) return;

      if (date_start && obsDateStr < date_start) return;
      if (date_end && obsDateStr > date_end) return;

      if (search) {
        const term = search.toLowerCase();
        const matchesSearch =
          "employee not found".includes(term) ||
          matchedCompanyName.toLowerCase().includes(term) ||
          empName.toLowerCase().includes(term);
        if (!matchesSearch) return;
      }

      if (company) {
        const isCompanyMatch = Array.isArray(company)
          ? company.includes(companyId)
          : company === companyId;
        if (!isCompanyMatch) return;
      }

      const empKey = `${empName.toLowerCase()}|${companyId}`;
      let suggestions: any[] = [];
      if (err.suggestions) {
        try {
          suggestions = typeof err.suggestions === 'string' ? JSON.parse(err.suggestions) : err.suggestions;
        } catch {
          // ignore
        }
      }

      if (!unmatchedEmployees.has(empKey)) {
        unmatchedEmployees.set(empKey, { empName, companyId, companyName: matchedCompanyName, errors: [], suggestions, errorId: err.id });
      } else {
        const existing = unmatchedEmployees.get(empKey)!;
        if ((!existing.suggestions || existing.suggestions.length === 0) && suggestions && suggestions.length > 0) {
          existing.suggestions = suggestions;
          existing.errorId = err.id;
        }
      }
      unmatchedEmployees.get(empKey)!.errors.push({
        dateStr: obsDateStr,
        month: obsDateStr.slice(0, 7)
      });
    });
  }

  const virtualRows: any[] = [];
  const hasCategoryFilter = (Array.isArray(category) && category.length > 0) || (typeof category === 'string' && category !== '');
  const hasPositionFilter = (Array.isArray(position) && position.length > 0);
  const hasProjectFilter = (Array.isArray(projectId) && projectId.length > 0) || (typeof projectId === 'string' && projectId !== '');
  const hasVesselFilter = (Array.isArray(vesselId) && vesselId.length > 0) || (typeof vesselId === 'string' && vesselId !== '');

  const shouldIncludeVirtualRows = employeeStatus === 'registered'
    ? false
    : employeeStatus === 'unmatched'
      ? true
      : (!hasCategoryFilter && !hasPositionFilter && !hasProjectFilter && !hasVesselFilter);

  if (shouldIncludeVirtualRows) {
    unmatchedEmployees.forEach((info) => {
      const monthlySubmissions: Record<string, number> = {};
      monthsInRange.forEach(m => {
        monthlySubmissions[m.key] = 0;
      });

      info.errors.forEach(err => {
        if (monthlySubmissions[err.month] !== undefined) {
          monthlySubmissions[err.month]++;
        }
      });

      const totalSubmissions = Object.values(monthlySubmissions).reduce((sum, val) => sum + val, 0);

      if (totalSubmissions > 0) {
        const rate = targetPerMonth > 0 ? Math.round((totalSubmissions / targetPerMonth) * 100) : 0;
        virtualRows.push({
          id: `unmatched-${info.companyId}-${info.empName}`,
          employeeName: `Employee Not Found (${info.empName})`,
          companyName: info.companyName,
          category: null,
          position: null,
          monthlySubmissions,
          totalSubmissions,
          target: targetPerMonth,
          rate,
          companyId: info.companyId,
          suggestions: info.suggestions || [],
          errorId: info.errorId,
        });
      }
    });
  }



  // 6. Fetch observations for the retrieved DB employees
  const employeeIds = employeeRows.map(emp => emp.id);
  let resultData: any[] = [];

  if (employeeIds.length > 0) {
    const observationConditions = [inArray(smartCardObservations.employeeId, employeeIds)];
    if (date_start && date_end) {
      observationConditions.push(between(smartCardObservations.observationDate, date_start, date_end));
    } else if (date_start) {
      observationConditions.push(gte(smartCardObservations.observationDate, date_start));
    } else if (date_end) {
      observationConditions.push(lte(smartCardObservations.observationDate, date_end));
    }

    const observations = await db
      .select({
        employeeId: smartCardObservations.employeeId,
        month: sql<string>`TO_CHAR(${smartCardObservations.observationDate}::date, 'YYYY-MM')`,
      })
      .from(smartCardObservations)
      .where(and(...observationConditions));

    const employeeObservationsMap: Record<string, Record<string, number>> = {};
    employeeIds.forEach(id => {
      employeeObservationsMap[id] = {};
      monthsInRange.forEach(m => {
        employeeObservationsMap[id][m.key] = 0;
      });
    });

    observations.forEach(obs => {
      if (obs.employeeId && obs.month && employeeObservationsMap[obs.employeeId]) {
        if (employeeObservationsMap[obs.employeeId][obs.month] !== undefined) {
          employeeObservationsMap[obs.employeeId][obs.month]++;
        }
      }
    });

    resultData = employeeRows.map(emp => {
      const isMarine = emp.category?.toLowerCase() === 'crew marine' || emp.category?.toLowerCase() === 'marine';
      const isProject = emp.category?.toLowerCase() === 'project';

      // Determine the target for this employee
      let employeeTarget = targetPerMonth;
      if (isMarine && emp.vesselExtra) {
        const extra = emp.vesselExtra as { target?: number | null } | null;
        if (extra?.target !== undefined && extra?.target !== null) {
          employeeTarget = extra.target;
        }
      } else if (isProject && emp.projectExtra) {
        const extra = emp.projectExtra as { target?: number | null } | null;
        if (extra?.target !== undefined && extra?.target !== null) {
          employeeTarget = extra.target;
        }
      }

      const monthlySubmissions = employeeObservationsMap[emp.id] || {};
      const totalSubmissions = Object.values(monthlySubmissions).reduce((sum, val) => sum + val, 0);
      const rate = employeeTarget > 0 ? Math.round((totalSubmissions / employeeTarget) * 100) : 0;

      return {
        id: emp.id,
        employeeName: emp.employeeName,
        companyName: emp.companyName,
        category: emp.category,
        position: emp.position,
        monthlySubmissions,
        totalSubmissions,
        target: employeeTarget,
        rate,
        companyId: emp.companyId,
        ...(isMarine ? {
          vesselId: emp.vesselId,
          vesselName: emp.vesselName || '',
        } : {}),
        ...(isProject ? {
          projectId: emp.projectId,
          projectName: emp.dbProjectName || emp.manualProjectName || '',
        } : {}),
      };
    });
  }

  // Combine DB employees and virtual rows
  if (shouldIncludeVirtualRows) {
    resultData.push(...virtualRows);
  }

  const total = resultData.length;

  // 7. Sort combined list
  resultData.sort((a, b) => {
    let valA: any;
    let valB: any;

    if (sortBy === 'totalSubmissions') {
      valA = a.totalSubmissions;
      valB = b.totalSubmissions;
    } else if (sortBy === 'rate') {
      valA = a.rate;
      valB = b.rate;
    } else if (sortBy === 'companyName') {
      valA = a.companyName || '';
      valB = b.companyName || '';
    } else if (sortBy === 'category') {
      valA = a.category || '';
      valB = b.category || '';
    } else if (sortBy === 'position') {
      valA = a.position || '';
      valB = b.position || '';
    } else {
      valA = a.employeeName || '';
      valB = b.employeeName || '';
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return orderBy === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return orderBy === 'desc' ? ((valB as number) - (valA as number)) : ((valA as number) - (valB as number));
  });

  // 8. Paginate combined list
  const offset = page * limit;
  const paginatedData = resultData.slice(offset, offset + limit);

  // 9. Calculate column totals for bottom summary row
  const monthlyTotals: Record<string, number> = {};
  monthsInRange.forEach(m => {
    monthlyTotals[m.key] = 0;
  });

  let grandTotal = 0;

  if (employeeIds.length > 0) {
    const allObservationConditions = [inArray(smartCardObservations.employeeId, employeeIds)];
    if (date_start && date_end) {
      allObservationConditions.push(between(smartCardObservations.observationDate, date_start, date_end));
    } else if (date_start) {
      allObservationConditions.push(gte(smartCardObservations.observationDate, date_start));
    } else if (date_end) {
      allObservationConditions.push(lte(smartCardObservations.observationDate, date_end));
    }

    const allObservations = await db
      .select({
        month: sql<string>`TO_CHAR(${smartCardObservations.observationDate}::date, 'YYYY-MM')`,
        count: sql<number>`count(${smartCardObservations.id})::int`,
      })
      .from(smartCardObservations)
      .where(and(...allObservationConditions))
      .groupBy(sql`TO_CHAR(${smartCardObservations.observationDate}::date, 'YYYY-MM')`);

    allObservations.forEach(obs => {
      if (obs.month && monthlyTotals[obs.month] !== undefined) {
        const cnt = Number(obs.count);
        monthlyTotals[obs.month] += cnt;
        grandTotal += cnt;
      }
    });
  }

  if (shouldIncludeVirtualRows) {
    virtualRows.forEach(row => {
      Object.entries(row.monthlySubmissions).forEach(([m, count]) => {
        if (monthlyTotals[m] !== undefined) {
          monthlyTotals[m] += count as number;
          grandTotal += count as number;
        }
      });
    });
  }

  return {
    data: paginatedData,
    summary: {
      monthlyTotals,
      grandTotal,
    },
    meta: {
      total,
      page,
      view: limit,
      totalPages: Math.ceil(total / limit),
      date_start: date_start ?? '',
      date_end: date_end ?? '',
      months: monthsInRange,
    }
  };
}

function getMonthsInRange(startStr?: string, endStr?: string): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];

  let start: Date;
  let end: Date;

  const currentYear = new Date().getFullYear();

  if (startStr) {
    start = new Date(startStr);
  } else {
    // Default to Jan of current year
    start = new Date(`${currentYear}-01-01`);
  }

  if (endStr) {
    end = new Date(endStr);
  } else {
    end = new Date();
  }

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const targetEnd = new Date(end.getFullYear(), end.getMonth(), 1);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let count = 0;
  while (current <= targetEnd && count < 120) { // Limit to 10 years max range to prevent hangs
    const year = current.getFullYear();
    const month = current.getMonth();

    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = `${monthNames[month]}-${String(year).slice(-2)}`;

    months.push({ key, label });

    current.setMonth(current.getMonth() + 1);
    count++;
  }

  return months;
}

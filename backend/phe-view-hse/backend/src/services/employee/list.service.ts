import type { AnyColumn } from 'drizzle-orm';
import type { ListEmployeeParams } from '../../types/employee.ts';
import { db } from '../../db/index.ts';
import { subContractors, userContractors, vessels } from '../../db/schema/auth.schema.ts';
import { eq, and, ilike, desc, asc, gte, lte, or, inArray, lt, sql, notInArray } from 'drizzle-orm';
import { isNotNull } from 'drizzle-orm/sql';
import { employees, employeeStatus, bpjs, contracts, vaccinations, mcus, certificates, sika, attendance } from '../../db/schema/employee.schema.ts';
import { subtypes, workLocations } from '../../db/schema/report.schema.ts';
import { getEmployeeDetailService } from './detail.service.ts';
import env from '../../config/env.config.ts';
import { convertUTCToWIB } from '../../utils/timezone.ts';

const sortByColumns: Record<string, AnyColumn> = {
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
  employeeName: employees.employeeName,
  position: employees.position,
  statusOnDuty: employees.statusOnDuty,
  subContractorId: employees.subContractorId,
  category: employees.category,
  location: employees.location,
};

export async function listEmployeesService(params: ListEmployeeParams): Promise<{
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
    userId,
    role,
    employeeId,
    limit = 10,
    page = 0,
    search,
    category: categoryInput,
    position,
    statusOnDuty: statusOnDutyInput,
    subContractorId: subContractorIdInput,
    vesselId: vesselIdInput,
    projectId: projectIdInput,
    onlyVerified,
    date_start,
    date_end,
    sortBy = 'createdAt',
    orderBy = 'desc',
    showDetails = false,
    complianceDocKey,
    documentStatus,
    ohihReview: ohihReviewInput,
    location: locationInput,
  } = params;

  // Normalize array parameters
  const category = Array.isArray(categoryInput) ? categoryInput : (categoryInput ? [categoryInput] : []);
  const statusOnDuty = Array.isArray(statusOnDutyInput) ? statusOnDutyInput : (statusOnDutyInput !== undefined ? [statusOnDutyInput] : []);
  const subContractorId = Array.isArray(subContractorIdInput) ? subContractorIdInput : (subContractorIdInput ? [subContractorIdInput] : []);
  const vesselId = Array.isArray(vesselIdInput) ? vesselIdInput : (vesselIdInput ? [vesselIdInput] : []);
  const projectId = Array.isArray(projectIdInput) ? projectIdInput : (projectIdInput ? [projectIdInput] : []);
  const ohihReview = Array.isArray(ohihReviewInput) ? ohihReviewInput : (ohihReviewInput ? [ohihReviewInput] : []);
  const location = Array.isArray(locationInput) ? locationInput : (locationInput ? [locationInput] : []);

  const offset = page * limit;
  const whereConditions: any[] = [];

  // Contractor: filter berdasarkan akses
  if (role === 'contractor' && userId) {
    const contractorAccess = await db
      .select({ contractorId: userContractors.contractorId })
      .from(userContractors)
      .where(eq(userContractors.userId, userId));
    const allowedIds = contractorAccess.map(row => row.contractorId);
    if (allowedIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          view: limit,
          totalPages: 0,
          date_start: '',
          date_end: '',
        },
      };
    }
    whereConditions.push(inArray(employees.subContractorId, allowedIds));
  }

  // Crew: filter berdasarkan vessel
  if (role === 'crew' && userId) {
    // Get the vessel assigned to this crew member from userContractors
    const crewVessel = await db
      .select({ vesselId: userContractors.vesselId })
      .from(userContractors)
      .where(eq(userContractors.userId, userId))
      .limit(1);

    if (crewVessel.length > 0 && crewVessel[0].vesselId) {
      // Filter employees to only show those from the same vessel
      whereConditions.push(eq(employees.vesselId, crewVessel[0].vesselId));
    } else {
      // If crew member has no vessel assigned, show no employees
      whereConditions.push(eq(employees.id, '00000000-0000-0000-0000-000000000000')); // Impossible ID
    }
  }

  // For public access (no role or undefined role), show all employees without filtering

  // Search (ilike)
  if (search) {
    const like = `%${search}%`;
    whereConditions.push(
      or(
        ilike(employees.employeeName, like),
        ilike(employees.position, like),
        ilike(employees.identityNumber, like),
        ilike(employees.hssePassportNumber, like)
      )
    );
  }

  // Multiple filters
  if (category.length > 0) {
    whereConditions.push(inArray(employees.category, category));
  }

  if (Array.isArray(position) && position.length > 0) {
    whereConditions.push(inArray(employees.position, position));
  }

  if (statusOnDuty.length > 0) {
    whereConditions.push(inArray(employees.statusOnDuty, statusOnDuty));
  }

  if (vesselId.length > 0) {
    whereConditions.push(inArray(employees.vesselId, vesselId));
  }

  if (projectId.length > 0) {
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const uuidList = projectId.filter(isUuid);
    const nonUuidList = projectId.filter(p => !isUuid(p));

    const subtypeConditions = [];
    if (uuidList.length > 0) subtypeConditions.push(inArray(subtypes.id, uuidList));
    if (nonUuidList.length > 0) subtypeConditions.push(inArray(subtypes.name, nonUuidList));

    const matchedSubtypes = subtypeConditions.length > 0
      ? await db.select({ id: subtypes.id, name: subtypes.name }).from(subtypes).where(or(...subtypeConditions))
      : [];

    const targetIds = [...new Set([...uuidList, ...matchedSubtypes.map(s => s.id)])];
    const targetNames = [...new Set([...nonUuidList, ...matchedSubtypes.map(s => s.name)])];

    const projectOrConds = [];
    if (targetIds.length > 0) {
      projectOrConds.push(inArray(employees.projectId, targetIds));
    }
    if (targetNames.length > 0) {
      projectOrConds.push(inArray(employees.projectName, targetNames));
    }

    if (projectOrConds.length > 0) {
      whereConditions.push(or(...projectOrConds));
    }
  }

  if (subContractorId.length > 0) {
    whereConditions.push(inArray(employees.subContractorId, subContractorId));
  }

  if (location.length > 0) {
    const trimmedLocs = location.map(l => l.trim()).filter(Boolean);
    if (trimmedLocs.length > 0) {
      const locConditions: any[] = [];
      for (const locStr of trimmedLocs) {
        locConditions.push(ilike(employees.location, `%${locStr}%`));
      }

      // Find workLocations matching the name
      const matchingWorkLocs = await db
        .select({ id: workLocations.id, projectId: workLocations.projectId })
        .from(workLocations)
        .where(or(...trimmedLocs.map(l => ilike(workLocations.name, `%${l}%`))));

      const workLocIds = matchingWorkLocs.map(w => w.id).filter(Boolean);
      const projectIdsFromLoc = matchingWorkLocs.map(w => w.projectId).filter(Boolean);

      if (workLocIds.length > 0) {
        const attSub = db
          .select({ employeeId: attendance.employeeId })
          .from(attendance)
          .where(inArray(attendance.workLocationId, workLocIds));
        locConditions.push(inArray(employees.id, attSub));
      }

      if (projectIdsFromLoc.length > 0) {
        locConditions.push(inArray(employees.projectId, projectIdsFromLoc as string[]));
      }

      whereConditions.push(or(...locConditions));
    }
  }

  if (onlyVerified) {
    whereConditions.push(isNotNull(employees.verifiedBy));
  }

  if (date_start) {
    whereConditions.push(gte(employees.createdAt, new Date(date_start)));
  }

  if (date_end) {
    whereConditions.push(lte(employees.createdAt, new Date(date_end)));
  }

  // Filter by specific employee ID
  if (employeeId) {
    whereConditions.push(eq(employees.id, employeeId));
  }

  // OHIH Review Filter (Health Risk Category P1-P7)
  if (Array.isArray(ohihReview) && ohihReview.length > 0) {
    whereConditions.push(inArray(mcus.ohihReview, ohihReview));
  }

  // Document Compliance Filter
  const todayStr = new Date().toISOString().slice(0, 10);
  const nearExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const docKeys = complianceDocKey === 'all'
    ? ['BPJS', 'Contract', 'Vaccine', 'SIKA', 'MCU', 'BSS', 'BST', 'Competency Certificate']
    : (Array.isArray(complianceDocKey) ? complianceDocKey : (complianceDocKey ? [complianceDocKey] : []));

  if (docKeys.length > 0) {
    const docConditions: any[] = [];

    for (const key of docKeys) {
      if (key === 'BPJS') {
        const bpjsSub = db.select().from(bpjs).where(eq(bpjs.employeeId, employees.id));
        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS ${bpjsSub}`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS ${bpjsSub}`);
        }
      } else if (key === 'Contract') {
        const contractSub = db.select().from(contracts).where(eq(contracts.employeeId, employees.id));
        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS ${contractSub}`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS ${contractSub}`);
        } else if (documentStatus === 'expired') {
          docConditions.push(sql`EXISTS (${db.select().from(contracts).where(and(
            eq(contracts.employeeId, employees.id),
            or(
              and(isNotNull(contracts.expiredDate), lt(contracts.expiredDate, todayStr)),
              and(isNotNull(contracts.expiredDateCompany), lt(contracts.expiredDateCompany, todayStr))
            )
          ))})`);
        } else if (documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(contracts).where(and(
            eq(contracts.employeeId, employees.id),
            or(
              and(isNotNull(contracts.expiredDate), gte(contracts.expiredDate, todayStr), lt(contracts.expiredDate, nearExpiryDate)),
              and(isNotNull(contracts.expiredDateCompany), gte(contracts.expiredDateCompany, todayStr), lt(contracts.expiredDateCompany, nearExpiryDate))
            )
          ))})`);
        }
      } else if (key === 'MCU') {
        const mcuSub = db.select().from(mcus).where(eq(mcus.employeeId, employees.id));
        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS ${mcuSub}`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS ${mcuSub}`);
        } else if (documentStatus === 'expired') {
          docConditions.push(sql`EXISTS (${db.select().from(mcus).where(and(eq(mcus.employeeId, employees.id), lt(mcus.mcuExpiredDate, todayStr)))})`);
        } else if (documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(mcus).where(and(eq(mcus.employeeId, employees.id), gte(mcus.mcuExpiredDate, todayStr), lt(mcus.mcuExpiredDate, nearExpiryDate)))})`);
        }
      } else if (key === 'Vaccine') {
        const vaccineSub = db.select().from(vaccinations).where(eq(vaccinations.employeeId, employees.id));
        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS ${vaccineSub}`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS ${vaccineSub}`);
        } else if (documentStatus === 'expired' || documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(vaccinations).where(and(eq(vaccinations.employeeId, employees.id), lt(vaccinations.vaccineDate, todayStr)))})`);
        }
      } else if (key === 'SIKA') {
        const sikaSub = db.select().from(sika).where(eq(sika.employeeId, employees.id));
        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS ${sikaSub}`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS ${sikaSub}`);
        } else if (documentStatus === 'expired') {
          docConditions.push(sql`EXISTS (${db.select().from(sika).where(and(eq(sika.employeeId, employees.id), lt(sika.expiredDate, todayStr)))})`);
        } else if (documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(sika).where(and(eq(sika.employeeId, employees.id), gte(sika.expiredDate, todayStr), lt(sika.expiredDate, nearExpiryDate)))})`);
        }
      } else if (key === 'BSS' || key === 'BST') {
        const name = key === 'BSS' ? 'BSS' : 'BST';
        const nameAlt = name + ' Certificate';
        const certSub = db.select().from(certificates).where(and(
          eq(certificates.employeeId, employees.id),
          or(eq(certificates.name, name), eq(certificates.name, nameAlt))
        ));

        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS (${certSub})`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS (${certSub})`);
        } else if (documentStatus === 'expired') {
          docConditions.push(sql`EXISTS (${db.select().from(certificates).where(and(
            eq(certificates.employeeId, employees.id),
            or(eq(certificates.name, name), eq(certificates.name, nameAlt)),
            eq(certificates.isPermanent, false),
            lt(certificates.expiredDate, todayStr)
          ))})`);
        } else if (documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(certificates).where(and(
            eq(certificates.employeeId, employees.id),
            or(eq(certificates.name, name), eq(certificates.name, nameAlt)),
            eq(certificates.isPermanent, false),
            gte(certificates.expiredDate, todayStr),
            lt(certificates.expiredDate, nearExpiryDate)
          ))})`);
        }
      } else if (key === 'Competency Certificate') {
        const excluded = ['BST', 'BST Certificate', 'BSS', 'BSS Certificate'];
        const certSub = db.select().from(certificates).where(and(
          eq(certificates.employeeId, employees.id),
          notInArray(certificates.name, excluded)
        ));

        if (documentStatus === 'empty') {
          docConditions.push(sql`NOT EXISTS (${certSub})`);
        } else if (documentStatus === 'filled') {
          docConditions.push(sql`EXISTS (${certSub})`);
        } else if (documentStatus === 'expired') {
          docConditions.push(sql`EXISTS (${db.select().from(certificates).where(and(
            eq(certificates.employeeId, employees.id),
            notInArray(certificates.name, excluded),
            eq(certificates.isPermanent, false),
            lt(certificates.expiredDate, todayStr)
          ))})`);
        } else if (documentStatus === 'near_expiry') {
          docConditions.push(sql`EXISTS (${db.select().from(certificates).where(and(
            eq(certificates.employeeId, employees.id),
            notInArray(certificates.name, excluded),
            eq(certificates.isPermanent, false),
            gte(certificates.expiredDate, todayStr),
            lt(certificates.expiredDate, nearExpiryDate)
          ))})`);
        }
      }
    }

    if (docConditions.length > 0) {
      // Use AND for 'empty' and 'filled' to show employees who meet the criteria for ALL selected docs
      // Use OR for 'expired' and 'near_expiry' to show employees who have AT LEAST ONE non-compliant doc
      const isStrict = documentStatus === 'empty' || documentStatus === 'filled';
      const combinedCondition = isStrict ? and(...docConditions) : or(...docConditions);

      if (combinedCondition) {
        whereConditions.push(combinedCondition);
      }
    }
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  let totalQuery: any = db.select({ count: sql<number>`count(distinct ${employees.id})` }).from(employees);
  let rowsQuery: any = db.select({ employees: employees }).from(employees);

  // Join mcus if ohihReview filter is applied
  if (ohihReview.length > 0) {
    totalQuery = totalQuery.leftJoin(mcus, eq(mcus.employeeId, employees.id));
    rowsQuery = rowsQuery.leftJoin(mcus, eq(mcus.employeeId, employees.id));
  }

  if (whereClause) {
    totalQuery = totalQuery.where(whereClause);
    rowsQuery = rowsQuery.where(whereClause);
  }

  const totalRes = await totalQuery;
  const total = Number(totalRes[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limit);

  const sortColumn = sortByColumns[sortBy] ?? employees.createdAt;
  let orderByClause: any[] = [orderBy === 'desc' ? desc(sortColumn) : asc(sortColumn)];

  // Priority sorting for complianceDocKey
  if (docKeys.length > 0) {
    const primaryKey = docKeys[0];
    let docDateSub: any = null;

    if (primaryKey === 'Contract') {
      docDateSub = db.select({ date: contracts.expiredDate }).from(contracts).where(eq(contracts.employeeId, employees.id)).limit(1);
    } else if (primaryKey === 'MCU') {
      docDateSub = db.select({ date: mcus.mcuExpiredDate }).from(mcus).where(eq(mcus.employeeId, employees.id)).limit(1);
    } else if (primaryKey === 'SIKA') {
      docDateSub = db.select({ date: sika.expiredDate }).from(sika).where(eq(sika.employeeId, employees.id)).limit(1);
    } else if (primaryKey === 'BSS' || primaryKey === 'BST' || primaryKey === 'Competency Certificate') {
      const name = primaryKey === 'BSS' ? 'BSS' : (primaryKey === 'BST' ? 'BST' : null);
      const nameAlt = name ? name + ' Certificate' : null;

      const certWhere: any[] = [eq(certificates.employeeId, employees.id)];
      if (name) {
        const certNameOr = or(eq(certificates.name, name), eq(certificates.name, nameAlt as string));
        if (certNameOr) certWhere.push(certNameOr);
      } else {
        const excluded = ['BST', 'BST Certificate', 'BSS', 'BSS Certificate'];
        certWhere.push(notInArray(certificates.name, excluded));
      }

      docDateSub = db.select({ date: certificates.expiredDate })
        .from(certificates)
        .where(and(...certWhere))
        .limit(1);
    }

    if (docDateSub) {
      orderByClause = [asc(sql`(${docDateSub})`), ...orderByClause];
    }
  }

  const rowsRaw = await rowsQuery
    .orderBy(...orderByClause)
    .limit(limit)
    .offset(offset);

  const rows: any[] = rowsRaw.map((r: any) => r.employees);

  const createdDates = rows.map((r: any) => r.createdAt).sort();
  const defaultStart = createdDates[0]?.toISOString().slice(0, 10) ?? '';
  const defaultEnd = createdDates[createdDates.length - 1]?.toISOString().slice(0, 10) ?? '';
  const finalStart = date_start ?? defaultStart;
  const finalEnd = date_end ?? defaultEnd;

  // Get the last status update for each employee and calculate days on board
  const statusUpdatesMap = new Map<string, Date | null>();
  const daysOnBoardMap = new Map<string, number>();
  const ohihReviewMap = new Map<string, string | null>();

  for (const employee of rows) {
    try {
      const [latestStatusUpdate] = await db
        .select()
        .from(employeeStatus)
        .where(eq(employeeStatus.employeeId, employee.id))
        .orderBy(desc(employeeStatus.updatedAt))
        .limit(1);

      statusUpdatesMap.set(employee.id, latestStatusUpdate?.updatedAt || null);

      // Calculate Days On Board (DOB)
      let daysOnBoard = 0;
      if (latestStatusUpdate?.currentCycleStartDate && employee.statusOnDuty) {
        const startDate = new Date(latestStatusUpdate.currentCycleStartDate);
        const today = new Date();
        // Calculate difference in days (rounded up) + 1 for inclusive counting
        const diffTime = today.getTime() - startDate.getTime();
        daysOnBoard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (isNaN(daysOnBoard)) daysOnBoard = 0;
        // Minimum 1 day if on duty
        if (daysOnBoard < 1) daysOnBoard = 1;
      } else if (latestStatusUpdate?.lastCheckIn && latestStatusUpdate?.lastCheckOut && !employee.statusOnDuty) {
        const startDate = new Date(latestStatusUpdate.lastCheckIn);
        const endDate = new Date(latestStatusUpdate.lastCheckOut);
        const diffTime = endDate.getTime() - startDate.getTime();
        daysOnBoard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (isNaN(daysOnBoard)) daysOnBoard = 0;
        if (daysOnBoard < 1) daysOnBoard = 1;
      }
      daysOnBoardMap.set(employee.id, daysOnBoard);

      // Fetch Latest MCU OHIH Review
      const [latestMcu] = await db
        .select({ ohihReview: mcus.ohihReview })
        .from(mcus)
        .where(eq(mcus.employeeId, employee.id))
        .orderBy(desc(mcus.mcuDate))
        .limit(1);

      ohihReviewMap.set(employee.id, latestMcu?.ohihReview || null);
    } catch (error) {
      console.error(`Error fetching additional data for employee ${employee.id}:`, error);
      statusUpdatesMap.set(employee.id, null);
      daysOnBoardMap.set(employee.id, 0);
      ohihReviewMap.set(employee.id, null);
    }
  }

  const data = showDetails
    ? await Promise.all(
      rows.map(async (row) => {
        const detail = await getEmployeeDetailService(row.id);
        return {
          ...detail.employee,
          imageUrl: detail.employee.imageUrl,
          subContractorName: detail.employee.subContractorName,
          contracts: detail.contracts,
          mcus: detail.mcus,
          bpjs: detail.bpjs,
          vaccinations: detail.vaccinations,
          certificates: detail.certificates,
          sika: detail.sika,
          files: detail.files,
          lastStatusUpdate: convertUTCToWIB(statusUpdatesMap.get(row.id)),
          daysOnBoard: daysOnBoardMap.get(row.id) || 0,
          ohihReview: ohihReviewMap.get(row.id) || null,
        };
      })
    )
    : await (async () => {
        const contractorIds = [...new Set(rows.map((r: any) => r.subContractorId).filter(Boolean))];
        const vesselIds = [...new Set(rows.map((r: any) => r.vesselId).filter(Boolean))];
        const projectIds = [...new Set(rows.map((r: any) => r.projectId).filter(Boolean))];

        const [contractorsList, vesselsList, projectsList] = await Promise.all([
          contractorIds.length > 0
            ? db.select({ id: subContractors.id, name: subContractors.name }).from(subContractors).where(inArray(subContractors.id, contractorIds))
            : [],
          vesselIds.length > 0
            ? db.select({ id: vessels.id, name: vessels.vesselName }).from(vessels).where(inArray(vessels.id, vesselIds))
            : [],
          projectIds.length > 0
            ? db.select({ id: subtypes.id, name: subtypes.name }).from(subtypes).where(inArray(subtypes.id, projectIds))
            : [],
        ]);

        const contractorMap = new Map(contractorsList.map((c: any) => [c.id, c.name]));
        const vesselMap = new Map(vesselsList.map((v: any) => [v.id, v.name]));
        const projectMap = new Map(projectsList.map((p: any) => [p.id, p.name]));

        const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsEmployeesDir}/`;

        return rows.map((row: any) => {
          const contractorName = (row.subContractorId ? contractorMap.get(row.subContractorId) : null) ?? '';
          const vesselName = (row.vesselId ? vesselMap.get(row.vesselId) : null) ?? '';
          const resolvedProjectName = (row.projectId ? projectMap.get(row.projectId) : null) || row.projectName || '';
          const imageUrl = row.image ? `${BASE_URL}/${row.id}/${row.image}` : '';

          return {
            ...row,
            subContractorName: contractorName,
            vesselName: vesselName,
            projectName: resolvedProjectName,
            imageUrl,
            lastStatusUpdate: convertUTCToWIB(statusUpdatesMap.get(row.id)),
            daysOnBoard: daysOnBoardMap.get(row.id) || 0,
            ohihReview: ohihReviewMap.get(row.id) || null,
          };
        });
      })();

  return {
    data,
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

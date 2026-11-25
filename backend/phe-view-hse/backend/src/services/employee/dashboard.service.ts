/* src/services/employee/dashboard.service.ts */
import { db } from '../../db/index.ts';
import {
  employees,
  bpjs,
  contracts,
  vaccinations,
  mcus,
  certificates,
  sika,
  employeeFiles,
} from '../../db/schema/employee.schema.ts';
import { subContractors, vessels } from '../../db/schema/auth.schema.ts';
import {
  and, or, eq, gte, isNotNull, inArray, count, countDistinct, notInArray, ilike, isNull, sql, lt
} from 'drizzle-orm';
import { subtypes } from '../../db/schema/report.schema.ts';

export type KategoriKaryawan = 'marine' | 'mitra' | 'project';
export type HealthP = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
export type ComplianceDocKey =
  | 'BPJS'
  | 'Contract'
  | 'Vaccine'
  | 'SIKA'
  | 'MCU'
  | 'BSS'
  | 'BST'
  | 'Competency Certificate';

export interface DashboardFilter {
  subContractorIds?: string[];
  category?: KategoriKaryawan | KategoriKaryawan[];
  years?: number[]; // list tahun berdasarkan employees.createdAt
}

export interface ComplianceOptions {
  /** true = dokumen ini harus punya evidence file; false/undefined = tidak wajib file */
  fileType?: Partial<Record<'bpjs' | 'contract' | 'vaccine' | 'mcu' | 'sika' | 'certificate', boolean>>;
}

export interface PctResult {
  pct: number;
  count: number;
  total: number;
}

export interface ComplianceItem extends PctResult {
  key: 'BPJS' | 'Contract' | 'Vaccine' | 'SIKA' | 'MCU' | 'BSS' | 'BST' | 'Competency Certificate';
}

export interface CrewOnDutyByProject {
  subContractorId: string;
  subContractorName: string;
  projectId: string;
  projectName: string;
  crewOnDuty: number;
}

export interface CrewOnDutyByVessel {
  subContractorId: string;
  subContractorName: string;
  vesselId: string;
  vesselName: string;
  crewOnDuty: number;
}

export interface DashboardSummaryData {
  totalEmployees: number;
  employeesOnDuty: number;
  overallCompliancePct: PctResult;
  overallHealthRiskAboveP3Pct: number | PctResult;
  compliancePerDocument: ComplianceItem[];
  healthRiskPerCategory: Array<{ category: HealthP } & PctResult>;
  complianceRankByCompany: Array<{ subContractorId: string; company: string; pct: number; count?: number; total?: number }>;
  healthRankByCompany: Array<{ subContractorId: string; company: string; pct: number; count: number; total: number }>;
  crewOnDutyByProject: CrewOnDutyByProject[];
  crewOnDutyByVessel: CrewOnDutyByVessel[];
}

export interface DashboardSummary {
  success: boolean;
  message: string;
  data?: DashboardSummaryData;
}

// =============== Utils ===============

function baseEmpWhere(filter?: DashboardFilter) {
  const conds: any[] = [];
  if (filter?.subContractorIds?.length) {
    conds.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      conds.push(inArray(employees.category, filter.category));
    } else {
      conds.push(eq(employees.category, filter.category));
    }
  }
  if (filter?.years?.length) {
    const yearRanges = filter.years
      .filter((y) => Number.isFinite(y))
      .map((y) => {
        // Range [YYYY-01-01T00:00:00Z, (YYYY+1)-01-01T00:00:00Z)
        const start = new Date(Date.UTC(Number(y), 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(Number(y) + 1, 0, 1, 0, 0, 0, 0));
        return and(
          gte(employees.createdAt as any, start),
          lt(employees.createdAt as any, end),
        );
      });
    if (yearRanges.length) conds.push(or(...yearRanges));
  }

  return conds.length ? and(...conds) : undefined;
}

function baseEmpWhereSkipYears(filter?: DashboardFilter) {
  const conds: any[] = [];
  if (filter?.subContractorIds?.length) {
    conds.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      conds.push(inArray(employees.category, filter.category));
    } else {
      conds.push(eq(employees.category, filter.category));
    }
  }

  return conds.length ? and(...conds) : undefined;
}

async function countEmployees(filter?: DashboardFilter) {
  // Hanya terapkan filter subContractorIds dan category, skip filter years
  const conds: any[] = [];

  if (filter?.subContractorIds?.length) {
    conds.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      conds.push(inArray(employees.category, filter.category));
    } else {
      conds.push(eq(employees.category, filter.category));
    }
  }

  const finalWhere = conds.length ? and(...conds) : undefined;

  const [row] = await db
    .select({ n: count() })
    .from(employees)
    .where(finalWhere);
  return Number(row?.n ?? 0);
}

async function countEmployeesOnDuty(filter?: DashboardFilter) {
  // Hanya terapkan filter subContractorIds dan category, skip filter years
  const conds: any[] = [eq(employees.statusOnDuty, true)];

  if (filter?.subContractorIds?.length) {
    conds.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      conds.push(inArray(employees.category, filter.category));
    } else {
      conds.push(eq(employees.category, filter.category));
    }
  }

  const finalWhere = conds.length > 1 ? and(...conds) : conds[0];

  const [row] = await db
    .select({ n: count() })
    .from(employees)
    .where(finalWhere);
  return Number(row?.n ?? 0);
}

function toISODateString(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Helper: join file ON conditions (tanpa filter type – cukup relasi FK)
function buildFileJoinOn(
  docIdCol: any,         // contoh: contracts.id
  fileForeignIdCol: any, // contoh: employeeFiles.contractId
) {
  return and(
    eq(employeeFiles.employeeId, employees.id),
    eq(fileForeignIdCol, docIdCol),
  );
}

/**
 * Hitung % employees yang memenuhi validWhere pada docTable,
 * dan (opsional) punya file evidence pada employee_files.
 * Persentase dikembalikan sebagai desimal tanpa pembulatan.
 */
async function percentageWithDocAndFile(
  filter: DashboardFilter | undefined,
  docTable: any,
  docOn: any,
  validWhere: any,
  fileJoinOn?: any, // kalau undefined, berarti tidak butuh file evidence
): Promise<PctResult> {
  const total = await countEmployees(filter);
  if (!total) return { pct: 0, count: 0, total: 0 };

  const baseWhere = baseEmpWhere(filter);

  // Build WHERE dinamis
  const conds: any[] = [];
  if (baseWhere) conds.push(baseWhere);
  conds.push(validWhere);

  const q = db
    .select({ n: countDistinct(employees.id).as('n') })
    .from(employees)
    .leftJoin(docTable, docOn);

  if (fileJoinOn) {
    q.leftJoin(employeeFiles, fileJoinOn);
    conds.push(isNotNull(employeeFiles.id)); // butuh evidence file
  }

  q.where(and(...conds));

  const [row] = await q;
  const n = Number(row?.n ?? 0);
  return {
    pct: (n / total) * 100,
    count: n,
    total,
  };
}

// ===== Helper follow‑up kosong & default OHIH =====
// const followUpEmpty = or(
//   isNull(mcus.mcuFollowUp),
//   eq(sql`trim(${mcus.mcuFollowUp})`, ''),
//   eq(mcus.mcuFollowUp, 'NaN')
// );

const OHIH_P1_TO_P7: HealthP[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const OHIH_P3_PLUS: HealthP[] = ['P3', 'P4', 'P5', 'P6', 'P7'];

// =============== Compliance Per Dokumen ===============
async function getCompliancePerDocument(
  filter?: DashboardFilter,
  options?: ComplianceOptions,
): Promise<ComplianceItem[]> {
  const must = (k: keyof NonNullable<ComplianceOptions['fileType']>) =>
    options?.fileType?.[k] === true;

  const todayStr = toISODateString(new Date());

  // BPJS
  const bpjsValid = or(isNotNull(bpjs.bpjsEmployment), isNotNull(bpjs.bpjsHealth));
  const bpjsPct = await percentageWithDocAndFile(
    filter,
    bpjs,
    eq(bpjs.employeeId, employees.id),
    bpjsValid,
    must('bpjs') ? buildFileJoinOn(bpjs.id, employeeFiles.bpjsId) : undefined,
  );

  // Contract
  const contractValid = or(
    and(isNotNull(contracts.expiredDate), gte(contracts.expiredDate, todayStr)),
    and(isNotNull(contracts.expiredDateCompany), gte(contracts.expiredDateCompany, todayStr)),
  );
  const contractPct = await percentageWithDocAndFile(
    filter,
    contracts,
    eq(contracts.employeeId, employees.id),
    contractValid,
    must('contract') ? buildFileJoinOn(contracts.id, employeeFiles.contractId) : undefined,
  );

  // Vaccine
  const vaccineValid = or(isNotNull(vaccinations.vaccineDate), isNotNull(vaccinations.vaccineStatus));
  const vaccinePct = await percentageWithDocAndFile(
    filter,
    vaccinations,
    eq(vaccinations.employeeId, employees.id),
    vaccineValid,
    must('vaccine') ? buildFileJoinOn(vaccinations.id, employeeFiles.vaccinationId) : undefined,
  );

  // MCU
  const mcuValid = and(isNotNull(mcus.mcuExpiredDate), gte(mcus.mcuExpiredDate, todayStr));
  const mcuPct = await percentageWithDocAndFile(
    filter,
    mcus,
    eq(mcus.employeeId, employees.id),
    mcuValid,
    must('mcu') ? buildFileJoinOn(mcus.id, employeeFiles.mcuId) : undefined,
  );

  // SIKA (case-insensitive type + expired)
  const sikaValid = and(
    or(ilike(sika.type, 'SIKA Certificate'), ilike(sika.type, 'SIKA Awareness')),
    isNotNull(sika.expiredDate),
    gte(sika.expiredDate, todayStr),
  );
  const sikaPct = await percentageWithDocAndFile(
    filter,
    sika,
    eq(sika.employeeId, employees.id),
    sikaValid,
    must('sika') ? buildFileJoinOn(sika.id, employeeFiles.sikaId) : undefined,
  );

  // BSS
  const bssNameIsValid = or(eq(certificates.name, 'BSS'), eq(certificates.name, 'BSS Certificate'));
  const bssValid = and(
    bssNameIsValid,
    or(
      eq(certificates.isPermanent, true),
      and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
    )
  );
  const bssPct = await percentageWithDocAndFile(
    filter,
    certificates,
    eq(certificates.employeeId, employees.id),
    bssValid,
    must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
  );

  // BST
  const bstNameIsValid = or(eq(certificates.name, 'BST'), eq(certificates.name, 'BST Certificate'));
  const bstValid = and(
    bstNameIsValid,
    or(
      eq(certificates.isPermanent, true),
      and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
    )
  );
  const bstPct = await percentageWithDocAndFile(
    filter,
    certificates,
    eq(certificates.employeeId, employees.id),
    bstValid,
    must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
  );

  // Competency (selain BSS/BST)
  const excludedCertNames = ['BST', 'BST Certificate', 'BSS', 'BSS Certificate'];
  const compCertValid = and(
    isNotNull(certificates.name),
    notInArray(certificates.name, excludedCertNames),
    or(
      eq(certificates.isPermanent, true),
      and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
    )
  );
  const compCertPct = await percentageWithDocAndFile(
    filter,
    certificates,
    eq(certificates.employeeId, employees.id),
    compCertValid,
    must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
  );

  return [
    { key: 'BPJS', ...bpjsPct },
    { key: 'Contract', ...contractPct },
    { key: 'Vaccine', ...vaccinePct },
    { key: 'SIKA', ...sikaPct },
    { key: 'MCU', ...mcuPct },
    { key: 'BSS', ...bssPct },
    { key: 'BST', ...bstPct },
    { key: 'Competency Certificate', ...compCertPct },
  ];
}

// ===== Builder rule per dokumen (untuk rank per kategori) =====
function buildComplianceRuleForDoc(
  _filter: DashboardFilter | undefined,
  options: ComplianceOptions | undefined,
  docKey: ComplianceDocKey
) {
  const must = (k: keyof NonNullable<ComplianceOptions['fileType']>) =>
    options?.fileType?.[k] === true;

  const todayStr = toISODateString(new Date());

  switch (docKey) {
    case 'BPJS': {
      const valid = or(isNotNull(bpjs.bpjsEmployment), isNotNull(bpjs.bpjsHealth));
      return {
        table: bpjs,
        on: eq(bpjs.employeeId, employees.id),
        where: valid,
        fileOn: must('bpjs') ? buildFileJoinOn(bpjs.id, employeeFiles.bpjsId) : undefined,
      };
    }
    case 'Contract': {
      const valid = or(
        and(isNotNull(contracts.expiredDate), gte(contracts.expiredDate, todayStr)),
        and(isNotNull(contracts.expiredDateCompany), gte(contracts.expiredDateCompany, todayStr)),
      );
      return {
        table: contracts,
        on: eq(contracts.employeeId, employees.id),
        where: valid,
        fileOn: must('contract') ? buildFileJoinOn(contracts.id, employeeFiles.contractId) : undefined,
      };
    }
    case 'Vaccine': {
      const valid = or(isNotNull(vaccinations.vaccineDate), isNotNull(vaccinations.vaccineStatus));
      return {
        table: vaccinations,
        on: eq(vaccinations.employeeId, employees.id),
        where: valid,
        fileOn: must('vaccine') ? buildFileJoinOn(vaccinations.id, employeeFiles.vaccinationId) : undefined,
      };
    }
    case 'MCU': {
      const valid = and(isNotNull(mcus.mcuExpiredDate), gte(mcus.mcuExpiredDate, todayStr));
      return {
        table: mcus,
        on: eq(mcus.employeeId, employees.id),
        where: valid,
        fileOn: must('mcu') ? buildFileJoinOn(mcus.id, employeeFiles.mcuId) : undefined,
      };
    }
    case 'SIKA': {
      const valid = and(
        or(ilike(sika.type, 'SIKA Certificate'), ilike(sika.type, 'SIKA Awareness')),
        isNotNull(sika.expiredDate),
        gte(sika.expiredDate, todayStr),
      );
      return {
        table: sika,
        on: eq(sika.employeeId, employees.id),
        where: valid,
        fileOn: must('sika') ? buildFileJoinOn(sika.id, employeeFiles.sikaId) : undefined,
      };
    }
    case 'BSS': {
      const nameValid = or(eq(certificates.name, 'BSS'), eq(certificates.name, 'BSS Certificate'));
      const valid = and(
        nameValid,
        or(
          eq(certificates.isPermanent, true),
          and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
        )
      );
      return {
        table: certificates,
        on: eq(certificates.employeeId, employees.id),
        where: valid,
        fileOn: must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
      };
    }
    case 'BST': {
      const nameValid = or(eq(certificates.name, 'BST'), eq(certificates.name, 'BST Certificate'));
      const valid = and(
        nameValid,
        or(
          eq(certificates.isPermanent, true),
          and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
        )
      );
      return {
        table: certificates,
        on: eq(certificates.employeeId, employees.id),
        where: valid,
        fileOn: must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
      };
    }
    case 'Competency Certificate': {
      const excluded = ['BST', 'BST Certificate', 'BSS', 'BSS Certificate'];
      const valid = and(
        isNotNull(certificates.name),
        notInArray(certificates.name, excluded),
        or(
          eq(certificates.isPermanent, true),
          and(isNotNull(certificates.expiredDate), gte(certificates.expiredDate, todayStr))
        )
      );
      return {
        table: certificates,
        on: eq(certificates.employeeId, employees.id),
        where: valid,
        fileOn: must('certificate') ? buildFileJoinOn(certificates.id, employeeFiles.certificateId) : undefined,
      };
    }
  }
}

async function getCompliancePctByDoc(
  filter: DashboardFilter | undefined,
  options: ComplianceOptions | undefined,
  docKey: ComplianceDocKey
) {
  const rule = buildComplianceRuleForDoc(filter, options, docKey);
  return percentageWithDocAndFile(filter, rule.table, rule.on, rule.where, rule.fileOn);
}

// =============== Health Risk ===============
async function getHealthRiskPerCategory(filter?: DashboardFilter) {
  const total = await countEmployees(filter);
  const order: HealthP[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  if (!total) return order.map(c => ({ category: c, pct: 0, count: 0, total: 0 }));

  const todayStr = toISODateString(new Date());
  const sq = db
    .select({
      employeeId: mcus.employeeId,
      ohihReview: mcus.ohihReview,
      mcuExpiredDate: mcus.mcuExpiredDate,
      rowNum: sql<number>`row_number() over (partition by ${mcus.employeeId} order by ${mcus.mcuDate} desc)`.as('row_num'),
    })
    .from(mcus)
    .as('sq');

  const baseWhere = baseEmpWhereSkipYears(filter);
  const conds: any[] = [
    isNotNull(sq.ohihReview),
    isNotNull(sq.mcuExpiredDate),
    gte(sq.mcuExpiredDate, todayStr),
  ];
  if (baseWhere) conds.unshift(baseWhere);

  const rows = await db
    .select({
      cat: sq.ohihReview,
      n: countDistinct(employees.id).as('n'),
    })
    .from(employees)
    .leftJoin(sq, and(eq(sq.employeeId, employees.id), eq(sq.rowNum, 1)))
    .where(and(...conds))
    .groupBy(sq.ohihReview);

  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r.cat), Number(r.n));

  return order.map((c) => {
    const n = map.get(c) ?? 0;
    return { category: c, pct: n > 0 ? Math.max(0.1, (n / total) * 100) : 0, count: n, total };
  });
}

// Default: SELECT ALL P1–P7 kalau categories tidak diisi
async function getHealthPctByOhih(
  filter?: DashboardFilter,
  categories?: HealthP[]
): Promise<PctResult> {
  const total = await countEmployees(filter);
  if (!total) return { pct: 0, count: 0, total: 0 };

  const todayStr = toISODateString(new Date());
  const sq = db
    .select({
      employeeId: mcus.employeeId,
      ohihReview: mcus.ohihReview,
      mcuExpiredDate: mcus.mcuExpiredDate,
      rowNum: sql<number>`row_number() over (partition by ${mcus.employeeId} order by ${mcus.mcuDate} desc)`.as('row_num'),
    })
    .from(mcus)
    .as('sq');

  const baseWhere = baseEmpWhereSkipYears(filter);
  const conds: any[] = [
    inArray(sq.ohihReview, categories?.length ? categories : (OHIH_P1_TO_P7 as HealthP[])),
    isNotNull(sq.mcuExpiredDate),
    gte(sq.mcuExpiredDate, todayStr),
  ];
  if (baseWhere) conds.unshift(baseWhere);

  const [row] = await db
    .select({ n: countDistinct(employees.id).as('n') })
    .from(employees)
    .leftJoin(sq, and(eq(sq.employeeId, employees.id), eq(sq.rowNum, 1)))
    .where(and(...conds));

  const n = Number(row?.n ?? 0);
  return {
    pct: n > 0 ? Math.max(0.1, (n / total) * 100) : 0,
    count: n,
    total,
  };
}

// Nama tetap "AboveP3" demi kompatibilitas, tapi sekarang defaultnya SELECT ALL (P1–P7)
async function getOverallHealthRiskAboveP3Pct(filter?: DashboardFilter) {
  return getHealthPctByOhih(filter);
}

async function getOverallCompliancePct(
  filter?: DashboardFilter,
  options?: ComplianceOptions,
): Promise<PctResult> {
  const items = await getCompliancePerDocument(filter, options);
  const total = items.length > 0 ? items[0].total : 0;
  const pct = items.reduce((s, x) => s + x.pct, 0) / (items.length || 1);
  const count = Math.round((pct / 100) * total);
  return { pct, count, total };
}

// =============== Rank by Company (Subcontractor) ===============
async function companiesWithEmployees(filter?: DashboardFilter) {
  const baseWhere = baseEmpWhere(filter);

  return db
    .selectDistinct({
      id: subContractors.id,
      name: subContractors.name,
    })
    .from(subContractors)
    .innerJoin(employees, eq(employees.subContractorId, subContractors.id))
    .where(baseWhere);
}

async function companiesWithEmployeesSkipYears(filter?: DashboardFilter) {
  const baseWhere = baseEmpWhereSkipYears(filter);

  return db
    .selectDistinct({
      id: subContractors.id,
      name: subContractors.name,
    })
    .from(subContractors)
    .innerJoin(employees, eq(employees.subContractorId, subContractors.id))
    .where(baseWhere);
}

// Compliance rank: default overall (semua dokumen), atau per dokumen jika docKey diisi
export async function getComplianceRankByCompany(
  filter?: DashboardFilter,
  options?: ComplianceOptions,
  docKey?: ComplianceDocKey
) {
  const companies = await companiesWithEmployees(filter);
  const results: Array<{ subContractorId: string; company: string; pct: number; count?: number; total?: number }> = [];

  for (const c of companies) {
    const scoped = { ...filter, subContractorIds: [c.id] };
    if (docKey) {
      const res = await getCompliancePctByDoc(scoped, options, docKey);
      results.push({ subContractorId: c.id, company: c.name, pct: res.pct, count: res.count, total: res.total });
    } else {
      const res = await getOverallCompliancePct(scoped, options);
      results.push({ subContractorId: c.id, company: c.name, pct: res.pct, count: res.count, total: res.total });
    }
  }

  results.sort((a, b) => b.pct - a.pct);
  return results;
}

// Health rank: default SELECT ALL (P1–P7) atau subset categories bila dipilih
export async function getHealthRankByCompany(
  filter?: DashboardFilter,
  ohihCategories?: HealthP[]
) {
  const companies = await companiesWithEmployeesSkipYears(filter);
  const results: Array<{ subContractorId: string; company: string; pct: number; count: number; total: number }> = [];

  for (const c of companies) {
    const res = await getHealthPctByOhih({ ...filter, subContractorIds: [c.id] }, ohihCategories);
    results.push({ subContractorId: c.id, company: c.name, pct: res.pct, count: res.count, total: res.total });
  }

  results.sort((a, b) => b.pct - a.pct);
  return results;
}

// ===== NEW: Rank status (P3+) & follow‑up kosong per company =====
export async function getHealthStatusAndFollowUpRankByCompany(
  filter?: DashboardFilter,
  ohihCategories?: HealthP[] // default P3+
) {
  const companies = await companiesWithEmployeesSkipYears(filter);
  const results: Array<{ subContractorId: string; company: string; statusPct: number; statusCount?: number; statusTotal?: number; followUpPct: number; followUpCount?: number; followUpTotal?: number; details?: Record<string, { count: number; pct: number }> }> = [];

  const cats = (ohihCategories?.length ? ohihCategories : OHIH_P3_PLUS) as HealthP[];

  const todayStr = toISODateString(new Date());
  const sq = db
    .select({
      employeeId: mcus.employeeId,
      ohihReview: mcus.ohihReview,
      mcuFollowUp: mcus.mcuFollowUp,
      mcuExpiredDate: mcus.mcuExpiredDate,
      rowNum: sql<number>`row_number() over (partition by ${mcus.employeeId} order by ${mcus.mcuDate} desc)`.as('row_num'),
    })
    .from(mcus)
    .as('sq');

  for (const c of companies) {
    const scoped = { ...filter, subContractorIds: [c.id] };

    const total = await countEmployees(scoped);
    if (!total) {
      const emptyDetails: Record<string, { count: number; pct: number }> = {};
      for (const cat of OHIH_P1_TO_P7) {
        emptyDetails[cat] = { count: 0, pct: 0 };
      }
      results.push({ subContractorId: c.id, company: c.name, statusPct: 0, statusCount: 0, statusTotal: 0, followUpPct: 0, followUpCount: 0, followUpTotal: 0, details: emptyDetails });
      continue;
    }

    const baseWhere = baseEmpWhereSkipYears(scoped);
    const condP3Plus = and(
      inArray(sq.ohihReview, cats),
      isNotNull(sq.mcuExpiredDate),
      gte(sq.mcuExpiredDate, todayStr)
    );

    // P3+ / total
    const condsStatus: any[] = [condP3Plus];
    if (baseWhere) condsStatus.unshift(baseWhere);

    const [rowStatus] = await db
      .select({ n: countDistinct(employees.id).as('n') })
      .from(employees)
      .leftJoin(sq, and(eq(sq.employeeId, employees.id), eq(sq.rowNum, 1)))
      .where(and(...condsStatus));

    const nStatus = Number(rowStatus?.n ?? 0);
    const statusPct = nStatus > 0 ? Math.max(0.1, (nStatus / total) * 100) : 0;

    // P3+ & follow-up kosong / total
    const followUpEmptySq = or(
      isNull(sq.mcuFollowUp),
      eq(sql`trim(${sq.mcuFollowUp})`, ''),
      eq(sq.mcuFollowUp, 'NaN')
    );
    const condsFU: any[] = [condP3Plus, followUpEmptySq];
    if (baseWhere) condsFU.unshift(baseWhere);

    const [rowFU] = await db
      .select({ n: countDistinct(employees.id).as('n') })
      .from(employees)
      .leftJoin(sq, and(eq(sq.employeeId, employees.id), eq(sq.rowNum, 1)))
      .where(and(...condsFU));

    const nFU = Number(rowFU?.n ?? 0);
    const followUpPct = nFU > 0 ? Math.max(0.1, (nFU / total) * 100) : 0;

    // P1-P7 breakdown / total
    const condsDetail: any[] = [
      isNotNull(sq.ohihReview),
      isNotNull(sq.mcuExpiredDate),
      gte(sq.mcuExpiredDate, todayStr)
    ];
    if (baseWhere) condsDetail.unshift(baseWhere);

    const rowsDetail = await db
      .select({
        cat: sq.ohihReview,
        n: countDistinct(employees.id).as('n'),
      })
      .from(employees)
      .leftJoin(sq, and(eq(sq.employeeId, employees.id), eq(sq.rowNum, 1)))
      .where(and(...condsDetail))
      .groupBy(sq.ohihReview);

    const details: Record<string, { count: number; pct: number }> = {};
    for (const cat of OHIH_P1_TO_P7) {
      details[cat] = { count: 0, pct: 0 };
    }
    for (const r of rowsDetail) {
      const cat = String(r.cat);
      if (OHIH_P1_TO_P7.includes(cat as HealthP)) {
        const countVal = Number(r.n ?? 0);
        details[cat] = {
          count: countVal,
          pct: countVal > 0 ? Math.max(0.1, (countVal / total) * 100) : 0
        };
      }
    }

    results.push({
      subContractorId: c.id,
      company: c.name,
      statusPct,
      statusCount: nStatus,
      statusTotal: total,
      followUpPct,
      followUpCount: nFU,
      followUpTotal: total,
      details,
    });
  }

  // default urut follow-up tertinggi (yang perlu perhatian)
  results.sort((a, b) => b.followUpPct - a.followUpPct);
  return results;
}

// ===== "Type: Status / Follow Up" =====
export async function getHealthRankByCompanyTyped(
  filter?: DashboardFilter,
  types: ('status' | 'followup')[] = ['status'],
  ohihCategories?: HealthP[]
) {
  const rows = await getHealthStatusAndFollowUpRankByCompany(
    filter,
    ohihCategories && ohihCategories.length ? ohihCategories : undefined
  );

  const out = rows.map(r => {
    const entry: {
      subContractorId: string;
      company: string;
      details?: any;
      [key: string]: any;
    } = {
      subContractorId: r.subContractorId,
      company: r.company,
      details: r.details
    };

    if (types.includes('status')) {
      entry.statusPct = r.statusPct;
      entry.statusCount = r.statusCount;
      entry.statusTotal = r.statusTotal;
    }
    if (types.includes('followup')) {
      entry.followUpPct = r.followUpPct;
      entry.followUpCount = r.followUpCount;
      entry.followUpTotal = r.followUpTotal;
    }

    return entry;
  });

  // Urutkan berdasarkan tipe pertama di array `types`
  if (types.length > 0) {
    const firstType = types[0];
    const sortKey = firstType === 'status' ? 'statusPct' : 'followUpPct';
    out.sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }

  return out;
}

// =============== ENTRY POINT ===============
export async function getEmployeeDashboard(
  filter?: DashboardFilter,
  options?: ComplianceOptions,
): Promise<DashboardSummary> {
  const [
    totalEmployees,
    employeesOnDuty,
    compliancePerDocument,
    healthRiskPerCategory,
    crewOnDutyByProject,
    crewOnDutyByVessel
  ] = await Promise.all([
    countEmployees(filter),
    countEmployeesOnDuty(filter),
    getCompliancePerDocument(filter, options),
    getHealthRiskPerCategory(filter),
    getCrewOnDutyByProject(filter),
    getCrewOnDutyByVessel(filter),
  ]);

  const [
    overallCompliancePct,
    overallHealthRiskAboveP3Pct,
    complianceRankByCompany,
    healthRankByCompany
  ] = await Promise.all([
    getOverallCompliancePct(filter, options),
    getOverallHealthRiskAboveP3Pct(filter),
    getComplianceRankByCompany(filter, options),  // overall (tanpa docKey)
    getHealthRankByCompany(filter),               // default P1–P7
  ]);

  return {
    success: true,
    message: 'Dashboard retrieved successfully',
    data: {
      totalEmployees,
      employeesOnDuty,
      overallCompliancePct,
      overallHealthRiskAboveP3Pct,
      compliancePerDocument,
      healthRiskPerCategory,
      complianceRankByCompany,
      healthRankByCompany,
      crewOnDutyByProject,
      crewOnDutyByVessel
    }
  };
}

// =============== Helper: daftar tahun employees ===============
export async function listEmployeeYears(): Promise<number[]> {
  const yearExpr: any = sql.raw('EXTRACT(YEAR FROM "createdAt")::int');

  const rows = await db
    .selectDistinct({ y: yearExpr })
    .from(employees)
    .orderBy(yearExpr);

  return rows.map(r => Number(r.y)).filter(Number.isFinite);
}

// =============== Crew On Duty Summary by Project & Vessel ===============

/**
 * Get crew on duty summary grouped by project
 */
export async function getCrewOnDutyByProject(
  filter?: DashboardFilter
): Promise<CrewOnDutyByProject[]> {
  // Query 1: Employees with projectId (only category mitra and project)
  const condsWithProject: any[] = [
    eq(employees.statusOnDuty, true),
    isNotNull(employees.projectId),
    or(eq(employees.category, 'mitra'), eq(employees.category, 'project')),
  ];

  if (filter?.subContractorIds?.length) {
    condsWithProject.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      const filtered = filter.category.filter(c => c !== 'marine');
      if (filtered.length > 0) {
        condsWithProject.push(inArray(employees.category, filtered as any));
      }
    } else if (filter.category !== 'marine') {
      condsWithProject.push(eq(employees.category, filter.category as any));
    }
  }

  const finalWhereWithProject = condsWithProject.length ? and(...condsWithProject) : undefined;

  const rowsWithProject = await db
    .select({
      subContractorId: employees.subContractorId,
      subContractorName: subContractors.name,
      projectId: employees.projectId,
      projectName: subtypes.name,
      crewOnDuty: count(employees.id).as('crewOnDuty'),
    })
    .from(employees)
    .innerJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .innerJoin(subtypes, eq(employees.projectId, subtypes.id))
    .where(finalWhereWithProject)
    .groupBy(
      employees.subContractorId,
      subContractors.name,
      employees.projectId,
      subtypes.name
    )
    .orderBy(
      subContractors.name,
      subtypes.name
    );

  // Query 2: Employees without projectId (No Project) - category mitra and project only
  const condsNoProject: any[] = [
    eq(employees.statusOnDuty, true),
    isNull(employees.projectId),
    or(eq(employees.category, 'mitra'), eq(employees.category, 'project')),
  ];

  if (filter?.subContractorIds?.length) {
    condsNoProject.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      const filtered = filter.category.filter(c => c !== 'marine');
      if (filtered.length > 0) {
        condsNoProject.push(inArray(employees.category, filtered as any));
      }
    } else if (filter.category !== 'marine') {
      condsNoProject.push(eq(employees.category, filter.category as any));
    }
  }

  const finalWhereNoProject = condsNoProject.length ? and(...condsNoProject) : undefined;

  const rowsNoProject = await db
    .select({
      subContractorId: employees.subContractorId,
      subContractorName: subContractors.name,
      crewOnDuty: count(employees.id).as('crewOnDuty'),
    })
    .from(employees)
    .innerJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .where(finalWhereNoProject)
    .groupBy(
      employees.subContractorId,
      subContractors.name
    )
    .orderBy(subContractors.name);

  // Combine results
  const result: CrewOnDutyByProject[] = rowsWithProject.map(r => ({
    subContractorId: r.subContractorId,
    subContractorName: r.subContractorName,
    projectId: r.projectId || '',
    projectName: r.projectName || '',
    crewOnDuty: Number(r.crewOnDuty ?? 0),
  }));

  // Add "No Project" rows
  for (const r of rowsNoProject) {
    result.push({
      subContractorId: r.subContractorId,
      subContractorName: r.subContractorName,
      projectId: '',
      projectName: 'No Project',
      crewOnDuty: Number(r.crewOnDuty ?? 0),
    });
  }

  return result;
}

/**
 * Get crew on duty summary grouped by vessel
 */
export async function getCrewOnDutyByVessel(
  filter?: DashboardFilter
): Promise<CrewOnDutyByVessel[]> {
  // Query 1: Employees with vesselId (only category crew marine)
  const condsWithVessel: any[] = [
    eq(employees.statusOnDuty, true),
    isNotNull(employees.vesselId),
    eq(employees.category, 'marine'),
  ];

  if (filter?.subContractorIds?.length) {
    condsWithVessel.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      const filtered = filter.category.filter(c => c === 'marine');
      if (filtered.length > 0) {
        condsWithVessel.push(inArray(employees.category, filtered as any));
      }
    } else if (filter.category === 'marine') {
      condsWithVessel.push(eq(employees.category, filter.category as any));
    }
  }

  const finalWhereWithVessel = condsWithVessel.length ? and(...condsWithVessel) : undefined;

  const rowsWithVessel = await db
    .select({
      subContractorId: employees.subContractorId,
      subContractorName: subContractors.name,
      vesselId: employees.vesselId,
      vesselName: vessels.vesselName,
      crewOnDuty: count(employees.id).as('crewOnDuty'),
    })
    .from(employees)
    .innerJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .innerJoin(vessels, eq(employees.vesselId, vessels.id))
    .where(finalWhereWithVessel)
    .groupBy(
      employees.subContractorId,
      subContractors.name,
      employees.vesselId,
      vessels.vesselName
    )
    .orderBy(
      subContractors.name,
      vessels.vesselName
    );

  // Query 2: Employees without vesselId (No Vessel) - category crew marine only
  const condsNoVessel: any[] = [
    eq(employees.statusOnDuty, true),
    isNull(employees.vesselId),
    eq(employees.category, 'marine'),
  ];

  if (filter?.subContractorIds?.length) {
    condsNoVessel.push(inArray(employees.subContractorId, filter.subContractorIds));
  }
  if (filter?.category) {
    if (Array.isArray(filter.category)) {
      const filtered = filter.category.filter(c => c === 'marine');
      if (filtered.length > 0) {
        condsNoVessel.push(inArray(employees.category, filtered as any));
      }
    } else if (filter.category === 'marine') {
      condsNoVessel.push(eq(employees.category, filter.category as any));
    }
  }

  const finalWhereNoVessel = condsNoVessel.length ? and(...condsNoVessel) : undefined;

  const rowsNoVessel = await db
    .select({
      subContractorId: employees.subContractorId,
      subContractorName: subContractors.name,
      crewOnDuty: count(employees.id).as('crewOnDuty'),
    })
    .from(employees)
    .innerJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .where(finalWhereNoVessel)
    .groupBy(
      employees.subContractorId,
      subContractors.name
    )
    .orderBy(subContractors.name);

  // Combine results
  const result: CrewOnDutyByVessel[] = rowsWithVessel.map(r => ({
    subContractorId: r.subContractorId,
    subContractorName: r.subContractorName,
    vesselId: r.vesselId || '',
    vesselName: r.vesselName || '',
    crewOnDuty: Number(r.crewOnDuty ?? 0),
  }));

  // Add "No Vessel" rows
  for (const r of rowsNoVessel) {
    result.push({
      subContractorId: r.subContractorId,
      subContractorName: r.subContractorName,
      vesselId: '',
      vesselName: 'No Vessel',
      crewOnDuty: Number(r.crewOnDuty ?? 0),
    });
  }

  return result;
}

import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  type ComplianceOptions,
  type DashboardFilter,
  type ComplianceDocKey,
  type HealthP,
  getComplianceRankByCompany,
  getHealthRankByCompanyTyped,
} from '../../../../services/employee/dashboard.service.ts';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { userContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

const ComplianceDocKeyEnum = Type.Union([
  Type.Literal('BPJS'),
  Type.Literal('Contract'),
  Type.Literal('Vaccine'),
  Type.Literal('SIKA'),
  Type.Literal('MCU'),
  Type.Literal('BSS'),
  Type.Literal('BST'),
  Type.Literal('Competency Certificate'),
]);

const HealthPEnum = Type.Union([
  Type.Literal('P1'), Type.Literal('P2'), Type.Literal('P3'),
  Type.Literal('P4'), Type.Literal('P5'), Type.Literal('P6'), Type.Literal('P7'),
]);

// ---- shared enums ----
const CategoryEnum = Type.Union([
  Type.Literal('marine'),
  Type.Literal('mitra'),
  Type.Literal('project'),
]);

const OptionsSchema = Type.Object({
  fileType: Type.Optional(Type.Object({
    bpjs: Type.Optional(Type.Boolean()),
    contract: Type.Optional(Type.Boolean()),
    vaccine: Type.Optional(Type.Boolean()),
    mcu: Type.Optional(Type.Boolean()),
    sika: Type.Optional(Type.Boolean()),
    certificate: Type.Optional(Type.Boolean()),
  })),
});

const HealthTypeEnum = Type.Union([
  Type.Literal('status'),
  Type.Literal('followup'),
]);

// ---- request schemas ----
const FilterSchema = Type.Object({
  subContractorIds: Type.Optional(Type.Array(Type.String())),
  category: Type.Optional(Type.Union([CategoryEnum, Type.Array(CategoryEnum)])),
  years: Type.Optional(Type.Array(Type.Integer())),
});

const companyRankRoute: FastifyPluginAsyncTypebox = async (app) => {
// ====== 2) Company rank (compliance & health) ======
  app.route({
    method: 'POST',
    url: '/dashboard/company-rank',
    schema: {
      tags: ['Employee'],
      summary: 'Get company rank (compliance / health) with extra filters',
      body: Type.Object({
        filter: Type.Optional(FilterSchema),
        options: Type.Optional(OptionsSchema),
        rankComplianceDoc: Type.Optional(Type.Array(ComplianceDocKeyEnum)),
        rankHealthOhih: Type.Optional(Type.Array(HealthPEnum)),
        rankHealthTypes: Type.Optional(Type.Array(HealthTypeEnum)),
        rankHealthType: Type.Optional(HealthTypeEnum),
      }),
      response: {
        200: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const {
        filter,
        options,
        rankComplianceDoc,
        rankHealthOhih,
        rankHealthTypes,
      } = req.body as {
        filter?: DashboardFilter;
        options?: ComplianceOptions;
        rankComplianceDoc?: ComplianceDocKey[];
        rankHealthOhih?: HealthP[];
        rankHealthTypes?: ('status' | 'followup')[];
      };

      const filterObj = filter || {};
      let allowedContractorIds: string[] = [];

      if (user.role === 'contractor') {
        const contractorAccess = await db
          .select({ contractorId: userContractors.contractorId })
          .from(userContractors)
          .where(eq(userContractors.userId, user.id));

        allowedContractorIds = contractorAccess.map((row) => row.contractorId);
      }

      // ===== Compliance rank =====
      let complianceRank;
      if (Array.isArray(rankComplianceDoc) && rankComplianceDoc.length) {
        const perDocRanks = await Promise.all(
          rankComplianceDoc.map((doc) =>
            getComplianceRankByCompany(filterObj, options, doc)
          )
        );

        const acc = new Map<
          string,
          { subContractorId: string; company: string; sum: number; n: number; total: number }
        >();

        for (const ranks of perDocRanks) {
          for (const item of ranks) {
            const key = item.subContractorId;
            const prev = acc.get(key);
            if (prev) {
              prev.sum += item.pct;
              prev.n += 1;
            } else {
              acc.set(key, {
                subContractorId: item.subContractorId,
                company: item.company,
                sum: item.pct,
                n: 1,
                total: item.total || 0,
              });
            }
          }
        }

        complianceRank = Array.from(acc.values())
          .map((v) => {
            const pct = v.n ? v.sum / v.n : 0;
            const count = Math.round((pct / 100) * v.total);
            return {
              subContractorId: v.subContractorId,
              company: v.company,
              pct,
              count,
              total: v.total,
            };
          })
          .sort((a, b) => b.pct - a.pct);
      } else {
        complianceRank = await getComplianceRankByCompany(filterObj, options);
      }

      // ===== Health rank =====
      // Coerce: pakai array baru jika ada; kalau tidak, fallback ke legacy single; default 'status'
      const typesArr: ('status' | 'followup')[] =
        Array.isArray(rankHealthTypes) && rankHealthTypes.length
          ? rankHealthTypes
          : ['status'];

      const healthRank = await getHealthRankByCompanyTyped(
        filterObj,
        typesArr,
        Array.isArray(rankHealthOhih) && rankHealthOhih.length
          ? rankHealthOhih
          : undefined
      );

      return reply.code(200).send({
        success: true,
        message: req.i18n.t('user.employee.companyRankRetrieved'),
        data: {
          complianceRankByCompany: complianceRank,
          healthRankByCompany: healthRank,
          allowedContractorIds,
        },
      });
    }),
  });
};

export default companyRankRoute;
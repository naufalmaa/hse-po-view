// src/api/v1/employee/routes/dashboard.route.ts
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  type ComplianceOptions,
  type DashboardFilter,
  getEmployeeDashboard,
  getComplianceRankByCompany,
  getHealthRankByCompany,
} from '../../../../services/employee/dashboard.service.ts';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { userContractors, subContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

// ---- shared enums ----
const CategoryEnum = Type.Union([
  Type.Literal('marine'),
  Type.Literal('mitra'),
  Type.Literal('project'),
]);

// ---- request schemas ----
const FilterSchema = Type.Object({
  subContractorIds: Type.Optional(Type.Array(Type.String())),
  category: Type.Optional(Type.Union([CategoryEnum, Type.Array(CategoryEnum)])),
  years: Type.Optional(Type.Array(Type.Integer())),
});

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

const dashboardEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  // ====== 1) Full dashboard ======
  app.route({
    method: 'POST',
    url: '/dashboard',
    schema: {
      tags: ['Employee'],
      summary: 'Get employee dashboard',
      body: Type.Object({
        filter: Type.Optional(FilterSchema),
        options: Type.Optional(OptionsSchema),
      }),
      response: {
        200: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const { filter, options } = req.body as {
        filter?: DashboardFilter;
        options?: ComplianceOptions;
      };

      const filterObj = filter || {};
      let contractorCategories: string[] = [];

      if (user.role === 'contractor') {
        const contractorAccess = await db
          .select({
            contractorId: userContractors.contractorId,
            category: subContractors.category,
          })
          .from(userContractors)
          .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
          .where(eq(userContractors.userId, user.id));

        const allowedIds = contractorAccess.map((row) => row.contractorId);
        contractorCategories = contractorAccess
          .map((row) => row.category)
          .filter((cat): cat is string => !!cat);

        if (allowedIds.length === 0) {
          filterObj.subContractorIds = ['00000000-0000-0000-0000-000000000000'];
        } else {
          if (filterObj.subContractorIds && filterObj.subContractorIds.length > 0) {
            filterObj.subContractorIds = filterObj.subContractorIds.filter((id) =>
              allowedIds.includes(id)
            );
            if (filterObj.subContractorIds.length === 0) {
              filterObj.subContractorIds = ['00000000-0000-0000-0000-000000000000'];
            }
          } else {
            filterObj.subContractorIds = allowedIds;
          }
        }
      }

      const data = await getEmployeeDashboard(filterObj, options);

      let allowedContractorIds: string[] = [];
      if (user.role === 'contractor') {
        const contractorAccess = await db
          .select({ contractorId: userContractors.contractorId })
          .from(userContractors)
          .where(eq(userContractors.userId, user.id));
        allowedContractorIds = contractorAccess.map((row) => row.contractorId);

        if (data.data) {
          const [complianceRankByCompany, healthRankByCompany] = await Promise.all([
            getComplianceRankByCompany(filter, options),
            getHealthRankByCompany(filter),
          ]);
          data.data.complianceRankByCompany = complianceRankByCompany;
          data.data.healthRankByCompany = healthRankByCompany;
        }
      }

      return reply.code(200).send({
        ...data,
        data: {
          ...data.data,
          contractorCategories,
          allowedContractorIds,
        },
        message: req.i18n.t('user.employee.dashboardRetrieved')
      });
    }),
  });

  
};

export default dashboardEmployeeRoute;
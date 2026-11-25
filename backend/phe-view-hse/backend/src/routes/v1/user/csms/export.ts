import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { exportDashboardExcelService } from "../../../../services/csms/export-dashboard-excel.service.ts";
import { exportAiEvaluationExcelService } from "../../../../services/csms/contract/export-ai-evaluation.service.ts";
import { withErrorHandler } from "../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from '../../../../db/index.ts';
import { users, userContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';


const DashboardBodySchema = Type.Object({
  year: Type.Optional(Type.Union([Type.Number(), Type.Array(Type.Number())])),
  contractorId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())]))
});

const AiEvaluationQuerySchema = Type.Object({
  contractId: Type.String(),
  folderId: Type.String()
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const exportRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Export dashboard metrics to Excel
  app.route({
    method: 'POST',
    url: '/dashboard/export',
    schema: {
      description: "Export CSMS dashboard metrics to Excel",
      tags: ["CSMS Dashboard"],
      body: DashboardBodySchema,
      response: {
        200: { type: 'string', format: 'binary' },
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session.user;
        if (!user) {
          return reply.status(401).send({
            success: false,
            message: req.i18n.t('auth.unauthorized')
          });
        }

        const userId = user.id;
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));

        if (!dbUser) {
          return reply.status(401).send({
            success: false,
            message: req.i18n.t('auth.userNotFoundInDb')
          });
        }

        const { year, contractorId } = req.body as {
          year?: number | number[],
          contractorId?: string | string[]
        };

        let effectiveContractorId = contractorId;
        if (user.role === 'contractor') {
          const userSubcontractors = await db
            .select({ contractorId: userContractors.contractorId })
            .from(userContractors)
            .where(eq(userContractors.userId, userId));

          const subcontractorIds = userSubcontractors.map(item => item.contractorId);
          effectiveContractorId = subcontractorIds.length > 0 ? subcontractorIds : [];
        }

        const buffer = await exportDashboardExcelService({
          year,
          contractorId: effectiveContractorId
        });

        const yearLabel = Array.isArray(year) ? year.join('_') : (year || new Date().getFullYear());
        const filename = `CSMS_Dashboard_Export_${yearLabel}.xlsx`;

        return reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', `attachment; filename=${filename}`)
          .send(buffer);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.csms.dashboard.exportFailed') + ': ' + (error.message || 'Unknown error')
        });
      }
    }),
  });

  // Export AI evaluation report
  app.route({
    method: 'GET',
    url: '/ai-evaluation/export',
    schema: {
      description: "Export CSMS AI evaluation report to Excel",
      tags: ["CSMS Dashboard"],
      querystring: AiEvaluationQuerySchema,
      response: {
        200: { type: 'string', format: 'binary' },
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session.user;
        if (!user) {
          return reply.status(401).send({
            success: false,
            message: req.i18n.t('auth.unauthorized')
          });
        }

        const { contractId, folderId } = req.query as { contractId: string; folderId: string };

        const buffer = await exportAiEvaluationExcelService(contractId, folderId);
        const filename = `Evaluation_Report_AI.xlsx`;

        return reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', `attachment; filename=${filename}`)
          .send(buffer);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: 'Export failed: ' + (error.message || 'Unknown error')
        });
      }
    }),
  });
};

export default exportRoute;

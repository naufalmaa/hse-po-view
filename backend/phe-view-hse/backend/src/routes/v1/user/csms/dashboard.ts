import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getCSMSDashboardMetrics, getCompletionRateBreakdown, getElementBreakdownByCompany } from "../../../../services/csms/dashboard.service.ts";
import { withErrorHandler } from "../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from '../../../../db/index.ts';
import { users, userContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

const CompletionRateItem = Type.Object({
  contractId: Type.String(),
  contractTitle: Type.String(),
  contractNumber: Type.String(),
  contractfolderName: Type.String(),
  dateAssessment: Type.String(),
  isComplete: Type.Boolean(),
  fillingProgress: Type.Number(),
  isFinal: Type.Boolean(),
  vendorName: Type.Union([Type.String(), Type.Null()]),
  vesselName: Type.Union([Type.String(), Type.Null()]),
  score: Type.Union([Type.Number(), Type.Null()]),
  passStatus: Type.Union([Type.String(), Type.Null()]),
});

const SemesterCompletion = Type.Object({
  completionRate: Type.Number(),
  items: Type.Array(CompletionRateItem)
});

const YearCompletion = Type.Object({
  year: Type.Number(),
  semester1: SemesterCompletion,
  semester2: SemesterCompletion
});

const ElementBreakdownResponse = Type.Object({
  elements: Type.Array(Type.String()),
  semester1: Type.Array(Type.Object({
    id: Type.String(),
    vendorName: Type.String(),
    vesselName: Type.String(),
    score: Type.Union([Type.Number(), Type.Null()]),
    rencanaK3LLScore: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    elementScores: Type.Record(Type.String(), Type.Union([Type.Number(), Type.Null()]))
  })),
  semester2: Type.Array(Type.Object({
    id: Type.String(),
    vendorName: Type.String(),
    vesselName: Type.String(),
    score: Type.Union([Type.Number(), Type.Null()]),
    rencanaK3LLScore: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    elementScores: Type.Record(Type.String(), Type.Union([Type.Number(), Type.Null()]))
  })),
  penilaianAkhir: Type.Array(Type.Object({
    id: Type.String(),
    vendorName: Type.String(),
    vesselName: Type.String(),
    score: Type.Union([Type.Number(), Type.Null()]),
    rencanaK3LLScore: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    elementScores: Type.Record(Type.String(), Type.Union([Type.Number(), Type.Null()]))
  }))
});

const PerformanceMetrics = Type.Object({
  pbSemester1: Type.Number(),
  pbSemester2: Type.Number(),
  paYearly: Type.Number(),
  totalPerformance: Type.Number()
});

const CompletionRateBreakdownResponse = Type.Array(YearCompletion);

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    totalFilesUploaded: Type.Number(),
    qualificationAssessments: Type.Object({
      notExpired: Type.Number(),
      expired: Type.Number()
    }),
    contracts: Type.Object({
      withOngoingAssessments: Type.Number(),
      withAllFoldersComplete: Type.Number()
    }),
    totalContractors: Type.Number(),
    completionPercentage: Type.Number(),
    ongoingActivitiesCount: Type.Number(),
    incomingActivitiesCount: Type.Number(),
    completionRateBreakdown: CompletionRateBreakdownResponse,
    performanceMetrics: PerformanceMetrics,
    elementBreakdown: ElementBreakdownResponse
  })
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const DashboardBodySchema = Type.Object({
  year: Type.Optional(Type.Union([Type.Number(), Type.Array(Type.Number())])),
  contractorId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())]))
});

const dashboardRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Main dashboard metrics endpoint
  app.route({
    method: 'POST',
    url: '/dashboard',
    schema: {
      description: "Get CSMS dashboard metrics",
      tags: ["CSMS Dashboard"],
      body: DashboardBodySchema,
      response: {
        200: SuccessResponse,
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

        // If user is a contractor, filter by their subcontractor IDs
        let effectiveContractorId = contractorId;
        if (user.role === 'contractor') {
          // Get subcontractor IDs associated with this user
          const userSubcontractors = await db
            .select({ contractorId: userContractors.contractorId })
            .from(userContractors)
            .where(eq(userContractors.userId, userId));

          const subcontractorIds = userSubcontractors.map(item => item.contractorId);

          // Use subcontractor IDs for filtering, ignoring any contractorId from request body
          effectiveContractorId = subcontractorIds.length > 0 ? subcontractorIds : [];
        }

        const [metrics, completionBreakdown, elementBreakdown] = await Promise.all([
          getCSMSDashboardMetrics(year, effectiveContractorId),
          getCompletionRateBreakdown(year, effectiveContractorId),
          getElementBreakdownByCompany(year, effectiveContractorId)
        ]);

        const { breakdown, performance } = completionBreakdown;

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.dashboard.metricsRetrieved'),
          data: {
            ...metrics,
            completionRateBreakdown: breakdown,
            performanceMetrics: performance,
            elementBreakdown
          }
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.csms.dashboard.metricsRetrieveFailed') + ': ' + (error.message || 'Unknown error')
        });
      }
    }),
  });
};

export default dashboardRoute;
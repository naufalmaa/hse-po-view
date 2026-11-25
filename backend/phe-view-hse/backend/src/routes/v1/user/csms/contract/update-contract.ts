import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { updateContract, type UpdateContractInput } from "../../../../../services/csms/contract/update.service.ts";
import { convertUTCToWIB } from "../../../../../utils/timezone.ts";

const bodySchema = Type.Partial(Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  contractorId: Type.String({ format: 'uuid' }),
  vesselId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null(), Type.Literal('')])), // Allow uuid, null, or empty string
  numberContract: Type.String({ minLength: 1, maxLength: 255 }),
  riskAssessmentId: Type.Optional(Type.String({ maxLength: 255 })),
  riskLevel: Type.Optional(Type.String({ maxLength: 50 })),
  startDate: Type.String({ format: 'date' }),
  endDate: Type.String({ format: 'date' }),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
  extra: Type.Optional(Type.Object({
    projectId: Type.Optional(Type.String()),
    isAssessed: Type.Optional(Type.Boolean())
  })),
}));

const paramsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

const updateContractRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/contracts/:id',
    method: 'PUT',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Update contract details',
      description: 'Update an existing contract with new details',
      params: paramsSchema,
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String({ format: 'uuid' }),
            contractorId: Type.String({ format: 'uuid' }),
            vesselId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
            title: Type.String(),
            numberContract: Type.String(),
            riskAssessmentId: Type.Optional(Type.String()),
            riskLevel: Type.Optional(Type.String()),
            startDate: Type.String({ format: 'date' }),
            endDate: Type.String({ format: 'date' }),
            nearestOngoingAssessmentDate: Type.Any(),
            finalAssessmentDate: Type.String({ format: 'date' }),
            note: Type.String(),
            createdAt: Type.String({ format: 'date-time' }),
            updatedAt: Type.String({ format: 'date-time' })
          })
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateContractInput;

      try {
        // Update the contract
        const updatedContract = await updateContract(id, input);

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.contractUpdated'),
          data: {
            ...updatedContract,
            createdAt: convertUTCToWIB(updatedContract.createdAt),
            updatedAt: convertUTCToWIB(updatedContract.updatedAt),
          },
        });
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.contractNotFound') + ': ' + error.message,
          });
        }

        if (error.message.includes("already exists") || error.message.includes("must be after")) {
          return reply.status(400).send({
            success: false,
            message: error.message,
          });
        }

        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.contractUpdateFailed'),
        });
      }
    })
  });
};

export default updateContractRoutes;
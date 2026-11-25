import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { createContract, type CreateContractInput } from "../../../../../services/csms/contract/create.service.ts";
import { initializeContractStructure } from "../../../../../services/csms/contract/initialization.service.ts";
import { convertUTCToWIB } from "../../../../../utils/timezone.ts";

const bodySchema = Type.Object({
  contractorId: Type.String({ format: 'uuid' }),
  vesselId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null(), Type.Literal('')])), // Allow uuid, null, or empty string
  title: Type.String({ minLength: 1, maxLength: 255 }),
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
});

const createContractRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/create-contract',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Create a new contract',
      description: 'Create a new contract and automatically generate its folder structure',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
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
          }),
          message: Type.String()
        }),
        400: Type.Object({
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
      const input = req.body as CreateContractInput;

      try {
        // Create the contract
        const newContract = await createContract(input);

        // Automatically initialize the contract folder structure
        await initializeContractStructure(newContract.id);

        return reply.status(200).send({
          success: true,
          data: {
            ...newContract,
            createdAt: convertUTCToWIB(newContract.createdAt),
            updatedAt: convertUTCToWIB(newContract.updatedAt),
          },
          message: req.i18n.t('user.csms.contract.contractCreated')
        });
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.contractAlreadyExists'),
          });
        }
        if (error.message.includes("Invalid date")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.invalidDate'),
          });
        }

        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.csms.contract.contractCreateFailed'),
        });
      }
    })
  });
};

export default createContractRoutes;
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { updateAssessmentDates } from "../../../../../services/csms/contract/update-assessment-dates.service.ts";
import { convertUTCToWIB } from "../../../../../utils/timezone.ts";

const bodySchema = Type.Object({
  contractId: Type.String({ format: 'uuid' }),
  finalAssessmentDate: Type.Optional(Type.String({ format: 'date' })),
  nearestOngoingAssessmentDate: Type.Any(),
  psbAssessmentDate: Type.Optional(Type.String({ format: 'date' })),
  // Rename exactly these PB folders (by id) instead of pairing folders with dates by order
  folderDates: Type.Optional(Type.Array(Type.Object({
    folderId: Type.String({ format: 'uuid' }),
    date: Type.String({ format: 'date' }),
  }))),
});

const updateAssessmentDatesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/update-assessment-dates',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Update assessment dates for a contract',
      description: 'Update the final assessment date and nearest ongoing assessment date for a contract',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            contract: Type.Object({
              id: Type.String({ format: 'uuid' }),
              contractorId: Type.String({ format: 'uuid' }),
              title: Type.String(),
              numberContract: Type.String(),
              startDate: Type.String({ format: 'date' }),
              endDate: Type.String({ format: 'date' }),
              nearestOngoingAssessmentDate: Type.Any(),
              finalAssessmentDate: Type.Optional(Type.Union([Type.String({ format: 'date' }), Type.Null()])),
              note: Type.String(),
              createdAt: Type.String({ format: 'date-time' }),
              updatedAt: Type.String({ format: 'date-time' })
            })
          })
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
      const { contractId, finalAssessmentDate, nearestOngoingAssessmentDate, psbAssessmentDate, folderDates } = req.body as {
        contractId: string;
        finalAssessmentDate: string | undefined;
        nearestOngoingAssessmentDate: any;
        psbAssessmentDate: string | undefined;
        folderDates: { folderId: string; date: string }[] | undefined;
      };

      try {
        const result = await updateAssessmentDates(
          contractId,
          finalAssessmentDate,
          nearestOngoingAssessmentDate,
          undefined,
          psbAssessmentDate,
          folderDates
        );
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.assessmentDatesUpdated'),
          data: {
            contract: {
              ...result.contract,
              createdAt: convertUTCToWIB(result.contract.createdAt),
              updatedAt: convertUTCToWIB(result.contract.updatedAt),
            }
          },
        });
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.contractNotFound') + ': ' + error.message,
          });
        }
        
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.assessmentDatesUpdateFailed'),
        });
      }
    })
  });
};

export default updateAssessmentDatesRoutes;
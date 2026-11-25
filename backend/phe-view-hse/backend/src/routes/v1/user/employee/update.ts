import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { castFieldsWithSchema } from '../../../../utils/cast.ts';
import { CreateFullEmployeeSchema } from '../../../../schema/employee.schema.ts';
import { updateEmployeeService } from '../../../../services/employee/update.service.ts';
import type { UploadedFile } from '../../../../types/file.ts';
import { handleMultipartUpload, extractUploadedFiles, processCertificatesWithFiles } from '../../../../services/employee/handleUpload.service.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const updateEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/:employeeId',
    schema: {
      tags: ['Employee'],
      summary: 'Update employee with file upload',
      consumes: ['multipart/form-data'],
      params: Type.Object({
        employeeId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        403: ErrorResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const allowedRoles = ['admin', 'user', 'contractor', 'crew'];
      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({ 
          success: false,
          message: req.i18n.t('user.employee.unauthorizedRole')
        });
      }

      const { employeeId } = req.params as { employeeId: string };
      
      // Use the new service to handle multipart upload
      let rawFields: Record<string, any> = {};
      let filesMap: Record<string, UploadedFile[]> = {};

      if (typeof req.parts === 'function') {
        const result = await handleMultipartUpload(req.parts());
        rawFields = result.rawFields;
        filesMap = result.filesMap;
      }

      // Cast main fields
      const casted = castFieldsWithSchema(rawFields, CreateFullEmployeeSchema);
      
      const {
        employeeName,
        category,
        subContractorId,
        identityNumber,
        ...restFields
      } = casted;

      // Extract nested JSON
      const contract = rawFields.contract;
      const mcu = rawFields.mcu;
      const bpjs = rawFields.bpjs;
      const vaccination = rawFields.vaccination;
      const sika = rawFields.sika;
      const certificates = rawFields.certificates; // now a single object

      // Extract main image
      const image = filesMap.image?.[0];

      // Handle certificate object using the new service
      const certificateData = processCertificatesWithFiles(certificates, filesMap);

      // Call service
      try {
        const result = await updateEmployeeService({
          employeeId,
          employeeName,
          category,
          subContractorId,
          identityNumber,
          ...restFields,
          contract,
          mcu,
          bpjs,
          vaccination,
          sika,
          certificates: certificateData,
          image,
          files: {
            contract: extractUploadedFiles(contract, filesMap),
            mcu: extractUploadedFiles(mcu, filesMap),
            bpjs: extractUploadedFiles(bpjs, filesMap),
            vaccination: extractUploadedFiles(vaccination, filesMap),
            sika: extractUploadedFiles(sika, filesMap),
            certificate: certificateData?.files ?? [],
          },
        });

        return reply.send({
          success: true,
          message: req.i18n.t('user.employee.employeeUpdated'),
          data: convertDeepTimestampsToWIB(result.detail)
        });
      } catch (error: any) {
        console.error('[UPDATE EMPLOYEE ERROR]', error);
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeUpdateFailed'),
          error: error.message
        });
      }
    }),
  });
};

export default updateEmployeeRoute;
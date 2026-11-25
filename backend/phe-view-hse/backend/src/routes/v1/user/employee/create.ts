import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { createEmployeeService } from '../../../../services/employee/create.service.ts';
import { castFieldsWithSchema } from '../../../../utils/cast.ts';
import { CreateFullEmployeeSchema } from '../../../../schema/employee.schema.ts';
import type { UploadedFile } from '../../../../types/file.ts';
import { Type } from '@sinclair/typebox';
import { handleMultipartUpload, extractUploadedFiles, processCertificatesWithFiles } from '../../../../services/employee/handleUpload.service.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const createEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/create',
    schema: {
      tags: ['Employee'],
      summary: 'Create new employee with file upload',
      consumes: ['multipart/form-data'],
      response: {
        200: Type.Any(),
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      // Use the new service to handle multipart upload
      let rawFields: Record<string, any> = {};
      let filesMap: Record<string, UploadedFile[]> = {};

      if (typeof req.parts === 'function') {
        const result = await handleMultipartUpload(req.parts());
        rawFields = result.rawFields;
        filesMap = result.filesMap;
      }

      const required = ['employeeName', 'category', 'subContractorId', 'hssePassportNumber', 'dateOfBirth'];
      for (const field of required) {
        if (!rawFields[field]) {
          return reply.status(400).send({ 
            success: false, 
            message: `${req.i18n.t('user.employee.missingRequiredField')}: ${field}` 
          });
        }
      }

      const casted = castFieldsWithSchema(rawFields, CreateFullEmployeeSchema);

      const {
        employeeName,
        category,
        subContractorId,
        identityNumber,
        contract,
        mcu,
        bpjs,
        vaccination,
        certificates,
        sika,
        ...restFields
      } = casted;

      const image = filesMap.image?.[0];

      // Process certificates with their files using the new service
      const cert = processCertificatesWithFiles(certificates, filesMap);

      try {
        const result = await createEmployeeService({
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
          certificates: cert,
          image,
          files: {
            contract: extractUploadedFiles(contract, filesMap),
            mcu: extractUploadedFiles(mcu, filesMap),
            bpjs: extractUploadedFiles(bpjs, filesMap),
            vaccination: extractUploadedFiles(vaccination, filesMap),
            sika: extractUploadedFiles(sika, filesMap),
          },
        });

        return reply.code(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.employeeCreated'),
          data: convertDeepTimestampsToWIB(result.detail),
        });
      } catch (error: any) {
        // Return user-friendly error messages from the service
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Gagal membuat data karyawan. Silakan coba lagi.';
        
        return reply.status(statusCode).send({
          success: false,
          message: message,
        });
      }
    }),
  });
};

export default createEmployeeRoute;
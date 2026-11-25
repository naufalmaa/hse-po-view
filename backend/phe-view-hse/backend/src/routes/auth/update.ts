import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../utils/withErrorHandler.ts';
import { updateUserFilesService } from '../../services/users/upload.service.ts';
import { getAuthInstance } from '../../decorators/auth.decorator.ts';
import { fromNodeHeaders } from 'better-auth/node';
import env from '../../config/env.config.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  user: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const updateUserProfileRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/update',
    schema: {
      tags: ['User'],
      summary: 'Update user profile with image and signature upload',
      consumes: ['multipart/form-data'],
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        401: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      // Check authentication
      const session = await getAuthInstance(app).api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      
      if (!session?.user) {
        return reply.status(401).send({
          success: false,
          message: req.i18n.t('auth.unauthorized')
        });
      }

      const userId = session.user.id;

      // Parse multipart form data
      const fileData: Record<string, any> = {};
      const formFields: Record<string, string> = {};

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer();
            fileData[part.fieldname] = {
              buffer,
              filename: part.filename,
              mimetype: part.mimetype
            };
          } else if (part.type === 'field') {
            formFields[part.fieldname] = part.value as string;
          }
        }
      }

      try {
        // Call service to handle file upload and database update
        const updatedUser = await updateUserFilesService({
          userId,
          name: formFields.name,
          image: fileData.image,
          signature: fileData.signature
        });

        // Build URLs the same way as get_user_info.ts
        const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsUserDir}`;
        const userResponse = { ...updatedUser };
        
        if (userResponse.image) {
          userResponse.image = `${BASE_URL}/${userId}/${userResponse.image}`;
        }
        if (userResponse.signature) {
          userResponse.signature = `${BASE_URL}/${userId}/${userResponse.signature}`;
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('profile.profileUpdated'),
          user: userResponse
        });
      } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('profile.profileUpdateFailed')
        });
      }
    })
  });
};

export default updateUserProfileRoute;

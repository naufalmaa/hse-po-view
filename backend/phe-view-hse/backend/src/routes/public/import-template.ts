import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../utils/withErrorHandler.ts';
import env from '../../config/env.config.ts';

const importEmployeeExcelPublicRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Public endpoint to download template
  app.route({
    method: 'GET',
    url: '/import-template',
    schema: {
      tags: ['Public Employee'],
      summary: 'Download Excel template for employee import (public endpoint)',
      description: 'Public endpoint to download the Excel template for employee import',
      response: {
        200: Type.Any(),
      },
    },
    handler: withErrorHandler(async (_req, reply) => {
        // Use the URL from env.config.ts
        const templateUrl = `${env.server.uploadsUrl}/Template Employee Data.xlsx`;
        
        // Added a log so you can see exactly where it's redirecting in your server terminal.
        // If it says 'localhost', you need to update your .env file on the server.
        _req.log.info({ templateUrl }, 'Redirecting to Excel template');

        return reply
        .header('Content-Disposition', 'attachment; filename="Template Employee Data.xlsx"')
        .redirect(encodeURI(templateUrl));
    }),
  });
};

export default importEmployeeExcelPublicRoute;

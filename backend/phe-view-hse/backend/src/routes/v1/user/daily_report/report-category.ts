import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import {  
  getReportCategoryData
} from '../../../../services/smartCardObservations/reportCategory.service.ts';
import { listEmployeesWithoutObservationsService } from '../../../../services/smartCardObservations/employeeWithoutObservations.service.ts';

const reportCategoryRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /report-category 
  app.route({
    method: 'GET',
    url: '/report-category',
    schema: {
      tags: ['Daily Report'],
      summary: 'Get smart card report category data',
      description: 'Get report category data from smart card observations, including category counts and employees without observations. Supports filtering by employee category and date.',
      querystring: Type.Object({
        category: Type.Optional(Type.String()),
        projectId: Type.Optional(Type.String()),
        date: Type.Optional(Type.String({ format: 'date' })),
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500, default: 10 })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            description: Type.String(),
            unsafeAction: Type.Number(),
            unsafeCondition: Type.Number(),
            nearMiss: Type.Number(),
            processSafety: Type.Number(),
            withoutObservations: Type.Array(
              Type.Object({
                name: Type.String(),
                company: Type.String(),
              })
            ),
          }),
          meta: Type.Optional(Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            view: Type.Number(),
            totalPages: Type.Number(),
            date: Type.String(),
          })),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const query = req.query as {
          category?: string;
          projectId?: string; // Add projectId to the query type
          date?: string;
          page?: number;
          limit?: number;
        };
        
        // Validate projectId usage - projectId should only be used with 'project' category
        if (query.projectId) {
          const categories = query.category ? query.category.split(',') : [];
          const hasProjectCategory = categories.length === 0 || categories.includes('project');
          const hasMarineCategory = categories.includes('marine') || categories.includes('crew marine');
          
          // If projectId is provided but category is marine or doesn't include project, return error
          if (categories.length > 0 && !hasProjectCategory) {
            return reply.code(400).send({
              success: false,
              message: req.i18n.t('user.smartCard.projectIdFilterError'),
            });
          }
          
          // If both marine and project categories are requested with projectId, it's ambiguous
          if (hasMarineCategory && hasProjectCategory && categories.length > 1) {
            return reply.code(400).send({
              success: false,
              message: req.i18n.t('user.smartCard.projectIdAmbiguousFilterError'),
            });
          }
        }
        
        const params = {
          category: query.category ? query.category.split(',') : undefined,
          projectId: query.projectId, // Pass projectId to params
          date_start: query.date,
          date_end: query.date,
        };

        // Pagination parameters
        const page = query.page ?? 0;
        const limit = query.limit ?? 10;

        // Get all data types
        const [categoriesData, withoutObservationsResult] = await Promise.all([
          getReportCategoryData(params),
          listEmployeesWithoutObservationsService({
            date_start: query.date,
            date_end: query.date,
            page,
            limit,
            category: query.category ? query.category.split(',') : undefined,
            projectId: query.projectId, // Pass projectId to without observations service too
          })
        ]);

        // Transform categories data to global structure
        const categoryCounts = {
          unsafeAction: 0,
          unsafeCondition: 0,
          nearMiss: 0,
          processSafety: 0
        };

        // Collect all descriptions for the global description field
        const allDescriptions: string[] = [];

        // Map category data to the global structure
        for (const category of categoriesData) {
          // Collect descriptions from this category
          if (category.descriptions && category.descriptions.length > 0) {
            allDescriptions.push(...category.descriptions);
          }

          // Apply category mapping
          switch (category.category) {
            case 'Unsafe Act': // Map to Unsafe Action
              categoryCounts.unsafeAction = category.count;
              break;
            case 'Unsafe Condition':
              categoryCounts.unsafeCondition = category.count;
              break;
            case 'Near Miss':
              categoryCounts.nearMiss = category.count;
              break;
            case 'Process Safety Event': // Map to Process Safety
              categoryCounts.processSafety = category.count;
              break;
          }
        }

        // Combine all descriptions into a single string
        const globalDescription = allDescriptions.join('; ');

        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.reportCategoryDataRetrieved'),
          data: {
            description: globalDescription,
            ...categoryCounts,
            withoutObservations: withoutObservationsResult.data.map(emp => ({
              name: emp.employeeName || '',
              company: emp.companyName || emp.category || ''
            }))
          },
          meta: {
            total: withoutObservationsResult.meta.total,
            page: withoutObservationsResult.meta.page,
            view: withoutObservationsResult.meta.view,
            totalPages: withoutObservationsResult.meta.totalPages,
            date: query.date || ''
          }
        });

      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.reportCategoryDataFailed'),
        });
      }
    }),
  });
};

export default reportCategoryRoute;
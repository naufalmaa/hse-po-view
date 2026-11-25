import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getOnDutyEmployeesService } from '../../../../services/employee/onDutyEmployees.service.ts';
import { eq } from 'drizzle-orm';
import { dailyReports, dailyReportSubtypes } from '../../../../db/schema/report.schema.ts';
import { userContractors } from '../../../../db/schema/auth.schema.ts';
import { db } from '../../../../db/index.ts';

// Response schemas
const OnDutyEmployeeSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  employeeName: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  position: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  category: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  dateOfBirth: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  identityNumber: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  hssePassportNumber: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  subContractorId: Type.String({ format: 'uuid' }),
  subContractorName: Type.Optional(Type.String()),
  company: Type.Optional(Type.String()),
  companyName: Type.Optional(Type.String()),
  projectId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  projectName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  dob: Type.Number(),
  lastStatusUpdate: Type.String({ format: 'date-time' }),
});

const OnDutyEmployeesResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(OnDutyEmployeeSchema),
  meta: Type.Object({
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number(),
  }),
});

const onDutyEmployeesRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Get all employees who are on duty
  app.route({
    method: 'GET',
    url: '/on-duty',
    schema: {
      tags: ['Employee'],
      summary: 'Get all employees who are on duty',
      querystring: Type.Object({
        reportId: Type.Optional(Type.String({ format: 'uuid' })),
        minDob: Type.Optional(Type.Number({ minimum: 0 })),
        pobType: Type.Optional(Type.String()),
        search: Type.Optional(Type.String()),
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 10 })),
      }),
      response: {
        200: OnDutyEmployeesResponseSchema,
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const { reportId, minDob, pobType, search, page, limit } = req.query as { 
          reportId?: string;
          minDob?: number;
          pobType?: 'all' | 'phe' | 'contr';
          search?: string;
          page?: number; 
          limit?: number; 
        };
        
        // If reportId is provided, get formType and vesselId from the report
        let projectId: string | undefined;
        let category: string[] | undefined;
        let vesselId: string | undefined;
        let workLocationId: string | null | undefined;
        let targetDate: string | undefined;
        
        if (reportId) {
          // Get report details including formType, workLocationId, and reportDate
          const [report] = await db
            .select()
            .from(dailyReports)
            .where(eq(dailyReports.id, reportId));
          
          if (report) {
            workLocationId = report.workLocationId;
            if (report.reportDate) {
              targetDate = typeof report.reportDate === 'string' 
                ? report.reportDate.split('T')[0] 
                : new Date(report.reportDate).toISOString().split('T')[0];
            }

            // Get subtype (project) from dailyReportSubtypes for project type
            if (report.formType === 'project') {
              const [subtypeRelation] = await db
                .select()
                .from(dailyReportSubtypes)
                .where(eq(dailyReportSubtypes.reportId, reportId));
              
              if (subtypeRelation) {
                projectId = subtypeRelation.subtypeId;
              }
              // For project type, include both 'project' and 'mitra' category employees
              category = ['project', 'mitra'];
            } else {
              // Use formType as category for other types
              category = [report.formType];
            }
            
            // Get vesselId from the report creator's user assignment for marine type
            if (report.formType === 'marine') {
              const [userVessel] = await db
                .select()
                .from(userContractors)
                .where(eq(userContractors.userId, report.createdByUserId));
              
              if (userVessel?.vesselId) {
                vesselId = userVessel.vesselId;
              }
            }
          }
        }
        
        const result = await getOnDutyEmployeesService({
          projectId,
          category,
          vesselId,
          workLocationId,
          targetDate,
          minDob,
          pobType,
          search,
          page,
          limit,
        });
        
        return reply.send({
          success: true,
          message: req.i18n.t('user.employee.onDutyEmployeesRetrieved'),
          data: result.data,
          meta: result.meta,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.onDutyEmployeesRetrieveFailed'),
        });
      }
    }),
  });
};

export default onDutyEmployeesRoute;
import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import {assignUserRole} from "../../../../services/users/add.service.ts";
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';

// Define the body schema separately so we can reference it
const AddUserBodySchema = Type.Object({
  email: Type.String({
    format: 'email',
    examples: ['vendor@example.com'],
  }),
  password: Type.String({
    minLength: 8,
    examples: ['securePassword123'],
  }),
  name: Type.String({
    examples: ['Budi Vendor'],
  }),
  role: Type.Optional(Type.Enum({
    admin: 'admin',
    user: 'user',
    evaluator: 'evaluator',
    verifikator: 'verifikator',
    manager: 'manager',
    contractor: 'contractor',
    crew: 'crew',
  })),
  sub_contractor: Type.Optional(Type.Array(
    Type.String({ format: 'uuid' }),
    {
      examples: [['5f8a7694-5262-48ed-b18c-99507b4e25db', '68ca36a4-4bc7-4be0-b675-8706131ffe9e']],
    }
  )),
  vesselId: Type.Optional(Type.String({ format: 'uuid' })),
  data: Type.Optional(Type.Record(Type.String(), Type.Any())),
});

// Extract the static type from the schema
type AddUserBodyType = Static<typeof AddUserBodySchema>;

const addUserAdminRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/add',
    method: 'POST',
    schema: {
      tags: ['Admin'],
      summary: 'Add user',
      description: 'Add a new user with optional contractor role and sub_contractor UUIDs',
      body: AddUserBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.Optional(Type.String()),
          user: Type.Any()
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const auth = getAuthInstance(app);
      const body = req.body as AddUserBodyType;

      try {
        // Create user via Better Auth
        const result = await auth.api.createUser({
          body: {
            email: body.email,
            password: body.password,
            name: body.name,
            data: {
              ...(body.role && { role: body.role }),
              ...(body.data || {}),
            },
          },
          headers: fromNodeHeaders(req.headers),
        });

        const userId = result.user?.id;
        if (!userId) {
          return reply.badRequest(req.i18n.t('admin.user.userAddFailed'));
        }

        // Assign role + contractor linkage
        const assignResult = await assignUserRole({
          userId,
          role: body.role,
          sub_contractor: body.sub_contractor,
          // Ignore vesselId if role is contractor
          vesselId: body.role === 'contractor' ? undefined : body.vesselId,
        });

        if (!assignResult.success) {
          return reply.badRequest(req.i18n.t('admin.user.userAddFailed'));
        }

        // Return updated user
        return reply.status(200).send({ message: req.i18n.t('admin.user.userAdded'), user: assignResult.user });

      } catch (err) {
        return reply.badRequest(req.i18n.t('admin.user.userAddFailed'));
      }
    }),
  });
};

export default addUserAdminRoute;
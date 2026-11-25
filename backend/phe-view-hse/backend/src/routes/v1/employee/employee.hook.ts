import type { FastifyInstance } from 'fastify';
import { resolveSession } from '../../../utils/auth-session.ts';

async function authHook(fastify: FastifyInstance) {
  fastify.decorateRequest('session');

  fastify.addHook('preHandler', async (req, res) => {
    const session = await resolveSession(fastify, req);

    if (!session?.user) {
      return res.unauthorized('You must be logged in to access this resource.');
    }

    // ✅ Cek role
    if (session.user.role !== 'employee') {
      return res.forbidden('You do not have privileges.');
    }

    req.setDecorator('session', session);
  });
}

export default authHook;

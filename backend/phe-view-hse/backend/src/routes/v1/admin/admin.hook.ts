import type { FastifyInstance } from 'fastify';
import { resolveSession } from '../../../utils/auth-session.ts';

async function adminAuthHook(fastify: FastifyInstance) {
  fastify.decorateRequest('session');

  fastify.addHook('preHandler', async (req, res) => {
    const session = await resolveSession(fastify, req);

    if (!session?.user) {
      return res.unauthorized('Login required to access this resource.');
    }

    // ✅ Cek role
    if (session.user.role !== 'admin') {
      return res.forbidden('You do not have admin privileges.');
    }

    req.setDecorator('session', session);
  });
}

export default adminAuthHook;

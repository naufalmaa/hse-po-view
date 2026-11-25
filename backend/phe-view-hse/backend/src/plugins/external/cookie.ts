import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import envConfig from '../../config/env.config.ts';

export default fp(
  async (fastify) => {
    fastify.register(fastifyCookie, {
      secret: envConfig.server.secretKey,
    });
  },
  {
    name: 'cookie',
  },
);

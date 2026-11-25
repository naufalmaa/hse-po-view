import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

import AutoLoad from '@fastify/autoload';
import Fastify, { type FastifyServerOptions } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket'; 
import i18n from 'fastify-i18n';
import { idMessages } from './locales/index.ts';
import { uploadsPath } from './config/env.config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


export async function buildApp(options?: FastifyServerOptions) {
  const server = Fastify(options);

  // Configure i18n with proper options for fastify-i18n v3
  server.register(i18n, {
    fallbackLocale: 'id',
    messages: {
      id: idMessages
    }
  });

  // Auto-load plugins
  await server.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    dirNameRoutePrefix: false,
  });

  // WebSocket plugins
  server.register(fastifyWebsocket);

  // Serve static files
  const uploadDir = uploadsPath();

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  server.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    setHeaders: (res, _path) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  // Auto-load routes
  server.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    autoHooks: true,
    autoHooksPattern: /\.hook(?:\.ts|\.js|\.cjs|\.mjs)$/i,
    cascadeHooks: true,
    options: { prefix: '/api/' },
  });

  // Error handler
  server.setErrorHandler((err, request, reply) => {
    server.log.error(
      {
        err,
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
        },
      },
      'Unhandled error occurred',
    );

    // Type guard to check if error has statusCode property
    const getErrorCode = (error: unknown): number => {
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (typeof statusCode === 'number') {
          return statusCode;
        }
      }
      return 500;
    };

    // Type guard to check if error has message property
    const getErrorMessage = (error: unknown): string => {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: string }).message;
        if (typeof message === 'string') {
          return message;
        }
      }
      return 'Internal Server Error';
    };

    const statusCode = getErrorCode(err);
    reply.code(statusCode);

    let message = 'Internal Server Error';
    if (statusCode < 500) {
      message = getErrorMessage(err);
    }

    return { message };
  });

  // Not found handler
  server.setNotFoundHandler(
    {
      preHandler: server.rateLimit({
        max: 4,
        timeWindow: 500,
      }),
    },
    (request, reply) => {
      request.log.warn(
        {
          request: {
            method: request.method,
            url: request.url,
            query: request.query,
            params: request.params,
          },
        },
        'Resource not found',
      );

      reply.code(404);
      return { message: 'Not Found' };
    },
  );

  return server;
}

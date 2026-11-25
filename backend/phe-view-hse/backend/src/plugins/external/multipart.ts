import FastifyMultipart, { type FastifyMultipartOptions } from '@fastify/multipart';

export const autoConfig: FastifyMultipartOptions = {
   limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024 * 2,
      fields: 50,
      fileSize: 100 * 1024 * 1024,
      files: 50,
      parts: 2000,
   },
};

export default FastifyMultipart;

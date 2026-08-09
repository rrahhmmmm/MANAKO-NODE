import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { fail, ok } from './lib/response.js';

import { authRoutes } from './modules/auth/routes.js';
import { usersRoutes } from './modules/users/routes.js';
import { vendorsRoutes } from './modules/vendors/routes.js';
import { docTypesRoutes } from './modules/masters/routes.js';
import { projectsRoutes } from './modules/projects/routes.js';
import { terminsRoutes } from './modules/termins/routes.js';
import { documentsRoutes } from './modules/documents/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { reportsRoutes } from './modules/reports/routes.js';
import { syncRoutes } from './modules/sync/routes.js';

async function build() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } } }
        : true,
    trustProxy: true,
    bodyLimit: env.MAX_UPLOAD_MB * 1024 * 1024 + 1024 * 1024,
  });

  await app.register(sensible);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, {
    secret: {
      private: env.JWT_ACCESS_SECRET,
      public: env.JWT_ACCESS_SECRET,
    },
  });
  await app.register(multipart, {
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  });

  // Health
  app.get('/health', async () => ok({ status: 'ok', env: env.NODE_ENV }));

  // v1 routes
  await app.register(
    async (v1) => {
      await v1.register(authRoutes,     { prefix: '/auth' });
      await v1.register(usersRoutes,    { prefix: '/users' });
      await v1.register(vendorsRoutes,  { prefix: '/vendors' });
      await v1.register(docTypesRoutes, { prefix: '/doc-types' });
      await v1.register(projectsRoutes, { prefix: '/projects' });
      await v1.register(terminsRoutes,  { prefix: '' });     // mixed prefix
      await v1.register(documentsRoutes,{ prefix: '/documents' });
      await v1.register(dashboardRoutes,{ prefix: '/dashboard' });
      await v1.register(reportsRoutes,  { prefix: '/reports' });
      await v1.register(syncRoutes,     { prefix: '/sync' });
    },
    { prefix: '/api/v1' },
  );

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send(fail(status === 500 ? 'INTERNAL' : 'ERROR', err.message));
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send(fail('NOT_FOUND', 'Route tidak ditemukan')),
  );

  return app;
}

async function main() {
  const app = await build();
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, closing…`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();

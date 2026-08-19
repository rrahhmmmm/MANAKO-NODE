import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import {
  dashboardProjectsQuerySchema,
  dashboardRemindersQuerySchema,
  dashboardStatsQuerySchema,
} from './schema.js';
import * as dashboardService from './service.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/stats', async (req, reply) => {
    const parsed = dashboardStatsQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const stats = await dashboardService.getStats(parsed.data.year);
    return ok(stats);
  });

  app.get('/reminders', async (req, reply) => {
    const parsed = dashboardRemindersQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const result = await dashboardService.getReminders(parsed.data);
    return ok(result);
  });

  app.get('/projects', async (req, reply) => {
    const parsed = dashboardProjectsQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const result = await dashboardService.getProjects(parsed.data);
    return ok(result);
  });
}

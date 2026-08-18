import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import {
  codePreviewQuerySchema,
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './schema.js';
import * as projectsService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function projectsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req, reply) => {
    const parsed = listProjectsQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const result = await projectsService.list(parsed.data);
    return ok(result);
  });

  app.post('/', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const project = await projectsService.create(parsed.data);
      return reply.code(201).send(ok(project));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.get('/code/preview', async (req, reply) => {
    const parsed = codePreviewQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const preview = await projectsService.previewCode(parsed.data.type);
    return ok(preview);
  });

  app.get('/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const project = await projectsService.getById(id);
      return ok(project);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.patch('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const project = await projectsService.update(id, parsed.data);
      return ok(project);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.delete('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await projectsService.remove(id);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });
}

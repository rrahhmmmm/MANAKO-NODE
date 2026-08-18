import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { createTerminSchema, deleteTerminQuerySchema, updateTerminSchema } from './schema.js';
import * as terminsService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

// Mount di /api/v1 tanpa prefix — path berupa /projects/:id/termins & /termins/:id
export async function terminsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/projects/:id/termins', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const rows = await terminsService.list(id);
    return ok(rows);
  });

  app.post('/projects/:id/termins', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = createTerminSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const termin = await terminsService.create(id, parsed.data);
      return reply.code(201).send(ok(termin));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.get('/termins/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const termin = await terminsService.getById(id);
      return ok(termin);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.patch('/termins/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateTerminSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const termin = await terminsService.update(id, parsed.data);
      return ok(termin);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.delete('/termins/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsedQuery = deleteTerminQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid'));
    try {
      const result = await terminsService.remove(id, parsedQuery.data.force);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });
}

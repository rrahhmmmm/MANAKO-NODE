import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { createDocTypeSchema, listDocTypesQuerySchema, updateDocTypeSchema } from './schema.js';
import * as docTypesService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function docTypesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req, reply) => {
    const parsed = listDocTypesQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const rows = await docTypesService.list(parsed.data);
    return ok(rows);
  });

  app.post('/', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = createDocTypeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const docType = await docTypesService.create(parsed.data);
      return reply.code(201).send(ok(docType));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.patch('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateDocTypeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const docType = await docTypesService.update(id, parsed.data);
      return ok(docType);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.post('/:id/toggle-required', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const docType = await docTypesService.toggleRequired(id);
      return ok(docType);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.delete('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await docTypesService.remove(id);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });
}

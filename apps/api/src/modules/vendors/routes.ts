import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { createVendorSchema, listVendorsQuerySchema, updateVendorSchema } from './schema.js';
import * as vendorsService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function vendorsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req, reply) => {
    const parsed = listVendorsQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const vendors = await vendorsService.list(parsed.data);
    return ok(vendors);
  });

  app.post('/', { preHandler: requireRole('admin') }, async (req, reply) => {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    const vendor = await vendorsService.create(parsed.data);
    return reply.code(201).send(ok(vendor));
  });

  app.get('/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const vendor = await vendorsService.getById(id);
      return ok(vendor);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.get('/:id/pic', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const pics = await vendorsService.getPic(id);
      return ok(pics);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.get('/:id/previous-projects', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const projects = await vendorsService.getPreviousProjects(id);
      return ok(projects);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.patch('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateVendorSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const vendor = await vendorsService.update(id, parsed.data);
      return ok(vendor);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.delete('/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await vendorsService.remove(id);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });
}

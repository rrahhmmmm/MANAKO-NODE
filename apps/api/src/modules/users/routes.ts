import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './schema.js';
import * as usersService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', requireRole('admin'));

  app.get('/', async (req, reply) => {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const users = await usersService.list(parsed.data);
    return ok(users);
  });

  app.post('/', async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const user = await usersService.create(parsed.data);
      return reply.code(201).send(ok(user));
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.get('/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const user = await usersService.getById(id);
      return ok(user);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.patch('/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const user = await usersService.update(id, parsed.data);
      return ok(user);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.delete('/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await usersService.remove(id, req.user.id);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });
}

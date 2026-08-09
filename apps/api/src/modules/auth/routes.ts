import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { loginSchema, refreshSchema } from './schema.js';
import * as authService from './service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    }
    try {
      const result = await authService.login(app, parsed.data.email, parsed.data.password, {
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      });
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply
        .code(e.statusCode ?? 500)
        .send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.post('/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    }
    try {
      const result = await authService.refresh(app, parsed.data.refresh_token);
      return ok(result);
    } catch (err) {
      const e = err as { statusCode?: number; code?: string; message: string };
      return reply
        .code(e.statusCode ?? 500)
        .send(fail(e.code ?? 'INTERNAL', e.message));
    }
  });

  app.post('/logout', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await authService.logout(parsed.data.refresh_token);
    }
    return reply.send(ok({}));
  });

  app.get('/me', { preHandler: authGuard }, async (req) => {
    const user = await authService.me(req.user.id);
    return ok(user);
  });
}

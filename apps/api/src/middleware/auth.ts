import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@prisma/client';
import { fail } from '../lib/response.js';

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send(fail('UNAUTHORIZED', 'Token invalid atau expired'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.code(401).send(fail('UNAUTHORIZED', 'Belum login'));
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send(fail('FORBIDDEN', 'Role tidak memiliki akses'));
    }
  };
}

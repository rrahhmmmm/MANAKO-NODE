import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import type { AuthUser } from '../../middleware/auth.js';

const REFRESH_TTL_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string,
  meta: { ip?: string; user_agent?: string },
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password_hash || user.deleted_at) {
    throw Object.assign(new Error('Email atau password salah'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw Object.assign(new Error('Email atau password salah'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const payload: AuthUser = { id: user.id, email: user.email!, role: user.role };
  const access_token = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL });

  const refresh_token = newRefreshToken();
  const expires_at = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(refresh_token),
      expires_at,
      ip: meta.ip,
      user_agent: meta.user_agent,
    },
  });

  return {
    access_token,
    refresh_token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refresh(app: FastifyInstance, refreshToken: string) {
  const hash = hashToken(refreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { token_hash: hash }, include: { user: true } });
  if (!row || row.revoked_at || row.expires_at < new Date()) {
    throw Object.assign(new Error('Refresh token invalid'), { statusCode: 401, code: 'INVALID_REFRESH' });
  }
  // Rotate: revoke old + issue new
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revoked_at: new Date() },
  });
  const payload: AuthUser = { id: row.user.id, email: row.user.email!, role: row.user.role };
  const access_token = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL });
  const new_refresh = newRefreshToken();
  const expires_at = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      user_id: row.user_id,
      token_hash: hashToken(new_refresh),
      expires_at,
      ip: row.ip,
      user_agent: row.user_agent,
    },
  });
  return { access_token, refresh_token: new_refresh };
}

export async function logout(refreshToken: string) {
  const hash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { token_hash: hash, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

export async function me(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, created_at: true },
  });
  if (!user) {
    throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
  }
  return user;
}

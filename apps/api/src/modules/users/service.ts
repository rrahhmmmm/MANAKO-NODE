import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './schema.js';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UserSelect;

function notFound(): never {
  throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function emailTaken(): never {
  throw Object.assign(new Error('Email sudah dipakai'), { statusCode: 409, code: 'EMAIL_TAKEN' });
}

export async function list(query: ListUsersQuery) {
  return prisma.user.findMany({
    where: {
      deleted_at: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: publicSelect,
    orderBy: { id: 'asc' },
  });
}

export async function create(input: CreateUserInput) {
  const password_hash = await bcrypt.hash(input.password, 10);
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        password_hash,
      },
      select: publicSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') emailTaken();
    throw err;
  }
}

export async function getById(id: number) {
  const user = await prisma.user.findFirst({ where: { id, deleted_at: null }, select: publicSelect });
  if (!user) notFound();
  return user;
}

export async function update(id: number, input: UpdateUserInput) {
  const existing = await prisma.user.findFirst({ where: { id, deleted_at: null } });
  if (!existing) notFound();

  const data: Prisma.UserUpdateInput = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
  };
  if (input.password) data.password_hash = await bcrypt.hash(input.password, 10);

  try {
    return await prisma.user.update({ where: { id }, data, select: publicSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') emailTaken();
    throw err;
  }
}

export async function remove(id: number, actingUserId: number) {
  if (id === actingUserId) {
    throw Object.assign(new Error('Tidak bisa menghapus akun sendiri'), {
      statusCode: 400,
      code: 'SELF_DELETE',
    });
  }

  const target = await prisma.user.findFirst({ where: { id, deleted_at: null } });
  if (!target) notFound();

  if (target.role === 'admin') {
    const activeAdmins = await prisma.user.count({ where: { role: 'admin', deleted_at: null } });
    if (activeAdmins <= 1) {
      throw Object.assign(new Error('Minimal harus ada 1 admin aktif'), {
        statusCode: 409,
        code: 'LAST_ADMIN',
      });
    }
  }

  const deleted_at = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deleted_at } }),
    prisma.project.updateMany({ where: { pic_ikt_id: id }, data: { pic_ikt_id: null } }),
    prisma.project.updateMany({ where: { pic_vendor_id: id }, data: { pic_vendor_id: null } }),
    prisma.refreshToken.updateMany({
      where: { user_id: id, revoked_at: null },
      data: { revoked_at: deleted_at },
    }),
  ]);

  return { id, deleted_at };
}

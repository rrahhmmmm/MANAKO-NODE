import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreateDocTypeInput, ListDocTypesQuery, UpdateDocTypeInput } from './schema.js';

function notFound(): never {
  throw Object.assign(new Error('Doc type tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function keynameTaken(): never {
  throw Object.assign(new Error('Keyname sudah dipakai'), { statusCode: 409, code: 'KEYNAME_TAKEN' });
}

function docTypeInUse(): never {
  throw Object.assign(new Error('Doc type masih dipakai oleh dokumen yang sudah diupload'), {
    statusCode: 409,
    code: 'DOC_TYPE_IN_USE',
  });
}

export async function list(query: ListDocTypesQuery) {
  return prisma.docType.findMany({
    where: query.stage ? { stage: query.stage } : undefined,
    orderBy: [{ stage: 'asc' }, { priority: 'asc' }, { keyname: 'asc' }],
  });
}

export async function create(input: CreateDocTypeInput) {
  try {
    return await prisma.docType.create({ data: input });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') keynameTaken();
    throw err;
  }
}

export async function getById(id: number) {
  const docType = await prisma.docType.findUnique({ where: { id } });
  if (!docType) notFound();
  return docType;
}

export async function update(id: number, input: UpdateDocTypeInput) {
  const existing = await prisma.docType.findUnique({ where: { id } });
  if (!existing) notFound();

  try {
    return await prisma.docType.update({ where: { id }, data: input });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') keynameTaken();
    throw err;
  }
}

export async function toggleRequired(id: number) {
  const existing = await prisma.docType.findUnique({ where: { id } });
  if (!existing) notFound();

  return prisma.docType.update({ where: { id }, data: { required: !existing.required } });
}

export async function remove(id: number) {
  const existing = await prisma.docType.findUnique({ where: { id } });
  if (!existing) notFound();

  try {
    await prisma.docType.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') docTypeInUse();
    throw err;
  }
  return { id };
}

import { prisma } from '../../lib/prisma.js';
import type { CreateVendorInput, ListVendorsQuery, UpdateVendorInput } from './schema.js';

function notFound(): never {
  throw Object.assign(new Error('Vendor tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

export async function list(query: ListVendorsQuery) {
  return prisma.vendor.findMany({
    where: query.search ? { name: { contains: query.search, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function create(input: CreateVendorInput) {
  return prisma.vendor.create({ data: input });
}

export async function getById(id: number) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();
  return vendor;
}

export async function update(id: number, input: UpdateVendorInput) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) notFound();

  return prisma.vendor.update({ where: { id }, data: input });
}

export async function remove(id: number) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) notFound();

  await prisma.vendor.delete({ where: { id } });
  return { id };
}

export async function getPic(id: number) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) notFound();

  const rows = await prisma.project.findMany({
    where: { vendor_id: id, pic_vendor_id: { not: null } },
    distinct: ['pic_vendor_id'],
    select: {
      pic_vendor: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  return rows.map((r) => r.pic_vendor).filter((u): u is NonNullable<typeof u> => u !== null);
}

export async function getPreviousProjects(id: number) {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) notFound();

  return prisma.project.findMany({
    where: { vendor_id: id },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      value: true,
      status: true,
      contract_type: true,
      start_date: true,
      end_date: true,
    },
  });
}

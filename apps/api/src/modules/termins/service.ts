import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { deleteFile } from '../../lib/storage.js';
import type { CreateTerminInput, UpdateTerminInput } from './schema.js';

function notFound(): never {
  throw Object.assign(new Error('Termin tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function projectNotFound(): never {
  throw Object.assign(new Error('Project tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function percentageExceeded(): never {
  throw Object.assign(new Error('Total persentase termin project ini akan melebihi 100%'), {
    statusCode: 400,
    code: 'PERCENTAGE_EXCEEDED',
  });
}

function hasDocuments(): never {
  throw Object.assign(
    new Error('Termin masih memiliki dokumen yang sudah diupload. Gunakan force=true untuk menghapus paksa.'),
    { statusCode: 409, code: 'HAS_DOCUMENTS' },
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function list(projectId: number) {
  return prisma.termin.findMany({
    where: { project_id: projectId },
    orderBy: { order_index: 'asc' },
  });
}

export async function getById(id: number) {
  const termin = await prisma.termin.findUnique({ where: { id } });
  if (!termin) notFound();
  return termin;
}

export async function create(projectId: number, input: CreateTerminInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`termin_order_${projectId}`}))`;

    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) projectNotFound();

    const percentage = input.percentage ?? (input.type === 'oneoff' ? 100 : 0);

    const agg = await tx.termin.aggregate({
      where: { project_id: projectId },
      _sum: { percentage: true },
      _max: { order_index: true },
    });
    const existingSum = agg._sum.percentage ?? new Prisma.Decimal(0);
    if (existingSum.add(percentage).greaterThan(100)) percentageExceeded();

    const order_index = (agg._max.order_index ?? 0) + 1;
    const amount = new Prisma.Decimal(project.value).mul(percentage).div(100);
    const due_date = input.period_end ? addDays(input.period_end, 7) : null;
    const name = input.name ?? `Termin ${order_index}`;

    return tx.termin.create({
      data: {
        project_id: projectId,
        name,
        type: input.type,
        period_start: input.period_start,
        period_end: input.period_end,
        percentage,
        amount,
        due_date,
        order_index,
      },
    });
  });
}

export async function update(id: number, input: UpdateTerminInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.termin.findUnique({ where: { id } });
    if (!existing) notFound();

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`termin_order_${existing.project_id}`}))`;

    const percentage = input.percentage ?? existing.percentage;
    if (input.percentage !== undefined) {
      const agg = await tx.termin.aggregate({
        where: { project_id: existing.project_id, id: { not: id } },
        _sum: { percentage: true },
      });
      const othersSum = agg._sum.percentage ?? new Prisma.Decimal(0);
      if (othersSum.add(input.percentage).greaterThan(100)) percentageExceeded();
    }

    let amount = existing.amount;
    if (input.percentage !== undefined) {
      const project = await tx.project.findUnique({ where: { id: existing.project_id } });
      if (!project) projectNotFound();
      amount = new Prisma.Decimal(project.value).mul(percentage).div(100);
    }

    const period_end = input.period_end !== undefined ? input.period_end : existing.period_end;
    const due_date =
      input.period_end !== undefined ? (period_end ? addDays(period_end, 7) : null) : existing.due_date;

    return tx.termin.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.period_start !== undefined && { period_start: input.period_start }),
        ...(input.period_end !== undefined && { period_end: input.period_end }),
        ...(input.percentage !== undefined && { percentage: input.percentage }),
        amount,
        due_date,
      },
    });
  });
}

export async function remove(id: number, force: boolean) {
  const existing = await prisma.termin.findUnique({ where: { id } });
  if (!existing) notFound();

  const docs = await prisma.terminDocument.findMany({ where: { termin_id: id }, select: { file_path: true } });
  if (!force && docs.length > 0) hasDocuments();

  await prisma.termin.delete({ where: { id } });

  for (const doc of docs) {
    await deleteFile(doc.file_path);
  }

  return { id };
}

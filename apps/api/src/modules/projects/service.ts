import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from './schema.js';

type ProjectType = 'investasi' | 'eksploitasi';
type Executor = Pick<typeof prisma, '$queryRawUnsafe' | '$executeRaw'>;

function notFound(): never {
  throw Object.assign(new Error('Project tidak ditemukan'), { statusCode: 404, code: 'NOT_FOUND' });
}

function invalidReference(): never {
  throw Object.assign(new Error('Vendor/PIC/parent project yang dipilih tidak valid'), {
    statusCode: 400,
    code: 'BAD_REQUEST',
  });
}

function prefixFor(type: ProjectType) {
  return type === 'investasi' ? 'INV' : 'EKS';
}

async function nextCode(client: Executor, prefix: string, year: number) {
  const last = await client.$queryRawUnsafe<{ code: string }[]>(
    `SELECT code FROM projects
     WHERE code LIKE $1
     ORDER BY CAST(SPLIT_PART(code, '-', 3) AS INTEGER) DESC
     LIMIT 1`,
    `${prefix}-${year}-%`,
  );
  const nextNum = last.length && last[0] ? Number.parseInt(last[0].code.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${year}-${String(nextNum).padStart(2, '0')}`;
}

export async function previewCode(type: ProjectType) {
  const prefix = prefixFor(type);
  const year = new Date().getFullYear();
  const preview = await nextCode(prisma, prefix, year);
  return { preview, prefix, year };
}

async function generateProjectCode(type: ProjectType, tx: Prisma.TransactionClient) {
  const prefix = prefixFor(type);
  const year = new Date().getFullYear();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project_code_${type}_${year}`}))`;
  return nextCode(tx, prefix, year);
}

export async function list(query: ListProjectsQuery) {
  const { search, year, status, classification, page, per_page } = query;
  const where: Prisma.ProjectWhereInput = {
    ...(status ? { status } : {}),
    ...(classification ? { classification } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(year
      ? {
          start_date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        }
      : {}),
  };
  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { vendor: true },
      orderBy: { id: 'desc' },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
  ]);
  return { items, total, page, per_page };
}

export async function create(input: CreateProjectInput) {
  const { project_type, ...data } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const code = await generateProjectCode(project_type, tx);
      return tx.project.create({ data: { ...data, code } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') invalidReference();
    throw err;
  }
}

export async function getById(id: number) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { vendor: true, pic_ikt: true, pic_vendor: true, termins: { orderBy: { order_index: 'asc' } } },
  });
  if (!project) notFound();
  return project;
}

export async function update(id: number, input: UpdateProjectInput) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) notFound();

  try {
    return await prisma.project.update({ where: { id }, data: input });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') invalidReference();
    throw err;
  }
}

export async function remove(id: number) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) notFound();

  await prisma.project.delete({ where: { id } });
  return { id };
}

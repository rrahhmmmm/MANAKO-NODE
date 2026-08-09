import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../../middleware/auth.js';
import { ok, fail } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

const listQuery = z.object({
  search: z.string().optional(),
  year: z.coerce.number().int().optional(),
  status: z.enum(['inisiasi', 'running', 'completed', 'closed', 'cancelled']).optional(),
  classification: z.enum(['rutin', 'non_rutin']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

const codePreviewQuery = z.object({
  type: z.enum(['investasi', 'eksploitasi']),
});

export async function projectsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req, reply) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const { search, year, status, classification, page, per_page } = parsed.data;
    const where: import('@prisma/client').Prisma.ProjectWhereInput = {
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
    return ok({ items, total, page, per_page });
  });

  app.get('/code/preview', async (req, reply) => {
    const parsed = codePreviewQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const prefix = parsed.data.type === 'investasi' ? 'INV' : 'EKS';
    const year = new Date().getFullYear();
    const last = await prisma.$queryRawUnsafe<{ code: string }[]>(
      `SELECT code FROM projects
       WHERE code LIKE $1
       ORDER BY CAST(SPLIT_PART(code, '-', 3) AS INTEGER) DESC
       LIMIT 1`,
      `${prefix}-${year}-%`,
    );
    const nextNum = last.length && last[0]
      ? Number.parseInt(last[0].code.split('-')[2] ?? '0', 10) + 1
      : 1;
    const preview = `${prefix}-${year}-${String(nextNum).padStart(2, '0')}`;
    return ok({ preview, prefix, year });
  });

  app.get('/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const project = await prisma.project.findUnique({
      where: { id },
      include: { vendor: true, pic_ikt: true, pic_vendor: true, termins: { orderBy: { order_index: 'asc' } } },
    });
    if (!project) return reply.code(404).send(fail('NOT_FOUND', 'Project tidak ditemukan'));
    return ok(project);
  });

  // TODO: POST (dengan advisory lock), PATCH, DELETE, /:id/contract, /:id/progress
}

import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { reportQuerySchema } from './schema.js';
import * as reportsService from './service.js';
import { buildReportWorkbook } from './excel.js';

function timestampSuffix(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/years', async () => ok(await reportsService.getAvailableYears()));

  app.get('/preview', async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    const data = await reportsService.getReportData(parsed.data);
    return ok(data);
  });

  app.get('/export.xlsx', async (req, reply) => {
    const parsed = reportQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));

    const { columns, rows } = await reportsService.getReportData(parsed.data);
    const workbook = buildReportWorkbook(columns, rows, parsed.data);
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `Laporan_${parsed.data.classification}_${timestampSuffix(new Date())}.xlsx`;
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return reply.send(Buffer.from(buffer));
  });
}

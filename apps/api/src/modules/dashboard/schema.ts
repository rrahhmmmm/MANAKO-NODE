import { z } from 'zod';

export const dashboardStatsQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
});

export const dashboardRemindersQuerySchema = z.object({
  tab: z.enum(['overdue', 'pending']).default('overdue'),
  page: z.coerce.number().int().min(1).default(1),
  // max dinaikkan dari 100 -> 1000 supaya /reports/print bisa ambil semua reminders
  // per tab dalam 1 request (reuse GET /dashboard/reminders, tanpa endpoint baru).
  per_page: z.coerce.number().int().min(1).max(1000).default(20),
});

const classificationEnum = z.enum(['rutin', 'non_rutin']);

// Kirim sebagai repeated key TANPA bracket: ?classification=rutin&classification=non_rutin
// (bukan ?classification[]=... — parser querystring default Fastify tidak resolve notasi bracket ke array).
export const dashboardProjectsQuerySchema = z.object({
  tab: z.enum(['running', 'completed', 'inisiasi']).default('running'),
  search: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().optional(),
  classification: z
    .union([classificationEnum, z.array(classificationEnum)])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type DashboardStatsQuery = z.infer<typeof dashboardStatsQuerySchema>;
export type DashboardRemindersQuery = z.infer<typeof dashboardRemindersQuerySchema>;
export type DashboardProjectsQuery = z.infer<typeof dashboardProjectsQuerySchema>;

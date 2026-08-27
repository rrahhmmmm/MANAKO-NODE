import { z } from 'zod';

const classificationEnum = z.enum(['rutin', 'non_rutin']);

// Legacy FE quirk: form lama kirim 'non-rutin' (dash) sementara DB pakai 'non_rutin' (underscore).
// Normalize dulu sebelum divalidasi sebagai enum (docs/05-business-logic.md §8.1).
const classificationParam = z
  .string()
  .transform((v) => v.replace('-', '_'))
  .pipe(classificationEnum);

export const reportQuerySchema = z.object({
  year: z.coerce.number().int(),
  classification: classificationParam.default('rutin'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

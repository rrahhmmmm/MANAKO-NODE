import { z } from 'zod';
import { TerminType } from '@prisma/client';

export const createTerminSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.nativeEnum(TerminType).default('oneoff'),
    period_start: z.coerce.date().optional(),
    period_end: z.coerce.date().optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((obj) => !obj.period_start || !obj.period_end || obj.period_start <= obj.period_end, {
    message: 'Periode mulai harus sebelum atau sama dengan periode selesai',
    path: ['period_end'],
  });

export const updateTerminSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.nativeEnum(TerminType).optional(),
    period_start: z.coerce.date().nullable().optional(),
    period_end: z.coerce.date().nullable().optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' })
  .refine((obj) => !obj.period_start || !obj.period_end || obj.period_start <= obj.period_end, {
    message: 'Periode mulai harus sebelum atau sama dengan periode selesai',
    path: ['period_end'],
  });

export const deleteTerminQuerySchema = z.object({
  force: z.coerce.boolean().default(false),
});

export type CreateTerminInput = z.infer<typeof createTerminSchema>;
export type UpdateTerminInput = z.infer<typeof updateTerminSchema>;
export type DeleteTerminQuery = z.infer<typeof deleteTerminQuerySchema>;

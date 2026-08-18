import { z } from 'zod';
import { DocTypeStage } from '@prisma/client';

export const keynameSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]{1,49}$/, 'Keyname harus UPPER_SNAKE_CASE (mis. BAST, ND_PEMBAYARAN)');

export const listDocTypesQuerySchema = z.object({
  stage: z.nativeEnum(DocTypeStage).optional(),
});

export const createDocTypeSchema = z.object({
  keyname: keynameSchema,
  label: z.string().trim().min(1).max(200),
  stage: z.nativeEnum(DocTypeStage).default('pelaksanaan'),
  required: z.boolean().default(true),
  priority: z.number().int().default(0),
});

export const updateDocTypeSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    stage: z.nativeEnum(DocTypeStage).optional(),
    required: z.boolean().optional(),
    priority: z.number().int().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export type ListDocTypesQuery = z.infer<typeof listDocTypesQuerySchema>;
export type CreateDocTypeInput = z.infer<typeof createDocTypeSchema>;
export type UpdateDocTypeInput = z.infer<typeof updateDocTypeSchema>;

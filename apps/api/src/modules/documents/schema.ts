import { z } from 'zod';
import { keynameSchema } from '../masters/schema.js';

export const createRequirementSchema = z.object({
  doc_type: keynameSchema,
  label: z.string().trim().min(1).max(200).optional(),
  required: z.coerce.boolean().default(true),
});

export const updateRequirementSchema = z
  .object({
    required: z.coerce.boolean().optional(),
    bypass: z.coerce.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export const uploadTerminDocumentSchema = z.object({
  doc_type: keynameSchema,
  custom_label: z.string().trim().max(200).optional(),
});

export const updateTerminDocumentSchema = z
  .object({
    status: z.union([z.literal(0), z.literal(1)]).optional(),
    verified: z.coerce.boolean().optional(),
    custom_label: z.string().trim().max(200).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
export type UploadTerminDocumentInput = z.infer<typeof uploadTerminDocumentSchema>;
export type UpdateTerminDocumentInput = z.infer<typeof updateTerminDocumentSchema>;

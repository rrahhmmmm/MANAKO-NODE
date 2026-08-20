import { z } from 'zod';

const SINGLE_DOC_TYPES = [
  'ND_IJIN_PRINSIP',
  'KONTRAK',
  'RKS',
  'RAB',
  'HIRADC',
  'EVATEK',
  'JUSTIFIKASI',
  'TKDN',
  'BAMK',
] as const;
const MULTI_DOC_TYPES = ['PR', 'PO'] as const;

export const SINGLE_CARDINALITY_TYPES = new Set<string>(SINGLE_DOC_TYPES);

export const initDocTypeSchema = z.enum([...SINGLE_DOC_TYPES, ...MULTI_DOC_TYPES]);

// termin_ids datang dari multipart sebagai satu field text berisi JSON-stringified array
// (multipart tidak punya cara alami bawa array angka) — lihat routes.ts untuk pemakaian.
const terminIdsMultipartField = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'termin_ids harus JSON array of number' });
      return z.NEVER;
    }
    const result = z.array(z.coerce.number().int().positive()).safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: 'termin_ids harus JSON array of number' });
      return z.NEVER;
    }
    return result.data;
  });

export const uploadInitDocumentSchema = z.object({
  doc_type: initDocTypeSchema,
  no_document: z.string().trim().max(255).optional(),
  doc_name: z.string().trim().max(255).optional(),
  termin_ids: terminIdsMultipartField,
});

export const updateInitDocumentSchema = z
  .object({
    no_document: z.string().trim().max(255).nullable().optional(),
    doc_name: z.string().trim().max(255).nullable().optional(),
    termin_ids: z.array(z.coerce.number().int().positive()).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export const listPrPoQuerySchema = z.object({
  doc_type: z.enum(['PR', 'PO']),
});

export const uploadContractSchema = z.object({
  no_kontrak: z.string().trim().max(255).optional(),
});

export type InitDocType = z.infer<typeof initDocTypeSchema>;
export type UploadInitDocumentInput = z.infer<typeof uploadInitDocumentSchema>;
export type UpdateInitDocumentInput = z.infer<typeof updateInitDocumentSchema>;
export type ListPrPoQuery = z.infer<typeof listPrPoQuerySchema>;
export type UploadContractInput = z.infer<typeof uploadContractSchema>;

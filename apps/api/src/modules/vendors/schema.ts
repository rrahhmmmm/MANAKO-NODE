import { z } from 'zod';

export const listVendorsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().max(150).optional(),
  contact_phone: z.string().trim().max(30).optional(),
  contact_email: z.string().trim().email().max(150).optional(),
  npwp: z.string().trim().max(50).optional(),
});

export const updateVendorSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contact_name: z.string().trim().max(150).nullable().optional(),
    contact_phone: z.string().trim().max(30).nullable().optional(),
    contact_email: z.string().trim().email().max(150).nullable().optional(),
    npwp: z.string().trim().max(50).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

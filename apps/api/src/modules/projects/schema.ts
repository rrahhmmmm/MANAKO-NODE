import { z } from 'zod';

const projectStatusEnum = z.enum(['inisiasi', 'running', 'completed', 'closed', 'cancelled']);
const contractTypeEnum = z.enum(['new', 'renewal']);
const classificationEnum = z.enum(['rutin', 'non_rutin']);
const projectTypeEnum = z.enum(['investasi', 'eksploitasi']);

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().optional(),
  status: projectStatusEnum.optional(),
  classification: classificationEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const codePreviewQuerySchema = z.object({
  type: projectTypeEnum,
});

export const createProjectSchema = z
  .object({
    project_type: projectTypeEnum,
    name: z.string().trim().min(1, 'Nama wajib diisi').max(255),
    vendor_id: z.coerce.number().int().positive().optional(),
    pic_ikt_id: z.coerce.number().int().positive().optional(),
    pic_vendor_id: z.coerce.number().int().positive().optional(),
    value: z.coerce.number().min(0).default(0),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    description: z.string().trim().max(5000).optional(),
    status: projectStatusEnum.default('inisiasi'),
    contract_type: contractTypeEnum.default('new'),
    parent_project_id: z.coerce.number().int().positive().optional(),
    classification: classificationEnum.default('rutin'),
    no_kontrak: z.string().trim().max(255).optional(),
  })
  .refine((obj) => !obj.start_date || !obj.end_date || obj.start_date <= obj.end_date, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai',
    path: ['end_date'],
  });

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi').max(255).optional(),
    vendor_id: z.coerce.number().int().positive().nullable().optional(),
    pic_ikt_id: z.coerce.number().int().positive().nullable().optional(),
    pic_vendor_id: z.coerce.number().int().positive().nullable().optional(),
    value: z.coerce.number().min(0).optional(),
    start_date: z.coerce.date().nullable().optional(),
    end_date: z.coerce.date().nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: projectStatusEnum.optional(),
    contract_type: contractTypeEnum.optional(),
    parent_project_id: z.coerce.number().int().positive().nullable().optional(),
    classification: classificationEnum.optional(),
    no_kontrak: z.string().trim().max(255).nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' })
  .refine((obj) => !obj.start_date || !obj.end_date || obj.start_date <= obj.end_date, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai',
    path: ['end_date'],
  });

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CodePreviewQuery = z.infer<typeof codePreviewQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

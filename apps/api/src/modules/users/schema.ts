import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().trim().min(1).optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().max(30).optional(),
  role: z.nativeEnum(UserRole).default('viewer'),
  password: z.string().min(8).max(72),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    email: z.string().trim().email().max(150).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    role: z.nativeEnum(UserRole).optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Tidak ada field yang diubah' });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

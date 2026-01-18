import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres'),
  email: z.string().email('Email inválido'),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

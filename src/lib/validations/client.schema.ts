import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

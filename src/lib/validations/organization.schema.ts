import { z } from 'zod';

export const organizationSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  slug: z
    .string()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .max(50, 'El slug no puede exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  logo_url: z.string().url().optional().nullable(),
  logo_background_color: z.enum(['white', 'black']),
  domain: z.string().url().optional().nullable(),
});

export const createOrganizationSchema = organizationSchema.omit({ domain: true });

export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

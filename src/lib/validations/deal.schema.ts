import { z } from 'zod';

export const dealStageSchema = z.enum([
  'prospect',
  'qualified',
  'contacted',
  'meeting',
  'negotiation',
  'won',
  'lost',
]);

export const dealSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  value: z.number().min(0, 'El valor debe ser positivo'),
  currency: z.enum(['GTQ', 'USD']),
  stage: dealStageSchema,
  priority: z.enum(['low', 'medium', 'high']),
  expected_close_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
});

export type DealFormData = z.infer<typeof dealSchema>;

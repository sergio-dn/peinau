import { z } from 'zod';

const bankFormatSchema = z.enum(['bci_tef', 'santander']);

export const createPaymentBatchSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid())
    .min(1, 'Debe incluir al menos una factura'),
  bankFormat: bankFormatSchema,
  name: z.string().min(1, 'Nombre es requerido').max(200),
});

export type CreatePaymentBatchSchema = z.infer<typeof createPaymentBatchSchema>;

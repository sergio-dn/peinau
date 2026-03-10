import { z } from 'zod';
import { InvoiceState, DteType } from '../types/invoice.js';

const invoiceStateValues = Object.values(InvoiceState) as [string, ...string[]];
const dteTypeValues = Object.values(DteType) as [number, ...number[]];

export const invoiceFilterSchema = z.object({
  companyId: z.string().uuid().optional(),
  state: z.enum(invoiceStateValues).optional(),
  tipoDte: z.union(dteTypeValues.map((v) => z.literal(v)) as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]).optional(),
  rutEmisor: z.string().optional(),
  folioFrom: z.number().int().positive().optional(),
  folioTo: z.number().int().positive().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  montoMinimo: z.number().int().nonnegative().optional(),
  montoMaximo: z.number().int().nonnegative().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;

export const updateInvoiceLineAccountingSchema = z.object({
  accountId: z.string().uuid().nullable(),
  costCenterId: z.string().uuid().nullable(),
});

export type UpdateInvoiceLineAccounting = z.infer<typeof updateInvoiceLineAccountingSchema>;

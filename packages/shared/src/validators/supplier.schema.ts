import { z } from 'zod';
import { validateRut } from '../utils/rut.js';

const rutSchema = z
  .string()
  .min(1, 'RUT es requerido')
  .refine((val) => validateRut(val), { message: 'RUT inválido' });

const tipoCuentaSchema = z.enum(['corriente', 'vista', 'ahorro']);

export const createSupplierSchema = z.object({
  companyId: z.string().uuid(),
  rut: rutSchema,
  razonSocial: z.string().min(1, 'Razón social es requerida').max(200),
  giro: z.string().max(200).nullable().optional(),
  direccion: z.string().max(300).nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  banco: z.string().max(100).nullable().optional(),
  tipoCuenta: tipoCuentaSchema.nullable().optional(),
  numeroCuenta: z.string().max(30).nullable().optional(),
  autoCreated: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateSupplierSchema = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  rut: rutSchema.optional(),
  razonSocial: z.string().min(1).max(200).optional(),
  giro: z.string().max(200).nullable().optional(),
  direccion: z.string().max(300).nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  banco: z.string().max(100).nullable().optional(),
  tipoCuenta: tipoCuentaSchema.nullable().optional(),
  numeroCuenta: z.string().max(30).nullable().optional(),
  autoCreated: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSupplierSchema = z.infer<typeof updateSupplierSchema>;

import { Request, Response } from 'express';
import { z } from 'zod';
import { supplierService } from './supplier.service.js';

const listFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSupplierSchema = z.object({
  rut: z.string().min(1),
  razonSocial: z.string().min(1),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  banco: z.string().optional(),
  tipoCuenta: z.string().optional(),
  numeroCuenta: z.string().optional(),
});

const updateSupplierSchema = z.object({
  razonSocial: z.string().min(1).optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  banco: z.string().optional(),
  tipoCuenta: z.string().optional(),
  numeroCuenta: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class SupplierController {
  async list(req: Request, res: Response) {
    const filters = listFiltersSchema.parse(req.query);
    const result = await supplierService.list(req.user!.companyId, filters);
    res.json(result);
  }

  async getById(req: Request, res: Response) {
    const supplier = await supplierService.getById(req.params.id);
    res.json(supplier);
  }

  async create(req: Request, res: Response) {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await supplierService.create(req.user!.companyId, data);
    res.status(201).json(supplier);
  }

  async update(req: Request, res: Response) {
    const data = updateSupplierSchema.parse(req.body);
    const supplier = await supplierService.update(req.params.id, data);
    res.json(supplier);
  }

  async importCsv(req: Request, res: Response) {
    const { csvContent } = z.object({ csvContent: z.string().min(1) }).parse(req.body);
    const result = await supplierService.importCsv(req.user!.companyId, csvContent);
    res.json(result);
  }
}

export const supplierController = new SupplierController();

import { Request, Response } from 'express';
import { z } from 'zod';
import { invoiceService } from './invoice.service.js';

const listFiltersSchema = z.object({
  state: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const updateAccountingSchema = z.object({
  accountId: z.string().uuid().nullable(),
  costCenterId: z.string().uuid().nullable(),
});

export class InvoiceController {
  async list(req: Request, res: Response) {
    const filters = listFiltersSchema.parse(req.query);
    const result = await invoiceService.list(req.user!.companyId, filters);
    res.json(result);
  }

  async getById(req: Request, res: Response) {
    const invoice = await invoiceService.getById(req.params.id);
    res.json(invoice);
  }

  async getHistory(req: Request, res: Response) {
    const history = await invoiceService.getHistory(req.params.id);
    res.json(history);
  }

  async updateLineAccounting(req: Request, res: Response) {
    const { accountId, costCenterId } = updateAccountingSchema.parse(req.body);
    const line = await invoiceService.updateLineAccounting(req.params.lineId, accountId, costCenterId);
    res.json(line);
  }

  async contabilizar(req: Request, res: Response) {
    await invoiceService.contabilizar(req.params.id, req.user!.userId);
    res.json({ message: 'Invoice contabilizada successfully' });
  }

  async reject(req: Request, res: Response) {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    await invoiceService.transition(req.params.id, 'rechazada', req.user!.userId, reason);
    res.json({ message: 'Invoice rejected' });
  }
}

export const invoiceController = new InvoiceController();

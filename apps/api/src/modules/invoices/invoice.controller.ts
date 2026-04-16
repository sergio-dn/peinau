import { Request, Response } from 'express';
import { z } from 'zod';
import { invoiceService } from './invoice.service.js';

const listFiltersSchema = z.object({
  state: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  search: z.string().optional(),
  tipoDte: z.coerce.number().int().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const updateAccountingSchema = z.object({
  accountId: z.string().uuid().nullable(),
  costCenterId: z.string().uuid().nullable(),
});

export class InvoiceController {
  async list(req: Request, res: Response) {
    const { tipoDte, ...filters } = listFiltersSchema.parse(req.query);
    const result = await invoiceService.list(req.user!.companyId, { ...filters, tipoDte });
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
  async updateNotes(req: Request, res: Response) {
    const { notes } = z.object({ notes: z.string() }).parse(req.body);
    const invoice = await invoiceService.updateNotes(req.params.id, notes);
    res.json(invoice);
  }

  async getTags(req: Request, res: Response) {
    const tags = await invoiceService.getTags(req.params.id);
    res.json(tags);
  }

  async addTag(req: Request, res: Response) {
    const { tag } = z.object({ tag: z.string().min(1).max(100) }).parse(req.body);
    const created = await invoiceService.addTag(req.params.id, tag, req.user!.userId);
    res.status(201).json(created);
  }

  async removeTag(req: Request, res: Response) {
    await invoiceService.removeTag(req.params.tagId);
    res.json({ message: 'Tag removed' });
  }

  async getAssignments(req: Request, res: Response) {
    const assignments = await invoiceService.getAssignments(req.params.id);
    res.json(assignments);
  }

  async assignUser(req: Request, res: Response) {
    const { userId, role } = z.object({
      userId: z.string().uuid(),
      role: z.enum(['reviewer', 'approver', 'accountant']),
    }).parse(req.body);
    const created = await invoiceService.assignUser(req.params.id, userId, role, req.user!.userId);
    res.status(201).json(created);
  }

  async removeAssignment(req: Request, res: Response) {
    await invoiceService.removeAssignment(req.params.assignmentId);
    res.json({ message: 'Assignment removed' });
  }

  async listUsers(req: Request, res: Response) {
    const users = await invoiceService.listCompanyUsers(req.user!.companyId);
    res.json(users);
  }
}

export const invoiceController = new InvoiceController();

import { Request, Response } from 'express';
import { z } from 'zod';
import { approvalService } from './approval.service.js';

const approveSchema = z.object({
  comment: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

const returnSchema = z.object({
  comment: z.string().min(1),
});

export class ApprovalController {
  async startApproval(req: Request, res: Response) {
    await approvalService.startApproval(req.params.invoiceId, req.user!.userId);
    res.json({ message: 'Approval process started' });
  }

  async approve(req: Request, res: Response) {
    const { comment } = approveSchema.parse(req.body);
    await approvalService.approve(req.params.invoiceId, req.user!.userId, comment);
    res.json({ message: 'Invoice approved at current level' });
  }

  async reject(req: Request, res: Response) {
    const { reason } = rejectSchema.parse(req.body);
    await approvalService.reject(req.params.invoiceId, req.user!.userId, reason);
    res.json({ message: 'Invoice rejected' });
  }

  async returnToPrevious(req: Request, res: Response) {
    const { comment } = returnSchema.parse(req.body);
    await approvalService.returnToPrevious(req.params.invoiceId, req.user!.userId, comment);
    res.json({ message: 'Invoice returned to previous level' });
  }

  async getPending(req: Request, res: Response) {
    const invoices = await approvalService.getPendingForUser(req.user!.userId);
    res.json(invoices);
  }
}

export const approvalController = new ApprovalController();

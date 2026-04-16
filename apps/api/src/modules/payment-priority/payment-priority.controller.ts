import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentPriorityService } from './payment-priority.service.js';

const assignWeekSchema = z.object({
  weekDate: z.string().nullable(),
});

export class PaymentPriorityController {
  async getInvoices(req: Request, res: Response) {
    const invoices = await paymentPriorityService.getPendingInvoices(req.user!.companyId);
    res.json(invoices);
  }

  async assignWeek(req: Request, res: Response) {
    const { weekDate } = assignWeekSchema.parse(req.body);
    const result = await paymentPriorityService.assignWeek(req.params.id, weekDate);
    if (!result.length) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(result[0]);
  }
}

export const paymentPriorityController = new PaymentPriorityController();

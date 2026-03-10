import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentBatchService } from './payment-batch.service.js';

const createBatchSchema = z.object({
  name: z.string().min(1),
  bankFormat: z.string().min(1),
  invoiceIds: z.array(z.string().uuid()).min(1),
});

export class PaymentBatchController {
  async list(req: Request, res: Response) {
    const batches = await paymentBatchService.list(req.user!.companyId);
    res.json(batches);
  }

  async getById(req: Request, res: Response) {
    const batch = await paymentBatchService.getById(req.params.id);
    res.json(batch);
  }

  async create(req: Request, res: Response) {
    const data = createBatchSchema.parse(req.body);
    const batch = await paymentBatchService.create(req.user!.companyId, req.user!.userId, data);
    res.status(201).json(batch);
  }

  async approve(req: Request, res: Response) {
    const batch = await paymentBatchService.approve(req.params.id, req.user!.userId);
    res.json({ message: 'Batch approved', batch });
  }

  async markSent(req: Request, res: Response) {
    await paymentBatchService.markSent(req.params.id);
    res.json({ message: 'Batch marked as sent' });
  }

  async markProcessed(req: Request, res: Response) {
    await paymentBatchService.markProcessed(req.params.id);
    res.json({ message: 'Batch marked as processed' });
  }

  async generateFile(req: Request, res: Response) {
    const fileContent = await paymentBatchService.generateFile(req.params.id);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="payment-batch-${req.params.id}.txt"`);
    res.send(fileContent);
  }
}

export const paymentBatchController = new PaymentBatchController();

import type { Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { env } from '../../config/env.js';

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

export async function handleInvoiceNotification(req: Request, res: Response) {
  if (env.NODE_ENV === 'production') {
    try {
      const isValid = await receiver.verify({
        signature: req.headers['upstash-signature'] as string,
        body: JSON.stringify(req.body),
      });
      if (!isValid) return res.status(401).json({ error: 'Invalid signature' });
    } catch {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  }

  const { invoiceId, event, recipientIds } = req.body;

  // TODO: send email/slack notifications (Fase 2)
  console.log(`[Invoice Notification] Event: ${event}, Invoice: ${invoiceId}`);

  return res.json({ success: true, event, invoiceId });
}

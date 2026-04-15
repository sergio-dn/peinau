import type { Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { env } from '../../config/env.js';
import { db } from '../../config/database.js';

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

export async function handleRejectionAlerts(req: Request, res: Response) {
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

  try {
    // Find invoices where sii_rejection_deadline is within 24h and not yet rejected/accepted
    // TODO: implement notification logic (Fase 2)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(`[Rejection Alerts] Checking invoices with deadline before ${tomorrow.toISOString()}`);

    // Placeholder — actual query in Fase 2
    return res.json({ success: true, alertsSent: 0 });
  } catch (err: any) {
    console.error('[Rejection Alerts] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

import type { Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { env } from '../../config/env.js';
import { siiApiClient } from '../../lib/sii-api-client.js';
import { db } from '../../config/database.js';
import { companies, invoices } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

export async function handleSiiSync(req: Request, res: Response) {
  // Verify QStash signature in production
  if (env.NODE_ENV === 'production') {
    try {
      const isValid = await receiver.verify({
        signature: req.headers['upstash-signature'] as string,
        body: JSON.stringify(req.body),
      });
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid QStash signature' });
      }
    } catch {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  }

  const { companyId, period } = req.body as { companyId: string; period: string };

  if (!companyId || !period) {
    return res.status(400).json({ error: 'Missing companyId or period' });
  }

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Use company RUT for SII API
    const rut = (company as any).rut ?? (company as any).taxId;
    if (!rut) {
      return res.status(400).json({ error: 'Company has no RUT configured' });
    }

    console.log(`[SII Sync] Starting sync for company ${companyId}, period ${period}`);
    const result = await siiApiClient.syncInvoices(rut, period);

    // TODO: upsert invoices into DB (Fase 1)
    console.log(`[SII Sync] Fetched ${result.invoices?.length ?? 0} invoices`);

    return res.json({
      success: true,
      companyId,
      period,
      count: result.invoices?.length ?? 0
    });
  } catch (err: any) {
    console.error('[SII Sync] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

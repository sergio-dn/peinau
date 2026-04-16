/**
 * Global invoice search module.
 *
 * NOTE: This module needs to be registered in invoice.routes.ts (owned by another agent).
 * Suggested route: GET /api/invoices/search?q=<term>&limit=5
 *
 * Example registration:
 *   import { searchInvoices } from './invoice.search.js';
 *   router.get('/search', authenticateToken, async (req, res, next) => {
 *     try {
 *       const { q = '', limit = '5' } = req.query as Record<string, string>;
 *       const results = await searchInvoices(req.user!.companyId, q, Number(limit));
 *       res.json(results);
 *     } catch (err) { next(err); }
 *   });
 */

import { db } from '../../config/database.js';
import { invoices } from '../../db/schema.js';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

export async function searchInvoices(companyId: string, term: string, limit = 5) {
  const isNumeric = /^\d+$/.test(term.trim());

  const conditions: ReturnType<typeof eq>[] = [eq(invoices.companyId, companyId)];

  if (isNumeric) {
    conditions.push(
      or(
        sql`${invoices.folio}::text = ${term}`,
        ilike(invoices.rutEmisor, `%${term}%`),
      )!,
    );
  } else {
    conditions.push(
      or(
        ilike(invoices.razonSocialEmisor, `%${term}%`),
        ilike(invoices.rutEmisor, `%${term}%`),
      )!,
    );
  }

  return db
    .select({
      id: invoices.id,
      tipoDte: invoices.tipoDte,
      folio: invoices.folio,
      razonSocialEmisor: invoices.razonSocialEmisor,
      montoTotal: invoices.montoTotal,
      state: invoices.state,
      fechaEmision: invoices.fechaEmision,
    })
    .from(invoices)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(invoices.fechaEmision);
}

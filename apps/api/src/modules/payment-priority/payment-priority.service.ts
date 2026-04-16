import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { invoices } from '../../db/schema.js';

export class PaymentPriorityService {
  async getPendingInvoices(companyId: string) {
    // Facturas con state = 'aprobada', ordenadas por fechaEmision ASC
    return db.select({
      id: invoices.id,
      tipoDte: invoices.tipoDte,
      folio: invoices.folio,
      razonSocialEmisor: invoices.razonSocialEmisor,
      montoTotal: invoices.montoTotal,
      fechaEmision: invoices.fechaEmision,
      paymentWeek: invoices.paymentWeek,
    }).from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.state, 'aprobada')))
      .orderBy(invoices.fechaEmision);
  }

  async assignWeek(invoiceId: string, weekDate: string | null) {
    return db.update(invoices)
      .set({ paymentWeek: weekDate, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();
  }
}

export const paymentPriorityService = new PaymentPriorityService();

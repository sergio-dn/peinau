import { eq, and, desc, sql, between, ilike } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { invoices, invoiceLines, invoiceStateHistory, suppliers } from '../../db/schema.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  recibida: ['pendiente', 'rechazada'],
  pendiente: ['aprobada', 'rechazada'],
  aprobada: ['contabilizada', 'rechazada'],
  contabilizada: ['en_nomina'],
  en_nomina: ['pagada', 'contabilizada'],
};

export class InvoiceService {
  async list(companyId: string, filters: {
    state?: string;
    supplierId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(invoices.companyId, companyId)];

    if (filters.state) {
      conditions.push(eq(invoices.state, filters.state as any));
    }
    if (filters.supplierId) {
      conditions.push(eq(invoices.supplierId, filters.supplierId));
    }
    if (filters.fechaDesde && filters.fechaHasta) {
      conditions.push(between(invoices.fechaEmision, filters.fechaDesde, filters.fechaHasta));
    }
    if (filters.search) {
      conditions.push(ilike(invoices.razonSocialEmisor, `%${filters.search}%`));
    }

    const [data, countResult] = await Promise.all([
      db.select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.fechaEmision))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(and(...conditions)),
    ]);

    return {
      data,
      total: Number(countResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    };
  }

  async getById(id: string) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        lines: {
          with: {
            account: true,
            costCenter: true,
          },
        },
        supplier: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { status: 404 });
    }

    return invoice;
  }

  async getHistory(invoiceId: string) {
    return db.select()
      .from(invoiceStateHistory)
      .where(eq(invoiceStateHistory.invoiceId, invoiceId))
      .orderBy(desc(invoiceStateHistory.createdAt));
  }

  async transition(invoiceId: string, toState: string, userId?: string, reason?: string) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { status: 404 });
    }

    const allowedStates = VALID_TRANSITIONS[invoice.state] || [];
    if (!allowedStates.includes(toState)) {
      throw Object.assign(
        new Error(`Cannot transition from ${invoice.state} to ${toState}`),
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.update(invoices)
        .set({ state: toState as any, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));

      await tx.insert(invoiceStateHistory).values({
        invoiceId,
        fromState: invoice.state,
        toState: toState as any,
        changedBy: userId || null,
        reason: reason || null,
      });
    });
  }

  async updateLineAccounting(lineId: string, accountId: string | null, costCenterId: string | null) {
    const [updated] = await db.update(invoiceLines)
      .set({ accountId, costCenterId })
      .where(eq(invoiceLines.id, lineId))
      .returning();

    if (!updated) {
      throw Object.assign(new Error('Invoice line not found'), { status: 404 });
    }

    return updated;
  }

  async contabilizar(invoiceId: string, userId: string) {
    // Check all lines have account and cost center assigned
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: { lines: true },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { status: 404 });
    }

    const unassignedLines = invoice.lines.filter(
      (l: any) => !l.accountId || !l.costCenterId
    );

    if (unassignedLines.length > 0) {
      throw Object.assign(
        new Error(`${unassignedLines.length} lines missing account or cost center assignment`),
        { status: 400 }
      );
    }

    await this.transition(invoiceId, 'contabilizada', userId);
  }

  async upsertFromSii(companyId: string, data: {
    tipoDte: number;
    folio: number;
    fechaEmision: string;
    fechaRecepcionSii?: Date;
    rutEmisor: string;
    razonSocialEmisor: string;
    montoExento: number;
    montoNeto: number;
    montoIva: number;
    tasaIva: number;
    montoTotal: number;
    dteXml?: string;
    lines?: Array<{
      lineNumber: number;
      nombreItem: string;
      descripcion?: string;
      cantidad?: number;
      unidadMedida?: string;
      precioUnitario?: number;
      descuentoPct?: number;
      montoItem: number;
      indicadorExencion?: number;
    }>;
  }) {
    // Check if invoice already exists
    const existing = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.companyId, companyId),
        eq(invoices.tipoDte, data.tipoDte),
        eq(invoices.folio, data.folio),
        eq(invoices.rutEmisor, data.rutEmisor),
      ),
    });

    if (existing) {
      return { invoice: existing, isNew: false };
    }

    // Find or create supplier
    let supplier = await db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.companyId, companyId),
        eq(suppliers.rut, data.rutEmisor),
      ),
    });

    if (!supplier) {
      const [newSupplier] = await db.insert(suppliers).values({
        companyId,
        rut: data.rutEmisor,
        razonSocial: data.razonSocialEmisor,
        autoCreated: true,
      }).returning();
      supplier = newSupplier;
    }

    // Create invoice with lines in a transaction
    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(invoices).values({
        companyId,
        supplierId: supplier!.id,
        tipoDte: data.tipoDte,
        folio: data.folio,
        fechaEmision: data.fechaEmision,
        fechaRecepcionSii: data.fechaRecepcionSii || new Date(),
        rutEmisor: data.rutEmisor,
        razonSocialEmisor: data.razonSocialEmisor,
        montoExento: Number(data.montoExento),
        montoNeto: Number(data.montoNeto),
        montoIva: Number(data.montoIva),
        tasaIva: String(data.tasaIva),
        montoTotal: Number(data.montoTotal),
        state: 'recibida',
        dteXml: data.dteXml || null,
      }).returning();

      // Insert lines
      if (data.lines && data.lines.length > 0) {
        await tx.insert(invoiceLines).values(
          data.lines.map(line => ({
            invoiceId: invoice.id,
            lineNumber: line.lineNumber,
            nombreItem: line.nombreItem,
            descripcion: line.descripcion || null,
            cantidad: line.cantidad ? String(line.cantidad) : null,
            unidadMedida: line.unidadMedida || null,
            precioUnitario: line.precioUnitario ? Number(line.precioUnitario) : null,
            descuentoPct: line.descuentoPct ? String(line.descuentoPct) : '0',
            montoItem: Number(line.montoItem),
            indicadorExencion: line.indicadorExencion || null,
          }))
        );
      }

      // Record initial state
      await tx.insert(invoiceStateHistory).values({
        invoiceId: invoice.id,
        fromState: null,
        toState: 'recibida',
        changedBy: null,
        reason: 'Imported from SII',
      });

      return invoice;
    });

    return { invoice: result, isNew: true };
  }
}

export const invoiceService = new InvoiceService();

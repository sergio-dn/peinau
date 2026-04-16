import { eq, and, desc, sql, between, ilike } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { invoices, invoiceLines, invoiceStateHistory, suppliers, invoiceTags, invoiceAssignments, users, userRoles, costCenters, chartOfAccounts } from '../../db/schema.js';

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
    tipoDte?: number;
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
    if (filters.tipoDte) {
      conditions.push(eq(invoices.tipoDte, filters.tipoDte));
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

  async updateNotes(invoiceId: string, notes: string) {
    const [updated] = await db.update(invoices)
      .set({ notes, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();
    if (!updated) throw Object.assign(new Error('Invoice not found'), { status: 404 });
    return updated;
  }

  async getTags(invoiceId: string) {
    return db.select().from(invoiceTags).where(eq(invoiceTags.invoiceId, invoiceId));
  }

  async addTag(invoiceId: string, tag: string, userId: string) {
    const [created] = await db.insert(invoiceTags).values({
      invoiceId, tag, createdBy: userId,
    }).returning();
    return created;
  }

  async removeTag(tagId: string) {
    await db.delete(invoiceTags).where(eq(invoiceTags.id, tagId));
  }

  async getAssignments(invoiceId: string) {
    return db.select({
      id: invoiceAssignments.id,
      invoiceId: invoiceAssignments.invoiceId,
      userId: invoiceAssignments.userId,
      role: invoiceAssignments.role,
      createdAt: invoiceAssignments.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(invoiceAssignments)
    .innerJoin(users, eq(invoiceAssignments.userId, users.id))
    .where(eq(invoiceAssignments.invoiceId, invoiceId));
  }

  async assignUser(invoiceId: string, userId: string, role: string, assignedBy: string) {
    const [created] = await db.insert(invoiceAssignments).values({
      invoiceId, userId, role, assignedBy,
    }).returning();
    return created;
  }

  async removeAssignment(assignmentId: string) {
    await db.delete(invoiceAssignments).where(eq(invoiceAssignments.id, assignmentId));
  }

  async listCompanyUsers(companyId: string) {
    const userList = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(and(eq(users.companyId, companyId), eq(users.isActive, true)));

    // Get roles for each user
    const result = [];
    for (const u of userList) {
      const roles = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, u.id));
      result.push({ ...u, roles: roles.map(r => r.role) });
    }
    return result;
  }

  async categorize(invoiceId: string, data: {
    costCenterId?: string | null;
    accountCode?: string | null;
    businessUnit?: string | null;
  }) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: { lines: true },
    });
    if (!invoice) throw Object.assign(new Error('Not found'), { status: 404 });

    // Resolve accountId from accountCode if provided
    let accountId: string | null = null;
    if (data.accountCode) {
      const account = await db.query.chartOfAccounts.findFirst({
        where: and(
          eq(chartOfAccounts.companyId, invoice.companyId),
          eq(chartOfAccounts.code, data.accountCode),
        ),
      });
      accountId = account?.id ?? null;
    }

    // Update businessUnit on invoice if provided
    if (data.businessUnit !== undefined) {
      await db.update(invoices)
        .set({ businessUnit: data.businessUnit ?? null, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    }

    if (invoice.lines.length > 0) {
      await db.update(invoiceLines)
        .set({
          costCenterId: data.costCenterId ?? null,
          ...(accountId !== null ? { accountId } : {}),
        })
        .where(eq(invoiceLines.id, (invoice.lines as any[])[0].id));
    } else {
      await db.insert(invoiceLines).values({
        invoiceId,
        lineNumber: 1,
        nombreItem: 'Imputación manual',
        montoItem: Number(invoice.montoNeto),
        costCenterId: data.costCenterId ?? null,
        ...(accountId !== null ? { accountId } : {}),
      });
    }

    return { success: true };
  }

  async split(invoiceId: string, lines: Array<{ costCenterId: string; accountCode: string; monto: number }>) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { status: 404 });
    }

    // Validate that sum of monto equals montoNeto (±1 peso tolerance)
    const totalMonto = lines.reduce((sum, l) => sum + l.monto, 0);
    if (Math.abs(totalMonto - Number(invoice.montoNeto)) > 1) {
      throw Object.assign(
        new Error(`La suma de los montos (${totalMonto}) no coincide con el monto neto de la factura (${invoice.montoNeto})`),
        { status: 400 }
      );
    }

    // Resolve accountIds from accountCodes
    const resolvedLines = await Promise.all(
      lines.map(async (line, index) => {
        let accountId: string | null = null;
        if (line.accountCode) {
          const account = await db.query.chartOfAccounts.findFirst({
            where: and(
              eq(chartOfAccounts.companyId, invoice.companyId),
              eq(chartOfAccounts.code, line.accountCode),
            ),
          });
          accountId = account?.id ?? null;
        }
        return {
          lineNumber: index + 1,
          costCenterId: line.costCenterId || null,
          accountId,
          montoItem: line.monto,
          nombreItem: `Distribución de costos ${index + 1}`,
        };
      })
    );

    // Perform the split in a transaction
    await db.transaction(async (tx) => {
      // Delete existing lines
      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));

      // Insert new lines
      await tx.insert(invoiceLines).values(
        resolvedLines.map((line) => ({
          invoiceId,
          lineNumber: line.lineNumber,
          nombreItem: line.nombreItem,
          montoItem: line.montoItem,
          costCenterId: line.costCenterId,
          accountId: line.accountId,
        }))
      );

      // Update invoice with the costCenterId of the first line
      await tx.update(invoices)
        .set({ costCenterId: resolvedLines[0].costCenterId, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    });

    // Return the updated invoice with lines
    return this.getById(invoiceId);
  }

  async getCostCenters(companyId: string) {
    return db.select().from(costCenters).where(eq(costCenters.companyId, companyId));
  }

  async getAccounts(companyId: string) {
    return db.select().from(chartOfAccounts).where(eq(chartOfAccounts.companyId, companyId));
  }
}

export const invoiceService = new InvoiceService();

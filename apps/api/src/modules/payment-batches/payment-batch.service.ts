import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { paymentBatches, paymentBatchItems, invoices, suppliers } from '../../db/schema.js';
import { invoiceService } from '../invoices/invoice.service.js';

const HONORARIOS_RETENCION_RATE = 0.1375; // 13.75% for 2024

export class PaymentBatchService {
  async list(companyId: string) {
    return db.select()
      .from(paymentBatches)
      .where(eq(paymentBatches.companyId, companyId))
      .orderBy(paymentBatches.createdAt);
  }

  async getById(id: string) {
    const batch = await db.query.paymentBatches.findFirst({
      where: eq(paymentBatches.id, id),
      with: {
        items: {
          with: {
            invoice: true,
            supplier: true,
          },
        },
      },
    });
    if (!batch) throw Object.assign(new Error('Payment batch not found'), { status: 404 });
    return batch;
  }

  async create(companyId: string, userId: string, data: {
    name: string;
    bankFormat: string;
    invoiceIds: string[];
  }) {
    // Validate all invoices are contabilizada
    const invoiceList = await db.select()
      .from(invoices)
      .where(and(
        inArray(invoices.id, data.invoiceIds),
        eq(invoices.state, 'contabilizada'),
      ));

    if (invoiceList.length !== data.invoiceIds.length) {
      throw Object.assign(
        new Error('Some invoices are not in "contabilizada" state'),
        { status: 400 }
      );
    }

    return db.transaction(async (tx) => {
      let totalAmount = 0;

      const items = [];
      for (const inv of invoiceList) {
        const amount = inv.montoTotal;
        let retencion = 0;

        // Calculate withholding for boletas de honorarios
        if (inv.tipoDte === 71) {
          retencion = Math.round(Number(amount) * HONORARIOS_RETENCION_RATE);
        }

        const amountNet = amount - retencion;
        totalAmount += amountNet;

        items.push({
          invoiceId: inv.id,
          supplierId: inv.supplierId!,
          amount,
          retencionHonorarios: retencion,
          amountNet,
        });
      }

      const [batch] = await tx.insert(paymentBatches).values({
        companyId,
        name: data.name,
        state: 'borrador',
        bankFormat: data.bankFormat,
        totalAmount,
        totalItems: items.length,
        createdBy: userId,
      }).returning();

      await tx.insert(paymentBatchItems).values(
        items.map(item => ({ ...item, batchId: batch.id }))
      );

      return batch;
    });
  }

  async approve(batchId: string, userId: string) {
    const [updated] = await db.update(paymentBatches)
      .set({ state: 'aprobada', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(paymentBatches.id, batchId), eq(paymentBatches.state, 'borrador')))
      .returning();

    if (!updated) throw Object.assign(new Error('Batch not found or not in draft state'), { status: 400 });
    return updated;
  }

  async markSent(batchId: string) {
    const batch = await this.getById(batchId);
    if (batch.state !== 'aprobada') {
      throw Object.assign(new Error('Batch must be approved before marking as sent'), { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.update(paymentBatches)
        .set({ state: 'enviada', updatedAt: new Date() })
        .where(eq(paymentBatches.id, batchId));

      // Transition all invoices to en_nomina
      for (const item of batch.items) {
        await invoiceService.transition(item.invoiceId, 'en_nomina');
      }
    });
  }

  async markProcessed(batchId: string) {
    const batch = await this.getById(batchId);
    if (batch.state !== 'enviada') {
      throw Object.assign(new Error('Batch must be sent before marking as processed'), { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.update(paymentBatches)
        .set({ state: 'procesada', updatedAt: new Date() })
        .where(eq(paymentBatches.id, batchId));

      // Transition all invoices to pagada
      for (const item of batch.items) {
        await invoiceService.transition(item.invoiceId, 'pagada');
      }
    });
  }

  async generateFile(batchId: string) {
    const batch = await this.getById(batchId);

    // Get supplier bank details for each item
    const itemsWithSupplier = batch.items.map((item: any) => ({
      ...item,
      supplier: item.supplier,
    }));

    // Import the appropriate bank format generator
    let fileContent: string;
    if (batch.bankFormat === 'bci_tef') {
      const { generateBciTef } = await import('@wildlama/bank-formats');
      fileContent = generateBciTef(itemsWithSupplier.map((item: any) => ({
        rutBeneficiario: item.supplier.rut,
        nombreBeneficiario: item.supplier.razonSocial,
        bancoDestino: item.supplier.banco || '',
        tipoCuenta: item.supplier.tipoCuenta || '',
        numeroCuenta: item.supplier.numeroCuenta || '',
        montoTotal: Number(item.amountNet),
        emailNotificacion: item.supplier.email || '',
        glosa: `Pago factura ${item.invoice.folio}`,
        detalle: [{ folio: item.invoice.folio, monto: Number(item.amountNet) }],
      })));
    } else {
      const { generateSantander } = await import('@wildlama/bank-formats');
      fileContent = generateSantander(itemsWithSupplier.map((item: any) => ({
        rutBeneficiario: item.supplier.rut,
        nombreBeneficiario: item.supplier.razonSocial,
        bancoDestino: item.supplier.banco || '',
        tipoCuenta: item.supplier.tipoCuenta || '',
        numeroCuenta: item.supplier.numeroCuenta || '',
        montoTotal: Number(item.amountNet),
        emailNotificacion: item.supplier.email || '',
        glosa: `Pago factura ${item.invoice.folio}`,
        detalle: [{ folio: item.invoice.folio, monto: Number(item.amountNet) }],
      })));
    }

    await db.update(paymentBatches)
      .set({ fileContent, updatedAt: new Date() })
      .where(eq(paymentBatches.id, batchId));

    return fileContent;
  }
}

export const paymentBatchService = new PaymentBatchService();

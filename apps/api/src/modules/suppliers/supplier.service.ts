import { eq, and, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { suppliers } from '../../db/schema.js';
import { parse } from 'csv-parse/sync';

export class SupplierService {
  async list(companyId: string, filters: { search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [eq(suppliers.companyId, companyId)];
    if (filters.search) {
      conditions.push(
        ilike(suppliers.razonSocial, `%${filters.search}%`)
      );
    }

    const [data, countResult] = await Promise.all([
      db.select()
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(suppliers.razonSocial)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(and(...conditions)),
    ]);

    return { data, total: Number(countResult[0].count), page, limit };
  }

  async getById(id: string) {
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, id),
    });
    if (!supplier) throw Object.assign(new Error('Supplier not found'), { status: 404 });
    return supplier;
  }

  async create(companyId: string, data: any) {
    const [supplier] = await db.insert(suppliers).values({ ...data, companyId }).returning();
    return supplier;
  }

  async update(id: string, data: any) {
    const [updated] = await db.update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    if (!updated) throw Object.assign(new Error('Supplier not found'), { status: 404 });
    return updated;
  }

  async importCsv(companyId: string, csvContent: string) {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0;

    for (const record of records) {
      try {
        await db.insert(suppliers).values({
          companyId,
          rut: record.rut || record.RUT,
          razonSocial: record.razon_social || record['Razon Social'] || record.nombre,
          giro: record.giro || null,
          direccion: record.direccion || null,
          email: record.email || null,
          telefono: record.telefono || null,
          banco: record.banco || null,
          tipoCuenta: record.tipo_cuenta || null,
          numeroCuenta: record.numero_cuenta || null,
        }).onConflictDoNothing();
        imported++;
      } catch { /* skip duplicates */ }
    }

    return { imported, total: records.length };
  }
}

export const supplierService = new SupplierService();

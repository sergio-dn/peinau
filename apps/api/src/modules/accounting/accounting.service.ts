import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { chartOfAccounts, costCenters } from '../../db/schema.js';
import { parse } from 'csv-parse/sync';

export class AccountingService {
  // Chart of Accounts
  async listAccounts(companyId: string) {
    return db.select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.companyId, companyId), eq(chartOfAccounts.isActive, true)))
      .orderBy(chartOfAccounts.code);
  }

  async createAccount(companyId: string, data: { code: string; name: string; parentCode?: string }) {
    const [account] = await db.insert(chartOfAccounts).values({ ...data, companyId }).returning();
    return account;
  }

  async updateAccount(id: string, data: { name?: string; parentCode?: string; isActive?: boolean }) {
    const [updated] = await db.update(chartOfAccounts).set(data).where(eq(chartOfAccounts.id, id)).returning();
    return updated;
  }

  async importAccountsCsv(companyId: string, csvContent: string) {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0;
    for (const r of records) {
      try {
        await db.insert(chartOfAccounts).values({
          companyId,
          code: r.codigo || r.code,
          name: r.nombre || r.name,
          parentCode: r.codigo_padre || r.parent_code || null,
        }).onConflictDoNothing();
        imported++;
      } catch { /* skip */ }
    }
    return { imported, total: records.length };
  }

  // Cost Centers
  async listCostCenters(companyId: string) {
    return db.select()
      .from(costCenters)
      .where(and(eq(costCenters.companyId, companyId), eq(costCenters.isActive, true)))
      .orderBy(costCenters.code);
  }

  async createCostCenter(companyId: string, data: { code: string; name: string; parentCode?: string }) {
    const [cc] = await db.insert(costCenters).values({ ...data, companyId }).returning();
    return cc;
  }

  async updateCostCenter(id: string, data: { name?: string; parentCode?: string; isActive?: boolean }) {
    const [updated] = await db.update(costCenters).set(data).where(eq(costCenters.id, id)).returning();
    return updated;
  }

  async importCostCentersCsv(companyId: string, csvContent: string) {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0;
    for (const r of records) {
      try {
        await db.insert(costCenters).values({
          companyId,
          code: r.codigo || r.code,
          name: r.nombre || r.name,
          parentCode: r.codigo_padre || r.parent_code || null,
        }).onConflictDoNothing();
        imported++;
      } catch { /* skip */ }
    }
    return { imported, total: records.length };
  }
}

export const accountingService = new AccountingService();

import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { invoices, invoiceLines, chartOfAccounts, costCenters } from '../../db/schema.js';

export class ReportsService {
  async invoicesByState(companyId: string) {
    const result = await db.select({
      state: invoices.state,
      count: sql<number>`count(*)`,
      total: sql<number>`sum(${invoices.montoTotal})`,
    })
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
      .groupBy(invoices.state);

    return result;
  }

  async aging(companyId: string) {
    const result = await db.execute(sql`
      SELECT
        CASE
          WHEN CURRENT_DATE - fecha_emision <= 30 THEN '0-30'
          WHEN CURRENT_DATE - fecha_emision <= 60 THEN '31-60'
          WHEN CURRENT_DATE - fecha_emision <= 90 THEN '61-90'
          WHEN CURRENT_DATE - fecha_emision <= 120 THEN '91-120'
          ELSE '120+'
        END as bucket,
        count(*) as count,
        sum(monto_total) as total
      FROM invoices
      WHERE company_id = ${companyId}
        AND state NOT IN ('pagada', 'rechazada')
      GROUP BY bucket
      ORDER BY bucket
    `);

    return result;
  }

  async spendByCostCenter(companyId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await db.select({
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
      total: sql<number>`sum(${invoiceLines.montoItem})`,
    })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
      .leftJoin(costCenters, eq(invoiceLines.costCenterId, costCenters.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.fechaEmision, startDate),
        lte(invoices.fechaEmision, endDate),
      ))
      .groupBy(costCenters.code, costCenters.name);

    return result;
  }

  async spendByAccount(companyId: string, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await db.select({
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      total: sql<number>`sum(${invoiceLines.montoItem})`,
    })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoiceLines.invoiceId, invoices.id))
      .leftJoin(chartOfAccounts, eq(invoiceLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.fechaEmision, startDate),
        lte(invoices.fechaEmision, endDate),
      ))
      .groupBy(chartOfAccounts.code, chartOfAccounts.name);

    return result;
  }

  async pendingByApprover(companyId: string) {
    const result = await db.execute(sql`
      SELECT
        u.id as approver_id,
        u.name as approver_name,
        count(DISTINCT ast.invoice_id) as pending_count,
        sum(i.monto_total) as pending_total
      FROM approval_steps ast
      JOIN invoices i ON ast.invoice_id = i.id
      JOIN users u ON ast.approver_id = u.id
      WHERE i.company_id = ${companyId}
        AND ast.action IS NULL
      GROUP BY u.id, u.name
    `);

    return result;
  }
}

export const reportsService = new ReportsService();

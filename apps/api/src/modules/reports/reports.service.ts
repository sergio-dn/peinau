import { eq, sql, and, gte, lte, between, desc } from 'drizzle-orm';
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

  async getDashboardStats(companyId: string) {
    const now = new Date();

    // Mes actual
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const primerDiaMes = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const ultimoDiaMes = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Mes anterior
    const prevDate = new Date(year, month - 1, 1);
    const primerDiaMesAnterior = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;
    const ultimoDiaMesAnterior = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().split('T')[0];

    // Dos meses atrás (para evolución 3 meses)
    const twoMonthsAgo = new Date(year, month - 2, 1);
    const primerDiaHace2Meses = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    // KPIs mes actual
    const [resumenMes] = await db.select({
      count: sql<number>`count(*)`,
      total: sql<number>`sum(monto_total)`,
      sinCeco: sql<number>`count(*) filter (where supplier_id is null)`,
    }).from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        between(invoices.fechaEmision, primerDiaMes, ultimoDiaMes)
      ));

    // Facturas pendientes de aprobación
    const [pendientes] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.state, 'pendiente')));

    // Facturas recibidas (sin procesar)
    const [recibidas] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.state, 'recibida')));

    // Por estado (mes actual)
    const porEstado = await db.select({
      state: invoices.state,
      count: sql<number>`count(*)`,
      monto: sql<number>`sum(monto_total)`,
    }).from(invoices)
      .where(and(eq(invoices.companyId, companyId), between(invoices.fechaEmision, primerDiaMes, ultimoDiaMes)))
      .groupBy(invoices.state);

    // Top 5 proveedores mes actual
    const topProveedores = await db.select({
      razonSocial: invoices.razonSocialEmisor,
      rut: invoices.rutEmisor,
      monto: sql<number>`sum(monto_total)`,
      count: sql<number>`count(*)`,
    }).from(invoices)
      .where(and(eq(invoices.companyId, companyId), between(invoices.fechaEmision, primerDiaMes, ultimoDiaMes)))
      .groupBy(invoices.razonSocialEmisor, invoices.rutEmisor)
      .orderBy(desc(sql`sum(monto_total)`))
      .limit(5);

    // Facturas recientes (últimas 10)
    const recientes = await db.select()
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.createdAt))
      .limit(10);

    // Evolución últimos 3 meses
    const evolucion = await db.select({
      mes: sql<string>`to_char(fecha_emision, 'YYYY-MM')`,
      count: sql<number>`count(*)`,
      monto: sql<number>`sum(monto_total)`,
    }).from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.fechaEmision, primerDiaHace2Meses)
      ))
      .groupBy(sql`to_char(fecha_emision, 'YYYY-MM')`)
      .orderBy(sql`to_char(fecha_emision, 'YYYY-MM')`);

    return {
      totalFacturasMes: Number(resumenMes?.count ?? 0),
      montoTotalMes: Number(resumenMes?.total ?? 0),
      facturasPendientesAprobacion: Number(pendientes?.count ?? 0),
      facturasRecibidas: Number(recibidas?.count ?? 0),
      porEstado: porEstado.map(p => ({ state: p.state, count: Number(p.count), monto: Number(p.monto) })),
      topProveedores: topProveedores.map(p => ({ ...p, monto: Number(p.monto), count: Number(p.count) })),
      recientes,
      evolucionMensual: evolucion,
    };
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

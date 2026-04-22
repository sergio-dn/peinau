import { Request, Response } from 'express';
import { z } from 'zod';
import { reportsService } from './reports.service.js';

const periodSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  month: z.coerce.number().min(1).max(12),
});

export class ReportsController {
  async invoicesByState(req: Request, res: Response) {
    const result = await reportsService.invoicesByState(req.user!.companyId);
    res.json(result);
  }

  async aging(req: Request, res: Response) {
    const result = await reportsService.aging(req.user!.companyId);
    res.json(result);
  }

  async spendByCostCenter(req: Request, res: Response) {
    const { year, month } = periodSchema.parse(req.query);
    const result = await reportsService.spendByCostCenter(req.user!.companyId, year, month);
    res.json(result);
  }

  async spendByAccount(req: Request, res: Response) {
    const { year, month } = periodSchema.parse(req.query);
    const result = await reportsService.spendByAccount(req.user!.companyId, year, month);
    res.json(result);
  }

  async pendingByApprover(req: Request, res: Response) {
    const result = await reportsService.pendingByApprover(req.user!.companyId);
    res.json(result);
  }

  async dashboard(req: Request, res: Response) {
    const { desde, hasta } = req.query as Record<string, string>;
    const stats = await reportsService.getDashboardStats(req.user!.companyId, desde, hasta);
    res.json(stats);
  }

  async monthlyVolume(req: Request, res: Response) {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await reportsService.monthlyVolume(req.user!.companyId, year);
    res.json(data);
  }

  async supplierRanking(req: Request, res: Response) {
    const { fechaDesde, fechaHasta, limit } = req.query as Record<string, string>;
    const data = await reportsService.supplierRanking(req.user!.companyId, fechaDesde, fechaHasta, limit ? Number(limit) : 10);
    res.json(data);
  }

  async taxSummary(req: Request, res: Response) {
    const { fechaDesde, fechaHasta } = req.query as Record<string, string>;
    const data = await reportsService.taxSummary(req.user!.companyId, fechaDesde, fechaHasta);
    res.json(data);
  }
}

export const reportsController = new ReportsController();

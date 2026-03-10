import { Request, Response } from 'express';
import { z } from 'zod';
import { accountingService } from './accounting.service.js';

const createAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  parentCode: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  parentCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createCostCenterSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  parentCode: z.string().optional(),
});

const updateCostCenterSchema = z.object({
  name: z.string().min(1).optional(),
  parentCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class AccountingController {
  // Chart of Accounts
  async listAccounts(req: Request, res: Response) {
    const accounts = await accountingService.listAccounts(req.user!.companyId);
    res.json(accounts);
  }

  async createAccount(req: Request, res: Response) {
    const data = createAccountSchema.parse(req.body);
    const account = await accountingService.createAccount(req.user!.companyId, data);
    res.status(201).json(account);
  }

  async updateAccount(req: Request, res: Response) {
    const data = updateAccountSchema.parse(req.body);
    const account = await accountingService.updateAccount(req.params.id, data);
    res.json(account);
  }

  async importAccountsCsv(req: Request, res: Response) {
    const { csvContent } = z.object({ csvContent: z.string().min(1) }).parse(req.body);
    const result = await accountingService.importAccountsCsv(req.user!.companyId, csvContent);
    res.json(result);
  }

  // Cost Centers
  async listCostCenters(req: Request, res: Response) {
    const costCenters = await accountingService.listCostCenters(req.user!.companyId);
    res.json(costCenters);
  }

  async createCostCenter(req: Request, res: Response) {
    const data = createCostCenterSchema.parse(req.body);
    const cc = await accountingService.createCostCenter(req.user!.companyId, data);
    res.status(201).json(cc);
  }

  async updateCostCenter(req: Request, res: Response) {
    const data = updateCostCenterSchema.parse(req.body);
    const cc = await accountingService.updateCostCenter(req.params.id, data);
    res.json(cc);
  }

  async importCostCentersCsv(req: Request, res: Response) {
    const { csvContent } = z.object({ csvContent: z.string().min(1) }).parse(req.body);
    const result = await accountingService.importCostCentersCsv(req.user!.companyId, csvContent);
    res.json(result);
  }
}

export const accountingController = new AccountingController();

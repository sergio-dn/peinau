import { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { siiSyncService } from './sii-sync.service.js';
import { db } from '../../config/database.js';
import { siiSyncLogs } from '../../db/schema.js';

export class SiiSyncController {
  async triggerSync(req: Request, res: Response) {
    const result = await siiSyncService.syncCompany(req.user!.companyId);
    res.json({ message: 'Sync completed', ...result });
  }

  async getSyncLogs(req: Request, res: Response) {
    const logs = await db.select()
      .from(siiSyncLogs)
      .where(eq(siiSyncLogs.companyId, req.user!.companyId))
      .orderBy(desc(siiSyncLogs.startedAt))
      .limit(20);
    res.json(logs);
  }
}

export const siiSyncController = new SiiSyncController();

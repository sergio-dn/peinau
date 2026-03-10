import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database.js';
import { auditLog } from '../db/schema.js';

export function auditAction(entityType: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        db.insert(auditLog).values({
          companyId: req.user.companyId,
          userId: req.user.userId,
          entityType,
          entityId: req.params.id || body?.id || '00000000-0000-0000-0000-000000000000',
          action,
          newValues: body,
          ipAddress: req.ip || null,
        }).catch(err => console.error('Audit log error:', err));
      }
      return originalJson(body);
    } as any;

    next();
  };
}

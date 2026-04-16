import { Request, Response } from 'express';
import { authService } from './auth.service.js';

export class AuthController {
  async me(req: Request, res: Response) {
    const { db } = await import('../../config/database.js');
    const { users } = await import('../../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, req.user!.userId),
      columns: { id: true, name: true, email: true, companyId: true },
    });

    res.json({
      user: {
        id: req.user!.userId,
        email: req.user!.email,
        name: dbUser?.name ?? req.user!.email,
        roles: req.user!.roles,
        companyId: req.user!.companyId,
      },
    });
  }

  async sync(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const result = await authService.syncUser(
      req.user.supabaseUserId,
      req.user.email,
    );

    res.json({ synced: true, ...result });
  }
}

export const authController = new AuthController();

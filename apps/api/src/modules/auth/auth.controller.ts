import { Request, Response } from 'express';
import { authService } from './auth.service.js';

export class AuthController {
  async me(req: Request, res: Response) {
    res.json({ user: req.user });
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

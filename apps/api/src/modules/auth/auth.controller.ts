import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    const result = await authService.refresh(refreshToken);
    res.json(result);
  }

  async me(req: Request, res: Response) {
    res.json({ user: req.user });
  }
}

export const authController = new AuthController();

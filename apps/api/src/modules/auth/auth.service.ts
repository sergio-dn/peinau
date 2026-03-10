import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users, userRoles } from '../../db/schema.js';
import { env } from '../../config/env.js';
import type { AuthPayload } from '../../middleware/auth.js';

export class AuthService {
  async login(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { roles: true },
    });

    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const roles = user.roles.map((r: any) => r.role);
    const payload: AuthPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      roles,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const { userId } = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: { roles: true },
      });

      if (!user || !user.isActive) {
        throw Object.assign(new Error('User not found'), { status: 401 });
      }

      const roles = user.roles.map((r: any) => r.role);
      const payload: AuthPayload = {
        userId: user.id,
        companyId: user.companyId,
        email: user.email,
        roles,
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
      return { accessToken };
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
  }

  async createUser(data: { companyId: string; email: string; password: string; name: string; roles: string[] }) {
    const passwordHash = await bcrypt.hash(data.password, 12);

    const [user] = await db.insert(users).values({
      companyId: data.companyId,
      email: data.email,
      passwordHash,
      name: data.name,
    }).returning();

    if (data.roles.length > 0) {
      await db.insert(userRoles).values(
        data.roles.map(role => ({ userId: user.id, role: role as any }))
      );
    }

    return user;
  }
}

export const authService = new AuthService();

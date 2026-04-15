import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { db } from '../config/database.js';
import { users, userRoles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface AuthPayload {
  userId: string;
  companyId: string;
  email: string;
  roles: string[];
  supabaseUserId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Look up our DB user by supabase_auth_id (or fall back to email for migration period)
    let dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseAuthId, supabaseUser.id),
      with: { roles: true },
    });

    if (!dbUser && supabaseUser.email) {
      // Migration fallback: link by email and update supabase_auth_id
      dbUser = await db.query.users.findFirst({
        where: eq(users.email, supabaseUser.email),
        with: { roles: true },
      });
      if (dbUser) {
        await db.update(users)
          .set({ supabaseAuthId: supabaseUser.id })
          .where(eq(users.id, dbUser.id));
      }
    }

    if (!dbUser || !dbUser.isActive) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    req.user = {
      userId: dbUser.id,
      companyId: dbUser.companyId,
      email: dbUser.email,
      roles: dbUser.roles.map((r: any) => r.role),
      supabaseUserId: supabaseUser.id,
    };

    next();
  } catch (err) {
    console.error('[auth] middleware error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const hasRole = roles.some(r => req.user!.roles.includes(r));
    if (!hasRole) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// Legacy alias for any routes still referencing authenticateToken during migration
export const authenticateToken = authenticate;

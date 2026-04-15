import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { users, userRoles } from '../../db/schema.js';

export class AuthService {
  /**
   * Called after Supabase OAuth callback to ensure user exists in our DB.
   * Creates the user if first login.
   */
  async syncUser(supabaseUserId: string, email: string, name?: string): Promise<{ userId: string; companyId: string; roles: string[] }> {
    // Try by supabase_auth_id first
    let user = await db.query.users.findFirst({
      where: eq(users.supabaseAuthId, supabaseUserId),
      with: { roles: true },
    });

    // Fallback: match by email (existing user not yet migrated)
    if (!user && email) {
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: { roles: true },
      });
      if (user) {
        await db.update(users)
          .set({ supabaseAuthId: supabaseUserId })
          .where(eq(users.id, user.id));
      }
    }

    if (!user) {
      throw Object.assign(new Error('User not provisioned. Contact your administrator.'), { status: 403 });
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Account inactive'), { status: 403 });
    }

    return {
      userId: user.id,
      companyId: user.companyId,
      roles: user.roles.map((r: any) => r.role),
    };
  }

  async createUser(data: { companyId: string; email: string; name: string; roles: string[]; supabaseAuthId?: string }) {
    const [user] = await db.insert(users).values({
      companyId: data.companyId,
      email: data.email,
      passwordHash: '', // no longer used
      name: data.name,
      supabaseAuthId: data.supabaseAuthId,
    }).returning();

    if (data.roles.length > 0) {
      await db.insert(userRoles).values(
        data.roles.map(role => ({ userId: user.id, role: role as any }))
      );
    }

    return user;
  }

  async getUserProfile(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { roles: true },
    });
  }
}

export const authService = new AuthService();

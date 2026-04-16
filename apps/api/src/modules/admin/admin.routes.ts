import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import {
  getSettings,
  updateSettings,
  updateSiiCredentials,
  testSiiConnection,
  debugSiiQuery,
  listUsers,
  createUser,
  updateUser,
} from './admin.controller.js';
import { db } from '../../config/database.js';
import { users, userRoles } from '../../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Helper to wrap async handlers so Express 4 receives errors via next()
const wrap = (fn: Function) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

// Settings
router.get('/settings', wrap(getSettings));
router.put('/settings', wrap(updateSettings));

// SII credentials
router.put('/sii-credentials', wrap(updateSiiCredentials));
router.post('/sii-test', wrap(testSiiConnection));
router.post('/sii-debug', wrap(debugSiiQuery));

// Users
router.get('/users', wrap(listUsers));
router.post('/users', wrap(createUser));
router.put('/users/:id', wrap(updateUser));

// GET /api/admin/users/pending
router.get('/users/pending', wrap(async (req: any, res: any) => {
  const pendingUsers = await db.query.users.findMany({
    where: and(eq(users.companyId, req.user!.companyId), eq(users.status, 'pending')),
    columns: { id: true, email: true, name: true, createdAt: true },
    orderBy: [desc(users.createdAt)],
  });
  res.json(pendingUsers);
}));

// PUT /api/admin/users/:id/approve  body: { roles: string[] }
router.put('/users/:id/approve', wrap(async (req: any, res: any) => {
  const { roles = [] } = req.body;
  const [updated] = await db.update(users)
    .set({ status: 'active', isActive: true, updatedAt: new Date() })
    .where(and(eq(users.id, req.params.id), eq(users.companyId, req.user!.companyId)))
    .returning();
  if (!updated) return res.status(404).json({ error: 'User not found' });
  if (roles.length > 0) {
    await db.delete(userRoles).where(eq(userRoles.userId, updated.id));
    await db.insert(userRoles).values(roles.map((r: string) => ({ userId: updated.id, role: r as any })));
  }
  res.json({ ok: true, user: updated });
}));

export default router;

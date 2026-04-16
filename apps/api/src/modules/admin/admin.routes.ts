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

export default router;

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

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// SII credentials
router.put('/sii-credentials', updateSiiCredentials);
router.post('/sii-test', testSiiConnection);
router.post('/sii-debug', debugSiiQuery);

// Users
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

export default router;

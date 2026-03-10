import { Router } from 'express';
import { siiSyncController } from './sii-sync.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.post('/sync', requireRole('admin'), (req, res, next) => siiSyncController.triggerSync(req, res).catch(next));
router.get('/sync/status', requireRole('admin'), (req, res, next) => siiSyncController.getSyncStatus(req, res).catch(next));
router.get('/sync/logs', requireRole('admin'), (req, res, next) => siiSyncController.getSyncLogs(req, res).catch(next));

export default router;

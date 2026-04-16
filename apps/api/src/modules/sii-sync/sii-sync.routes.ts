import { Router } from 'express';
import { siiSyncController } from './sii-sync.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

// POST /api/sii/trigger — inicia sync manual
router.post('/trigger', requireRole('admin'), (req, res, next) => siiSyncController.triggerSync(req, res).catch(next));

// GET /api/sii/status — devuelve último sync log
router.get('/status', requireRole('admin'), (req, res, next) => siiSyncController.getSyncStatus(req, res).catch(next));

// GET /api/sii/history — devuelve últimos 10 sync logs
router.get('/history', requireRole('admin'), (req, res, next) => siiSyncController.getSyncHistory(req, res).catch(next));

// Legacy aliases (backwards compatibility)
router.post('/sync', requireRole('admin'), (req, res, next) => siiSyncController.triggerSync(req, res).catch(next));
router.get('/sync/status', requireRole('admin'), (req, res, next) => siiSyncController.getSyncStatus(req, res).catch(next));
router.get('/sync/logs', requireRole('admin'), (req, res, next) => siiSyncController.getSyncHistory(req, res).catch(next));

export default router;

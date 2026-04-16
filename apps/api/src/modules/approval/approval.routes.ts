import { Router } from 'express';
import { approvalController } from './approval.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/queue', (req, res, next) => approvalController.getQueue(req, res).catch(next));
router.get('/pending', (req, res, next) => approvalController.getPending(req, res).catch(next));
router.post('/:invoiceId/start', requireRole('admin', 'contabilidad'), (req, res, next) => approvalController.startApproval(req, res).catch(next));
router.post('/:invoiceId/approve', requireRole('aprobador', 'admin'), (req, res, next) => approvalController.approve(req, res).catch(next));
router.post('/:invoiceId/reject', requireRole('aprobador', 'admin'), (req, res, next) => approvalController.reject(req, res).catch(next));
router.post('/:invoiceId/return', requireRole('aprobador', 'admin'), (req, res, next) => approvalController.returnToPrevious(req, res).catch(next));

export default router;

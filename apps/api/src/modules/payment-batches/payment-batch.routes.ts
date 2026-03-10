import { Router } from 'express';
import { paymentBatchController } from './payment-batch.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => paymentBatchController.list(req, res).catch(next));
router.get('/:id', (req, res, next) => paymentBatchController.getById(req, res).catch(next));
router.post('/', requireRole('admin', 'contabilidad'), (req, res, next) => paymentBatchController.create(req, res).catch(next));
router.post('/:id/approve', requireRole('admin'), (req, res, next) => paymentBatchController.approve(req, res).catch(next));
router.post('/:id/mark-sent', requireRole('admin', 'contabilidad'), (req, res, next) => paymentBatchController.markSent(req, res).catch(next));
router.post('/:id/mark-processed', requireRole('admin', 'contabilidad'), (req, res, next) => paymentBatchController.markProcessed(req, res).catch(next));
router.get('/:id/file', requireRole('admin', 'contabilidad'), (req, res, next) => paymentBatchController.generateFile(req, res).catch(next));

export default router;

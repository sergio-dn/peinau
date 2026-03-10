import { Router } from 'express';
import { invoiceController } from './invoice.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => invoiceController.list(req, res).catch(next));
router.get('/:id', (req, res, next) => invoiceController.getById(req, res).catch(next));
router.get('/:id/history', (req, res, next) => invoiceController.getHistory(req, res).catch(next));
router.put('/:id/lines/:lineId/accounting', requireRole('contabilidad', 'admin'), (req, res, next) => invoiceController.updateLineAccounting(req, res).catch(next));
router.post('/:id/contabilizar', requireRole('contabilidad', 'admin'), (req, res, next) => invoiceController.contabilizar(req, res).catch(next));
router.post('/:id/reject', (req, res, next) => invoiceController.reject(req, res).catch(next));

export default router;

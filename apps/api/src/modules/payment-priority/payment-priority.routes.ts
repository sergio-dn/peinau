import { Router } from 'express';
import { paymentPriorityController } from './payment-priority.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/invoices', (req, res, next) =>
  paymentPriorityController.getInvoices(req, res).catch(next)
);

router.put('/:id/week', requireRole('admin', 'tesoreria', 'cfo', 'contabilidad'), (req, res, next) =>
  paymentPriorityController.assignWeek(req, res).catch(next)
);

export default router;

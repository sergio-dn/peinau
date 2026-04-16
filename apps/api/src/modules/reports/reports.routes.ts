import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/invoices-by-state', (req, res, next) => reportsController.invoicesByState(req, res).catch(next));
router.get('/aging', (req, res, next) => reportsController.aging(req, res).catch(next));
router.get('/spend-by-cost-center', (req, res, next) => reportsController.spendByCostCenter(req, res).catch(next));
router.get('/spend-by-account', (req, res, next) => reportsController.spendByAccount(req, res).catch(next));
router.get('/pending-by-approver', (req, res, next) => reportsController.pendingByApprover(req, res).catch(next));
router.get('/dashboard', (req, res, next) => reportsController.dashboard(req, res).catch(next));

export default router;

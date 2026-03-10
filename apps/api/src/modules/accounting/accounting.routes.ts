import { Router } from 'express';
import { accountingController } from './accounting.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

// Chart of Accounts
router.get('/accounts', (req, res, next) => accountingController.listAccounts(req, res).catch(next));
router.post('/accounts', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.createAccount(req, res).catch(next));
router.put('/accounts/:id', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.updateAccount(req, res).catch(next));
router.post('/accounts/import-csv', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.importAccountsCsv(req, res).catch(next));

// Cost Centers
router.get('/cost-centers', (req, res, next) => accountingController.listCostCenters(req, res).catch(next));
router.post('/cost-centers', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.createCostCenter(req, res).catch(next));
router.put('/cost-centers/:id', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.updateCostCenter(req, res).catch(next));
router.post('/cost-centers/import-csv', requireRole('admin', 'contabilidad'), (req, res, next) => accountingController.importCostCentersCsv(req, res).catch(next));

export default router;

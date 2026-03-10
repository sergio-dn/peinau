import { Router } from 'express';
import { supplierController } from './supplier.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => supplierController.list(req, res).catch(next));
router.get('/:id', (req, res, next) => supplierController.getById(req, res).catch(next));
router.post('/', requireRole('admin', 'contabilidad'), (req, res, next) => supplierController.create(req, res).catch(next));
router.put('/:id', requireRole('admin', 'contabilidad'), (req, res, next) => supplierController.update(req, res).catch(next));
router.post('/import-csv', requireRole('admin', 'contabilidad'), (req, res, next) => supplierController.importCsv(req, res).catch(next));

export default router;

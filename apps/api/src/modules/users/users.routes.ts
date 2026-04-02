import { Router } from 'express';
import { invoiceController } from '../invoices/invoice.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res, next) => invoiceController.listUsers(req, res).catch(next));

export default router;

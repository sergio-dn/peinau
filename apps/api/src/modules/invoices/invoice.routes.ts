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

// Notes
router.put('/:id/notes', (req, res, next) => invoiceController.updateNotes(req, res).catch(next));

// Tags
router.get('/:id/tags', (req, res, next) => invoiceController.getTags(req, res).catch(next));
router.post('/:id/tags', (req, res, next) => invoiceController.addTag(req, res).catch(next));
router.delete('/:id/tags/:tagId', (req, res, next) => invoiceController.removeTag(req, res).catch(next));

// Assignments
router.get('/:id/assignments', (req, res, next) => invoiceController.getAssignments(req, res).catch(next));
router.post('/:id/assignments', (req, res, next) => invoiceController.assignUser(req, res).catch(next));
router.delete('/:id/assignments/:assignmentId', (req, res, next) => invoiceController.removeAssignment(req, res).catch(next));

export default router;

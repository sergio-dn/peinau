import { Router } from 'express';
import multer from 'multer';
import { attachmentController } from './attachment.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/tmp/' });

router.use(authenticateToken);

// Invoice attachment routes
router.get('/invoices/:id/attachments', (req, res, next) => attachmentController.list(req, res).catch(next));
router.post('/invoices/:id/attachments', upload.single('file'), (req, res, next) => attachmentController.upload(req, res).catch(next));
router.get('/attachments/:attachmentId/download', (req, res, next) => attachmentController.download(req, res).catch(next));
router.delete('/attachments/:attachmentId', (req, res, next) => attachmentController.delete(req, res).catch(next));

export default router;

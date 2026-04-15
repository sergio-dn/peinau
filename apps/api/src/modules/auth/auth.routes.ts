import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, (req, res, next) => authController.me(req, res).catch(next));
router.post('/sync', authenticate, (req, res, next) => authController.sync(req, res).catch(next));

export default router;

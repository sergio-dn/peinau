import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res).catch(next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res).catch(next));
router.get('/me', authenticateToken, (req, res, next) => authController.me(req, res).catch(next));

export default router;

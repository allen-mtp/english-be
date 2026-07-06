import { Router } from 'express';
import { register, login, logout, me, refresh } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', me);

export default router;

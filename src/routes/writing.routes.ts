import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import { getPrompt, submitWriting, getHistory, getById } from '../controllers/writing.controller';

const router = Router();

router.get('/prompt', aiLimiter, getPrompt);
router.post('/submit', aiLimiter, submitWriting);
router.get('/history', getHistory);
router.get('/:id', getById);

export default router;
import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import { getScenario, getVariations } from '../controllers/speaking-scenario.controller';

const router = Router();

router.get('/scenario', aiLimiter, getScenario);
router.get('/variations', aiLimiter, getVariations);

export default router;
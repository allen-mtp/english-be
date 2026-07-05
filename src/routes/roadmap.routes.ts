import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  generateRoadmap,
  getMyRoadmap,
  getDayLesson,
  completeDayLesson,
  resetRoadmap,
} from '../controllers/roadmap.controller';

const router = Router();

router.post('/generate', aiLimiter, generateRoadmap);
router.get('/my', getMyRoadmap);
router.get('/day/:day', getDayLesson);
router.post('/day/:day/complete', completeDayLesson);
router.patch('/reset', resetRoadmap);

export default router;
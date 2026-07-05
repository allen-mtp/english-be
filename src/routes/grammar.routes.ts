import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  generateLesson,
  getLessons,
  getLessonById,
  submitExercises,
  getTopics,
  getStats,
} from '../controllers/grammar.controller';

const router = Router();

router.post('/generate', aiLimiter, generateLesson);
router.get('/', getLessons);
router.get('/topics', getTopics);
router.get('/stats', getStats);
router.get('/:id', getLessonById);
router.post('/:id/submit', submitExercises);

export default router;
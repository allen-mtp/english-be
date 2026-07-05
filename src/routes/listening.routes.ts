import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import { generateExercise, getExercises, getExerciseById, submitAnswers } from '../controllers/listening.controller';

const router = Router();

router.post('/generate', aiLimiter, generateExercise);
router.get('/', getExercises);
router.get('/:id', getExerciseById);
router.post('/:id/submit', submitAnswers);

export default router;
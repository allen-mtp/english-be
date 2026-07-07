import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import { generateQuiz, getQuizzes, getQuizById, submitQuiz, saveQuizProgress } from '../controllers/quiz.controller';

const router = Router();

router.post('/generate', aiLimiter, generateQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);
router.patch('/:id/progress', saveQuizProgress);
router.post('/:id/submit', submitQuiz);

export default router;
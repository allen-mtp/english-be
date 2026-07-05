import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  generateVocabulary,
  generateBatchVocabularies,
  getMyVocabularies,
  getReviewToday,
  reviewVocabulary,
  getVocabularyStats,
  deleteVocabulary,
} from '../controllers/vocabulary.controller';

const router = Router();

router.post('/generate', aiLimiter, generateVocabulary);
router.post('/generate-batch', aiLimiter, generateBatchVocabularies);
router.get('/my', getMyVocabularies);
router.get('/review/today', getReviewToday);
router.post('/review', reviewVocabulary);
router.get('/stats', getVocabularyStats);
router.delete('/:id', deleteVocabulary);

export default router;
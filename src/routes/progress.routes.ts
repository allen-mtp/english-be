import { Router } from 'express';
import {
  getStats,
  getCalendar,
  getWeeklySummary,
  logActivity,
} from '../controllers/progress.controller';

const router = Router();

router.get('/stats', getStats);
router.get('/calendar', getCalendar);
router.get('/weekly', getWeeklySummary);
router.post('/log', logActivity);

export default router;
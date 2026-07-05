import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  scorePronunciation,
  getPronunciationHistory,
  getPronunciationById,
} from '../controllers/pronunciation.controller';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.webm', '.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

router.post('/score', aiLimiter, upload.single('audio'), scorePronunciation);
router.get('/history', getPronunciationHistory);
router.get('/:id', getPronunciationById);

export default router;
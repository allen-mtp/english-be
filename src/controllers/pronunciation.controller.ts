import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { PronunciationLog } from '../models/PronunciationLog';
import { pronunciationService } from '../services/pronunciation.service';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';
import { withAIStream } from '../utils/ai-stream-response';

export async function generateSentences(req: Request, res: Response): Promise<void> {
  const { topic, level } = req.body;
  if (!topic || !level) {
    res.status(400).json({ error: 'topic and level are required' });
    return;
  }

  await withAIStream(
    res,
    201,
    async (emitChunk) => pronunciationService.generateSentences(topic, level, emitChunk),
    (result) => result,
  );
}

export async function scorePronunciation(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  const audioFile = req.file;

  if (!text || !audioFile) {
    res.status(400).json({ error: 'text and audio file are required' });
    return;
  }

  await withAIStream(
    res,
    201,
    async (emitChunk) => {
      const log = await pronunciationService.score(getUserId(req), audioFile.buffer, text, emitChunk);
      await updateStreak(getUserId(req));

      await LearningLog.create({
        userId: getUserId(req),
        date: new Date(),
        type: 'PRONUNCIATION',
        durationMinutes: Math.ceil(text.split(' ').length / 30),
        xpEarned: calculateXP('PRONUNCIATION'),
        details: { score: log.overallScore },
      });

      return log;
    },
    (log) => ({ log }),
  );
}

export async function getPronunciationHistory(req: Request, res: Response): Promise<void> {
  try {
    const { ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const total = await PronunciationLog.countDocuments({ userId: getUserId(req) });
    const logs = await PronunciationLog.find({ userId: getUserId(req) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      logs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getPronunciationById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const log = await PronunciationLog.findOne({ _id: id, userId: getUserId(req) });
    if (!log) {
      res.status(404).json({ error: 'Pronunciation log not found' });
      return;
    }
    res.json({ log });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

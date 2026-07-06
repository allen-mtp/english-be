import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { ShadowingLog } from '../models/ShadowingLog';
import { shadowingService } from '../services/shadowing.service';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function scoreShadowing(req: Request, res: Response): Promise<void> {
  try {
    const { conversationId, sentenceIndex } = req.body;
    const audioFile = req.file;

    if (!conversationId || sentenceIndex === undefined || !audioFile) {
      res.status(400).json({ error: 'conversationId, sentenceIndex, and audio file are required' });
      return;
    }

    const log = await shadowingService.score(
      getUserId(req),
      audioFile.buffer,
      conversationId,
      parseInt(sentenceIndex),
    );
    await updateStreak(getUserId(req));

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'SHADOWING',
      durationMinutes: 1,
      xpEarned: calculateXP('SHADOWING'),
      details: { conversationId, score: log.overallScore },
    });

    res.status(201).json({ log });
  } catch (error: any) {
    console.error('scoreShadowing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getShadowingHistory(req: Request, res: Response): Promise<void> {
  try {
    const { ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const total = await ShadowingLog.countDocuments({ userId: getUserId(req) });
    const logs = await ShadowingLog.find({ userId: getUserId(req) })
      .populate('conversationId', 'title topic level')
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
import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { WritingSubmission } from '../models/Writing';
import { writingService } from '../services/writing.service';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function getPrompt(req: Request, res: Response): Promise<void> {
  try {
    const { level, type, topic } = req.query;
    const prompt = await writingService.generatePrompt(
      (level as string) || 'B1',
      type as string,
      topic as string,
    );
    res.json({ prompt });
  } catch (error: any) {
    console.error('getPrompt error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function submitWriting(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, promptType, level, topic, text } = req.body;

    if (!prompt || !text || !text.trim()) {
      res.status(400).json({ error: 'prompt and text are required' });
      return;
    }

    if (text.trim().split(/\s+/).length < 20) {
      res.status(400).json({ error: 'Please write at least 20 words' });
      return;
    }

    const promptData = { prompt, promptType: promptType || 'essay', level: level || 'B1', topic: topic || 'general' };
    const submission = await writingService.evaluate(getUserId(req), promptData, text);

    await updateStreak(getUserId(req));
    const xp = calculateXP('WRITING', submission.feedback.overallScore / 20);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: Math.ceil(submission.wordCount / 30),
      xpEarned: xp,
      details: { score: submission.feedback.overallScore },
    });

    res.status(201).json({ submission, xpEarned: xp });
  } catch (error: any) {
    console.error('submitWriting error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const { ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const total = await WritingSubmission.countDocuments({ userId: getUserId(req) });
    const submissions = await WritingSubmission.find({ userId: getUserId(req) })
      .select('prompt promptType topic level wordCount feedback.overallScore feedback.bandScore createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      submissions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const submission = await WritingSubmission.findOne({ _id: id, userId: getUserId(req) });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    res.json({ submission });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
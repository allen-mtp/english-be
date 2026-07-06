import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { Quiz } from '../models/Quiz';
import { quizService } from '../services/quiz.service';
import { LearningLog } from '../models/LearningLog';
import { User } from '../models/User';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function generateQuiz(req: Request, res: Response): Promise<void> {
  try {
    const { type = 'practice', category = 'mixed', level = 'A1', questionCount = 10, topic } = req.body;

    const quiz = await quizService.generate(
      getUserId(req),
      type,
      category,
      level,
      questionCount,
      topic,
    );

    res.status(201).json({ quiz });
  } catch (error: any) {
    console.error('generateQuiz error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getQuizzes(req: Request, res: Response): Promise<void> {
  try {
    const { type, completed, ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const filter: any = { userId: getUserId(req) };
    if (type) filter.type = type;
    if (completed !== undefined) filter.completed = completed === 'true';

    const total = await Quiz.countDocuments(filter);
    const quizzes = await Quiz.find(filter)
      .select('title level type category totalQuestions score correctCount completed createdAt completedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      quizzes,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getQuizById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findOne({ _id: id, userId: getUserId(req) });
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    // If already completed, return with answers
    res.json({ quiz });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function submitQuiz(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers array is required' });
      return;
    }

    const result = await quizService.submit(getUserId(req), id, answers);

    await updateStreak(getUserId(req));
    const xp = calculateXP('QUIZ', result.score / 20);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: 15,
      xpEarned: xp,
      details: { score: result.score },
    });

    // If placement test, update user level
    if (result.determinedLevel) {
      await User.findByIdAndUpdate(getUserId(req), { level: result.determinedLevel });
    }

    res.json({ ...result, xpEarned: xp });
  } catch (error: any) {
    console.error('submitQuiz error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
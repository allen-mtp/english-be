import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { GrammarLesson, GrammarProgress } from '../models/Grammar';
import { grammarService } from '../services/grammar.service';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function generateLesson(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level, title } = req.body;
    const lesson = await grammarService.generateLesson(getUserId(req), topic, level, title);
    res.status(201).json({ lesson });
  } catch (error: any) {
    console.error('generateLesson error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getLessons(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level, ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const filter: any = { userId: getUserId(req) };
    if (topic) filter.topic = topic;
    if (level) filter.level = level;

    const total = await GrammarLesson.countDocuments(filter);
    const lessons = await GrammarLesson.find(filter)
      .select('title topic level createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get user progress for these lessons
    const lessonIds = lessons.map(l => l._id);
    const progress = await GrammarProgress.find({
      userId: getUserId(req),
      lessonId: { $in: lessonIds },
    });
    const progressMap = new Map(progress.map(p => [p.lessonId.toString(), p]));

    const lessonsWithProgress = lessons.map(lesson => {
      const p = progressMap.get(lesson._id.toString());
      return {
        ...lesson.toJSON(),
        completed: p?.completed || false,
        score: p?.score || 0,
        attempts: p?.attempts || 0,
      };
    });

    res.json({
      lessons: lessonsWithProgress,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getLessonById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const lesson = await GrammarLesson.findOne({ _id: id, userId: getUserId(req) });
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    const progress = await GrammarProgress.findOne({ userId: getUserId(req), lessonId: id });

    res.json({
      lesson,
      progress: progress ? {
        completed: progress.completed,
        score: progress.score,
        attempts: progress.attempts,
        lastAttempt: progress.lastAttempt,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function submitExercises(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers array is required' });
      return;
    }

    const lesson = await GrammarLesson.findOne({ _id: id, userId: getUserId(req) });
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // Grade the answers
    const exerciseScores = answers.map((answer, index) => {
      const exercise = lesson.exercises[index];
      if (!exercise) return { question: '', correct: false };
      return {
        question: exercise.question,
        correct: answer === exercise.correctIndex,
      };
    });

    const correctCount = exerciseScores.filter(s => s.correct).length;
    if (lesson.exercises.length === 0) {
      res.status(400).json({ error: 'Lesson has no exercises' });
      return;
    }
    const score = Math.round((correctCount / lesson.exercises.length) * 100);
    const completed = score >= 70;

    // Update progress
    let progress = await GrammarProgress.findOne({ userId: getUserId(req), lessonId: id });
    if (!progress) {
      progress = new GrammarProgress({
        userId: getUserId(req),
        lessonId: id,
      });
    }
    progress.exerciseScores = exerciseScores;
    progress.score = score;
    progress.completed = progress.completed || completed;
    progress.attempts += 1;
    progress.lastAttempt = new Date();
    await progress.save();

    // XP and streak
    await updateStreak(getUserId(req));
    const xp = calculateXP('GRAMMAR_EXERCISE', score / 20);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: 5,
      xpEarned: xp,
      details: { score },
    });

    // Return detailed results
    const detailedResults = lesson.exercises.map((exercise, index) => ({
      question: exercise.question,
      options: exercise.options,
      correctIndex: exercise.correctIndex,
      userAnswer: answers[index] ?? -1,
      correct: answers[index] === exercise.correctIndex,
      explanation: exercise.explanation,
    }));

    res.json({
      score,
      correctCount,
      totalQuestions: lesson.exercises.length,
      completed,
      xpEarned: xp,
      results: detailedResults,
    });
  } catch (error: any) {
    console.error('submitExercises error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getTopics(req: Request, res: Response): Promise<void> {
  try {
    const topics = await GrammarLesson.distinct('topic', { userId: getUserId(req) });
    res.json({ topics });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const totalLessons = await GrammarLesson.countDocuments({ userId: getUserId(req) });
    const progress = await GrammarProgress.find({ userId: getUserId(req) });
    const completed = progress.filter(p => p.completed).length;
    const avgScore = progress.length > 0
      ? Math.round(progress.reduce((sum, p) => sum + p.score, 0) / progress.length)
      : 0;

    res.json({
      stats: {
        totalLessons,
        completed,
        inProgress: progress.filter(p => !p.completed).length,
        avgScore,
        totalAttempts: progress.reduce((sum, p) => sum + p.attempts, 0),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
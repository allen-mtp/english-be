import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { ListeningExercise, ListeningProgress } from '../models/Listening';
import { listeningService } from '../services/listening.service';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';
import { withAIStream } from '../utils/ai-stream-response';

export async function generateExercise(req: Request, res: Response): Promise<void> {
  const { level, topic, type } = req.body;

  await withAIStream(
    res,
    201,
    async (emitChunk) => listeningService.generate(getUserId(req), level || 'B1', topic, type, emitChunk),
    (exercise) => ({ exercise }),
  );
}

export async function getExercises(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level, type, ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const filter: any = { userId: getUserId(req) };
    if (topic) filter.topic = topic;
    if (level) filter.level = level;
    if (type) filter.type = type;

    const total = await ListeningExercise.countDocuments(filter);
    const exercises = await ListeningExercise.find(filter)
      .select('title topic level type duration createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const exerciseIds = exercises.map(e => e._id);
    const progress = await ListeningProgress.find({
      userId: getUserId(req),
      exerciseId: { $in: exerciseIds },
    });
    const progressMap = new Map(progress.map(p => [p.exerciseId.toString(), p]));

    const exercisesWithProgress = exercises.map(exercise => {
      const p = progressMap.get(exercise._id.toString());
      return {
        ...exercise.toJSON(),
        completed: p?.completed || false,
        score: p?.score || 0,
        attempts: p?.attempts || 0,
      };
    });

    res.json({
      exercises: exercisesWithProgress,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getExerciseById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const exercise = await ListeningExercise.findOne({ _id: id, userId: getUserId(req) });
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const progress = await ListeningProgress.findOne({ userId: getUserId(req), exerciseId: id });

    res.json({
      exercise,
      progress: progress ? {
        completed: progress.completed,
        score: progress.score,
        attempts: progress.attempts,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function submitAnswers(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers array is required' });
      return;
    }

    const exercise = await ListeningExercise.findOne({ _id: id, userId: getUserId(req) });
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const correctCount = answers.filter((answer, index) => answer === exercise.questions[index]?.correctIndex).length;
    if (exercise.questions.length === 0) {
      res.status(400).json({ error: 'Exercise has no questions' });
      return;
    }
    const score = Math.round((correctCount / exercise.questions.length) * 100);
    const completed = score >= 70;

    let progress = await ListeningProgress.findOne({ userId: getUserId(req), exerciseId: id });
    if (!progress) {
      progress = new ListeningProgress({ userId: getUserId(req), exerciseId: id });
    }
    progress.score = Math.max(progress.score, score);
    progress.completed = progress.completed || completed;
    progress.attempts += 1;
    progress.lastAttempt = new Date();
    await progress.save();

    await updateStreak(getUserId(req));
    const xp = calculateXP('LISTENING', score / 20);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: Math.ceil(exercise.duration / 60),
      xpEarned: xp,
      details: { score },
    });

    const detailedResults = exercise.questions.map((q, index) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      userAnswer: answers[index] ?? -1,
      correct: answers[index] === q.correctIndex,
      explanation: q.explanation,
    }));

    res.json({
      score,
      correctCount,
      totalQuestions: exercise.questions.length,
      completed,
      xpEarned: xp,
      results: detailedResults,
    });
  } catch (error: any) {
    console.error('submitAnswers error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { User } from '../models/User';
import { UserVocabulary } from '../models/UserVocabulary';
import { LearningLog } from '../models/LearningLog';
import { PronunciationLog } from '../models/PronunciationLog';
import { ShadowingLog } from '../models/ShadowingLog';

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(getUserId(req)).select('streak streakMax xp totalXp level dailyGoalMinutes');

    const userVocabs = await UserVocabulary.find({ userId: getUserId(req) });
    const masteredCount = userVocabs.filter(uv => uv.status === 'MASTERED').length;
    const learningCount = userVocabs.filter(uv => uv.status !== 'NEW').length;

    const totalLogMinutes = (await LearningLog.aggregate([
      { $match: { userId: user?._id } },
      { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
    ]))[0]?.total || 0;

    const totalPronunciationLogs = await PronunciationLog.countDocuments({ userId: getUserId(req) });
    const avgPronunciationScore = (await PronunciationLog.aggregate([
      { $match: { userId: user?._id } },
      { $group: { _id: null, avg: { $avg: '$overallScore' } } },
    ]))[0]?.avg || 0;

    const totalShadowingLogs = await ShadowingLog.countDocuments({ userId: getUserId(req) });

    res.json({
      stats: {
        streak: user?.streak || 0,
        streakMax: user?.streakMax || 0,
        xp: user?.xp || 0,
        totalXp: user?.totalXp || 0,
        level: user?.level || 'A1',
        dailyGoalMinutes: user?.dailyGoalMinutes || 30,
        totalVocab: userVocabs.length,
        masteredVocab: masteredCount,
        learningVocab: learningCount,
        totalMinutes: Math.round(totalLogMinutes),
        pronunciationPractices: totalPronunciationLogs,
        avgPronunciationScore: Math.round(avgPronunciationScore * 10) / 10,
        shadowingPractices: totalShadowingLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getCalendar(req: Request, res: Response): Promise<void> {
  try {
    const { month = String(new Date().getMonth() + 1), year = String(new Date().getFullYear()) } = req.query;
    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const logs = await LearningLog.find({
      userId: getUserId(req),
      date: { $gte: startDate, $lte: endDate },
    });

    const calendarData = new Map<string, { count: number; xp: number; minutes: number }>();
    for (const log of logs) {
      const dateKey = log.date.toISOString().split('T')[0];
      const existing = calendarData.get(dateKey) || { count: 0, xp: 0, minutes: 0 };
      existing.count += 1;
      existing.xp += log.xpEarned;
      existing.minutes += log.durationMinutes;
      calendarData.set(dateKey, existing);
    }

    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const data = calendarData.get(dateKey);
      days.push({
        date: dateKey,
        count: data?.count || 0,
        xp: data?.xp || 0,
        minutes: data?.minutes || 0,
      });
    }

    res.json({ calendar: days });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getWeeklySummary(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const logs = await LearningLog.find({
      userId: getUserId(req),
      date: { $gte: startOfWeek, $lte: now },
    });

    const summary = {
      totalXP: logs.reduce((sum, l) => sum + l.xpEarned, 0),
      totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
      totalSessions: logs.length,
      byType: {} as Record<string, number>,
    };

    for (const log of logs) {
      summary.byType[log.type] = (summary.byType[log.type] || 0) + 1;
    }

    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function logActivity(req: Request, res: Response): Promise<void> {
  try {
    const { type, durationMinutes, details } = req.body;
    const ALLOWED_TYPES = ['VOCABULARY', 'PRONUNCIATION', 'SHADOWING', 'CONVERSATION', 'REVIEW'];
    if (!type || !ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ error: 'Invalid activity type' });
      return;
    }
    const duration = Number(durationMinutes) || 0;
    if (duration < 0 || duration > 1440) {
      res.status(400).json({ error: 'durationMinutes must be between 0 and 1440' });
      return;
    }

    const log = await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type,
      durationMinutes: duration,
      xpEarned: 0,
      details: details || {},
    });

    res.status(201).json({ log });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
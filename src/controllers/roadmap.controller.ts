import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { Roadmap } from '../models/Roadmap';
import { LearningLog } from '../models/LearningLog';
import { roadmapService, nextLevel } from '../services/roadmap.service';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function generateRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const { level, goal, dailyMinutes, topic } = req.body;
    const userLevel = level || 'A1';
    const userGoal = goal || 'communication';
    const userMinutes = dailyMinutes || 30;

    const activeRoadmap = await Roadmap.findOne({ userId: getUserId(req), isActive: true });
    if (activeRoadmap && !activeRoadmap.isCompleted) {
      res.status(409).json({
        error: `You have an active roadmap (Day ${activeRoadmap.currentDay}/${activeRoadmap.totalDays}). Complete it before starting a new one, or reset it.`,
        roadmap: activeRoadmap,
      });
      return;
    }

    // Look up the most recent completed roadmap to determine next level
    const lastCompleted = await Roadmap.findOne({ userId: getUserId(req), isCompleted: true })
      .sort({ completedAt: -1 });
    const nextLvl = lastCompleted ? nextLevel(lastCompleted.level) : userLevel;

    const roadmap = await roadmapService.generate(getUserId(req), nextLvl, userGoal, userMinutes, topic);
    res.status(201).json({ roadmap });
  } catch (error: any) {
    console.error('generateRoadmap error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getMyRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const completedCount = await Roadmap.countDocuments({ userId, isCompleted: true });

    // Prefer active roadmap; otherwise return the most recent one (e.g. just completed)
    let roadmap = await Roadmap.findOne({ userId, isActive: true }).sort({ createdAt: -1 });
    if (!roadmap) {
      roadmap = await Roadmap.findOne({ userId }).sort({ createdAt: -1 });
    }

    if (!roadmap) {
      res.json({
        roadmap: null,
        stats: {
          completedRoadmaps: completedCount,
          totalLessonsCompleted: 0,
          totalDays: 0,
          nextLevel: 'A1',
          canGenerateNew: true,
        },
      });
      return;
    }

    res.json({
      roadmap,
      stats: {
        completedRoadmaps: completedCount,
        totalLessonsCompleted: roadmap.currentDay,
        totalDays: roadmap.totalDays,
        nextLevel: roadmap.isCompleted ? nextLevel(roadmap.level) : roadmap.level,
        canGenerateNew: roadmap.isCompleted || !roadmap.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getDayLesson(req: Request, res: Response): Promise<void> {
  try {
    const { day } = req.params;
    const dayNum = parseInt(day);

    const roadmap = await Roadmap.findOne({ userId: getUserId(req), isActive: true });
    if (!roadmap) {
      res.status(404).json({ error: 'No active roadmap' });
      return;
    }

    const lesson = roadmap.lessons.find(l => l.day === dayNum);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    res.json({ lesson });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function completeDayLesson(req: Request, res: Response): Promise<void> {
  try {
    const { day } = req.params;
    const dayNum = parseInt(day);

    const roadmap = await Roadmap.findOne({ userId: getUserId(req), isActive: true });
    if (!roadmap) {
      res.status(404).json({ error: 'No active roadmap' });
      return;
    }

    if (roadmap.isCompleted) {
      res.status(400).json({ error: 'This roadmap is already completed.' });
      return;
    }

    if (dayNum > roadmap.currentDay + 1) {
      res.status(400).json({ error: 'Must complete lessons in order' });
      return;
    }

    const wasAlreadyCompleted = dayNum <= roadmap.currentDay;

    if (dayNum === roadmap.currentDay + 1) {
      roadmap.currentDay = dayNum;

      if (roadmap.currentDay >= roadmap.totalDays) {
        roadmap.isCompleted = true;
        roadmap.completedAt = new Date();
        roadmap.isActive = false;
      }

      await roadmap.save();
    }

    const user = await updateStreak(getUserId(req));
    const xp = calculateXP('DAILY_LESSON', undefined, user.streak);

    if (!wasAlreadyCompleted) {
      await LearningLog.create({
        userId: getUserId(req),
        date: new Date(),
        type: 'REVIEW',
        durationMinutes: 30,
        xpEarned: xp,
      });
    }

    const isJustCompleted = roadmap.isCompleted && dayNum === roadmap.totalDays;

    res.json({
      roadmap,
      xpEarned: xp,
      isCompleted: roadmap.isCompleted,
      isJustCompleted,
      nextLevel: roadmap.isCompleted ? nextLevel(roadmap.level) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function resetRoadmap(req: Request, res: Response): Promise<void> {
  try {
    await Roadmap.updateMany(
      { userId: getUserId(req), isActive: true },
      { isActive: false }
    );
    res.json({ message: 'Roadmap reset. Generate a new one to continue.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getRoadmapHistory(req: Request, res: Response): Promise<void> {
  try {
    const roadmaps = await Roadmap.find({ userId: getUserId(req) })
      .sort({ createdAt: -1 })
      .select('name level goal totalDays currentDay isCompleted completedAt createdAt version');
    res.json({ roadmaps });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

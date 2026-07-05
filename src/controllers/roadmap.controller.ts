import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { Roadmap } from '../models/Roadmap';
import { LearningLog } from '../models/LearningLog';
import { roadmapService } from '../services/roadmap.service';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function generateRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const { level, goal, dailyMinutes } = req.body;
    const userLevel = level || 'intermediate';
    const userGoal = goal || 'communication';
    const userMinutes = dailyMinutes || 30;

    const roadmap = await roadmapService.generate(getUserId(req), userLevel, userGoal, userMinutes);
    res.status(201).json({ roadmap });
  } catch (error: any) {
    console.error('generateRoadmap error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getMyRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const roadmap = await Roadmap.findOne({ userId: getUserId(req), isActive: true });
    if (!roadmap) {
      res.status(404).json({ error: 'No active roadmap. Generate one first.' });
      return;
    }
    res.json({ roadmap });
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

    if (dayNum > roadmap.currentDay + 1) {
      res.status(400).json({ error: 'Must complete lessons in order' });
      return;
    }

    if (dayNum === roadmap.currentDay + 1) {
      roadmap.currentDay = dayNum;
      await roadmap.save();
    }

    const user = await updateStreak(getUserId(req));
    const xp = calculateXP('DAILY_LESSON', undefined, user.streak);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: 30,
      xpEarned: xp,
    });

    res.json({ roadmap, xpEarned: xp });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function resetRoadmap(req: Request, res: Response): Promise<void> {
  try {
    await Roadmap.updateMany({ userId: getUserId(req), isActive: true }, { isActive: false });
    res.json({ message: 'Roadmap reset. Generate a new one to continue.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
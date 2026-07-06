import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { roleplayService } from '../services/roleplay.service';
import { RolePlayConversation } from '../models/RolePlayConversation';
import { LearningLog } from '../models/LearningLog';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';

export async function createConversation(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level } = req.body;

    const scenario = await roleplayService.generateScenario(topic, level);

    const conversation = await RolePlayConversation.create({
      userId: getUserId(req),
      scenario: scenario.scenario,
      title: scenario.title,
      aiRole: scenario.aiRole,
      userRole: scenario.userRole,
      level: scenario.level || level || 'B1',
      topic: scenario.topic || topic || 'daily-life',
      messages: [],
    });

    // First AI message - starts the conversation
    const welcomeMsg = {
      role: 'ai' as const,
      text: `Hello! I'm the ${scenario.aiRole}. Let's practice! *Scene: ${scenario.scenario}*`,
      aiReply: `Hello! I'm the ${scenario.aiRole}. Let's practice! *Scene: ${scenario.scenario}*`,
    };
    conversation.messages.push(welcomeMsg);
    await conversation.save();

    res.status(201).json({ conversation });
  } catch (error: any) {
    console.error('createConversation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const aiResponse = await roleplayService.chat(getUserId(req), id, message.trim());

    await updateStreak(getUserId(req));

    res.json({ message: aiResponse });
  } catch (error: any) {
    console.error('sendMessage error:', error);
    const status = /not found/i.test(error.message || '') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Internal server error' });
  }
}

export async function endConversation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await roleplayService.summarizeConversation(getUserId(req), id);

    // Log the XP
    await updateStreak(getUserId(req));
    const xp = calculateXP('PRONUNCIATION'); // Use pronunciation XP for role-play too
    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: 10,
      xpEarned: xp,
      details: { conversationId: id, score: result.analysis.score },
    });

    res.json({ conversation: result.conversation, analysis: result.analysis, xpEarned: xp });
  } catch (error: any) {
    console.error('endConversation error:', error);
    const status = /not found/i.test(error.message || '') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Internal server error' });
  }
}

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const { ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const total = await RolePlayConversation.countDocuments({ userId: getUserId(req) });
    const conversations = await RolePlayConversation.find({ userId: getUserId(req) })
      .select('scenario title aiRole userRole level topic completedAt overallScore createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      conversations,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getConversationById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const conversation = await RolePlayConversation.findOne({ _id: id, userId: getUserId(req) });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ conversation });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const conversation = await RolePlayConversation.findOneAndDelete({ _id: id, userId: getUserId(req) });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ message: 'Conversation deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
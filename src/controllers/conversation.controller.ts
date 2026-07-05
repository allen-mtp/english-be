import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { conversationService } from '../services/conversation.service';

export async function generateConversation(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level, exchanges } = req.body;
    if (!topic || !level) {
      res.status(400).json({ error: 'topic and level are required' });
      return;
    }

    const conversation = await conversationService.generate(topic, level, exchanges);
    res.status(201).json({ conversation });
  } catch (error: any) {
    console.error('generateConversation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const { topic, level, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (topic) filter.topic = topic;
    if (level) filter.level = level;

    const total = await Conversation.countDocuments(filter);
    const conversations = await Conversation.find(filter)
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
    const conversation = await Conversation.findById(id);
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
    const conversation = await Conversation.findByIdAndDelete(id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ message: 'Conversation deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
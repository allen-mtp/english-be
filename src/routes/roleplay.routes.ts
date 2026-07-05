import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  createConversation,
  sendMessage,
  endConversation,
  getConversations,
  getConversationById,
  deleteConversation,
} from '../controllers/roleplay.controller';

const router = Router();

router.post('/', aiLimiter, createConversation);
router.post('/:id/message', aiLimiter, sendMessage);
router.post('/:id/end', aiLimiter, endConversation);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.delete('/:id', deleteConversation);

export default router;
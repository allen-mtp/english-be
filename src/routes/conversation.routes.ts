import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  generateConversation,
  getConversations,
  getConversationById,
  deleteConversation,
} from '../controllers/conversation.controller';

const router = Router();

router.post('/generate', aiLimiter, generateConversation);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.delete('/:id', deleteConversation);

export default router;
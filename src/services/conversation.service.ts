import { aiService, ChunkCallback } from './ai.service';
import { Conversation } from '../models/Conversation';

const CONVERSATION_SYSTEM_PROMPT = `You are a natural English dialogue writer for language learners.
Create a natural, realistic conversation.
Return ONLY valid JSON (no markdown, no code block):
{
  "title": string,
  "topic": string,
  "level": string,
  "dialogue": [
    {"speaker": string, "text": string, "translation": string}
  ],
  "vocabularyHighlights": [
    {"word": string, "meaning": string}
  ],
  "grammarNotes": string (in Vietnamese)
}
Natural dialogue, not textbook-like. Use contractions appropriately for level.
Beginner: short simple sentences. Advanced: idioms, phrasal verbs, complex structures.`;

export class ConversationService {
  async generate(userId: string, topic: string, level: string, exchanges: number = 10, onChunk?: ChunkCallback) {
    const userPrompt = `Topic: "${topic}", CEFR Level: "${level}" — dialogue MUST match this exact level. Exchanges: ${exchanges}
Create a natural, realistic conversation.`;

    const data = await aiService.generateJSON<any>(CONVERSATION_SYSTEM_PROMPT, userPrompt, 8192, onChunk);

    const conversation = await Conversation.create({
      userId,
      title: data.title,
      topic: topic || data.topic,
      level,
      dialogue: data.dialogue,
      vocabularyHighlights: data.vocabularyHighlights || [],
      grammarNotes: data.grammarNotes || '',
    });

    return conversation;
  }
}

export const conversationService = new ConversationService();
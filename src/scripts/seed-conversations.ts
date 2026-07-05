import { aiService } from '../services/ai.service';
import { Conversation } from '../models/Conversation';

const SEED_CONVERSATION_PROMPT = `You are a natural English dialogue writer for language learners.
Generate a realistic conversation. Return ONLY valid JSON (no markdown, no code block):
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
  "grammarNotes": string
}
Natural dialogue, not textbook-like. 8-12 exchanges. Include contractions where appropriate for the level.`;

const conversationTopics = [
  { topic: 'greetings', levels: ['A1', 'A2', 'B1'] },
  { topic: 'food & restaurants', levels: ['A1', 'A2', 'B1'] },
  { topic: 'travel', levels: ['A2', 'B1', 'B2'] },
  { topic: 'work & career', levels: ['B1', 'B2', 'C1'] },
  { topic: 'health & fitness', levels: ['A2', 'B1', 'B2'] },
  { topic: 'shopping', levels: ['A1', 'A2', 'B1'] },
  { topic: 'weather', levels: ['A1', 'A2'] },
  { topic: 'family & friends', levels: ['A1', 'A2', 'B1'] },
  { topic: 'hobbies', levels: ['A2', 'B1'] },
  { topic: 'technology', levels: ['B1', 'B2', 'C1'] },
  { topic: 'education', levels: ['B1', 'B2'] },
  { topic: 'entertainment', levels: ['B1', 'B2'] },
  { topic: 'sports', levels: ['A2', 'B1'] },
  { topic: 'nature & environment', levels: ['B2', 'C1'] },
  { topic: 'culture & customs', levels: ['B2', 'C1'] },
  { topic: 'daily routine', levels: ['A1', 'A2'] },
  { topic: 'phone calls', levels: ['A2', 'B1'] },
  { topic: 'small talk', levels: ['B1', 'B2'] },
  { topic: 'interviews', levels: ['B2', 'C1'] },
  { topic: 'problem-solving', levels: ['B2', 'C1'] },
];

export async function seedConversations(count: number = 30): Promise<void> {
  console.log(`Seeding ${count} conversations...`);
  let created = 0;

  for (let i = 0; i < count; i++) {
    const topicConfig = conversationTopics[i % conversationTopics.length];
    const level = topicConfig.levels[i % topicConfig.levels.length] || 'B1';

    const userPrompt = `Topic: "${topicConfig.topic}", Level: "${level}", Exchanges: 10
Create a natural conversation.`;

    try {
      const data = await aiService.generateJSON<any>(SEED_CONVERSATION_PROMPT, userPrompt);

      await Conversation.create({
        title: data.title,
        topic: data.topic || topicConfig.topic,
        level: data.level || level,
        dialogue: data.dialogue,
        vocabularyHighlights: data.vocabularyHighlights || [],
        grammarNotes: data.grammarNotes || '',
      });
      created++;

      console.log(`Progress: ${i + 1}/${count}`);
    } catch (error) {
      console.error(`Conversation ${i + 1} failed:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`Conversation seeding complete. Created ${created} conversations.`);
}
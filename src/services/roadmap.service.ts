import { aiService } from './ai.service';
import { Roadmap, IDailyLesson } from '../models/Roadmap';

const ROADMAP_SYSTEM_PROMPT = `You are an experienced English teacher designing a personalized learning roadmap.
Create a complete 30-day lesson plan. Each day progressively builds on previous days.
Return ONLY valid JSON array (no markdown, no code block) with 30 objects:
[
  {
    "day": number,
    "title": string,
    "vocabularies": [
      {"word": string, "ipa": string, "meaningVi": string, "meaningEn": string, "partOfSpeech": string, "examples": [{"en": string, "vi": string}]}
    ],
    "grammarNote": string,
    "conversationTitle": string,
    "conversation": [
      {"speaker": string, "text": string, "translation": string}
    ],
    "pronunciationFocus": string,
    "shadowingText": string,
    "tips": string
  }
]

5-7 vocab words per day. Keep examples short (one sentence each).
Grammar notes and tips in Vietnamese, keep concise. Conversations should be short (4-6 exchanges).
Spread the difficulty progressively from day 1 to day 30.

Beginner (A1-A2): greetings → family → daily routine → food → shopping → directions → weather → hobbies
Intermediate (B1-B2): work communication → meetings → travel → culture → news → storytelling → opinions
Advanced (C1-C2): idioms → business strategy → debates → persuasion → nuanced expressions → professional writing`;

export const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function nextLevel(current: string): string {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx < 0 || idx === LEVEL_ORDER.length - 1) return current;
  return LEVEL_ORDER[idx + 1];
}

export class RoadmapService {
  async generate(userId: string, level: string, goal: string, dailyMinutes: number, topic?: string) {
    const userPrompt = `Student CEFR level: ${level}, Goal: ${goal}, Daily study time: ${dailyMinutes} minutes.
${topic ? `Focus area / interest: "${topic}" — tailor vocabulary, conversations, and themes around this topic across the 30 days.` : ''}
Create a 30-day learning roadmap. Return exactly 30 days.`;

    const lessons = await aiService.generateJSON<IDailyLesson[]>(ROADMAP_SYSTEM_PROMPT, userPrompt, 32768);

    if (!Array.isArray(lessons) || lessons.length === 0) {
      throw new Error('AI returned invalid roadmap');
    }

    await Roadmap.updateMany({ userId, isActive: true }, { isActive: false });

    const version = await Roadmap.countDocuments({ userId }) + 1;

    const roadmap = await Roadmap.create({
      userId,
      name: `Roadmap #${version} - ${level} - ${goal}${topic ? ` - ${topic}` : ''}`,
      level,
      goal,
      dailyMinutes,
      totalDays: 30,
      currentDay: 0,
      lessons,
      isActive: true,
      isCompleted: false,
      completedAt: null,
      version,
    });

    return roadmap;
  }
}

export const roadmapService = new RoadmapService();

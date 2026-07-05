import { aiService } from './ai.service';
import { Roadmap, IDailyLesson } from '../models/Roadmap';

const ROADMAP_SYSTEM_PROMPT = `You are an experienced English teacher designing a personalized learning roadmap.
Create a complete lesson plan. Each day progressively builds on previous days.
Return ONLY valid JSON array (no markdown, no code block):
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

6-8 vocab words per day. Keep examples short (one sentence each). 
Grammar notes and tips in Vietnamese, keep concise. Conversations should be short (4-6 exchanges).

Beginner (A1-A2): greetings → family → daily routine → food → shopping → directions → weather → hobbies
Intermediate (B1-B2): work communication → meetings → travel → culture → news → storytelling → opinions
Advanced (C1-C2): idioms → business strategy → debates → persuasion → nuanced expressions → professional writing`;

export class RoadmapService {
  async generate(userId: string, level: string, goal: string, dailyMinutes: number) {
    const userPrompt = `Student level: ${level}, Goal: ${goal}, Daily study time: ${dailyMinutes} minutes.
Create a 7-day learning roadmap.`;

    const lessons = await aiService.generateJSON<IDailyLesson[]>(ROADMAP_SYSTEM_PROMPT, userPrompt, 16384);

    await Roadmap.updateMany({ userId, isActive: true }, { isActive: false });

    const roadmap = await Roadmap.create({
      userId,
      name: `Roadmap - ${level} - ${goal}`,
      level,
      goal,
      dailyMinutes,
      totalDays: 7,
      currentDay: 0,
      lessons,
    });

    return roadmap;
  }
}

export const roadmapService = new RoadmapService();
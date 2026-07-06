import { aiService } from './ai.service';
import { Roadmap, IDailyLesson } from '../models/Roadmap';

const ROADMAP_BATCH_SIZE = 5;
const TOTAL_DAYS = 30;

const ROADMAP_SYSTEM_PROMPT = `You are an experienced English teacher designing a personalized learning roadmap.
You will be asked to create a specific range of days within a 30-day plan. Each day progressively builds on previous days.
Return ONLY valid JSON array (no markdown, no code block) with one object per requested day:
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

5 vocab words per day max. Keep examples to one short sentence each.
Grammar notes and tips in Vietnamese, max 2 sentences each. Conversations: exactly 4 short exchanges.
shadowingText: 2-3 short sentences max. Spread difficulty progressively across the full 30 days.

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
  private async generateLessonBatch(
    level: string,
    goal: string,
    dailyMinutes: number,
    startDay: number,
    endDay: number,
    topic?: string,
    previousLessons: IDailyLesson[] = [],
  ): Promise<IDailyLesson[]> {
    const dayCount = endDay - startDay + 1;
    const prevContext = previousLessons.length > 0
      ? `\nPrevious days already planned: ${previousLessons.slice(-3).map(l => `Day ${l.day} "${l.title}"`).join(', ')}. Continue from there.`
      : '';

    const userPrompt = `Student CEFR level: ${level}, Goal: ${goal}, Daily study time: ${dailyMinutes} minutes.
${topic ? `Focus area / interest: "${topic}" — tailor vocabulary, conversations, and themes around this topic.` : ''}
Create days ${startDay} to ${endDay} of a ${TOTAL_DAYS}-day learning roadmap.${prevContext}
Return exactly ${dayCount} day objects with day numbers ${startDay} through ${endDay}.`;

    const lessons = await aiService.generateJSON<IDailyLesson[]>(ROADMAP_SYSTEM_PROMPT, userPrompt, 16384);

    if (!Array.isArray(lessons) || lessons.length === 0) {
      throw new Error(`AI returned invalid roadmap for days ${startDay}-${endDay}`);
    }

    return lessons;
  }

  async generate(userId: string, level: string, goal: string, dailyMinutes: number, topic?: string) {
    const lessons: IDailyLesson[] = [];

    for (let startDay = 1; startDay <= TOTAL_DAYS; startDay += ROADMAP_BATCH_SIZE) {
      const endDay = Math.min(startDay + ROADMAP_BATCH_SIZE - 1, TOTAL_DAYS);
      if (startDay > 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      const batch = await this.generateLessonBatch(level, goal, dailyMinutes, startDay, endDay, topic, lessons);
      lessons.push(...batch);
    }

    if (lessons.length === 0) {
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
      totalDays: TOTAL_DAYS,
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

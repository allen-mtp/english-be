import { aiService } from './ai.service';
import { ListeningExercise } from '../models/Listening';

const LISTENING_SYSTEM_PROMPT = `You are an English listening exercise designer. Create a listening exercise for English learners.
Return ONLY valid JSON (no markdown, no code block):
{
  "title": string,
  "topic": string (e.g. "travel", "food", "work", "shopping", "health", "education", "news", "daily-life"),
  "level": string ("A1" | "A2" | "B1" | "B2" | "C1" | "C2"),
  "type": "dialogue" | "monologue" | "story" | "news" | "announcement" | "interview",
  "transcript": string (the full English transcript, 100-250 words depending on level),
  "translation": string (full Vietnamese translation),
  "duration": number (estimated duration in seconds),
  "questions": [
    {
      "question": string (in English),
      "options": [string, string, string, string],
      "correctIndex": number (0-3),
      "explanation": string (Vietnamese)
    }
  ] (5-7 questions including main idea, detail, inference, vocabulary),
  "vocabulary": [{"word": string, "meaning": string (Vietnamese), "ipa": string}]
}

Adjust difficulty by level:
- A1-A2: short simple sentences, slow pace, basic vocabulary
- B1-B2: natural speed, some idioms, moderate complexity
- C1-C2: native-like, complex structures, advanced vocabulary`;

const TOPICS = ['travel', 'food', 'work', 'shopping', 'health', 'education', 'news', 'daily-life', 'technology', 'environment'];
const TYPES = ['dialogue', 'monologue', 'story', 'news', 'announcement', 'interview'];

export class ListeningService {
  async generate(userId: string, level: string = 'A1', topic?: string, type?: string) {
    const chosenTopic = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const chosenType = type || TYPES[Math.floor(Math.random() * TYPES.length)];

    const userPrompt = `Create a listening exercise.
Level: ${level}
Topic: ${chosenTopic}
Type: ${chosenType}

Make it engaging and practical.`;

    const data = await aiService.generateJSON<any>(LISTENING_SYSTEM_PROMPT, userPrompt, 8192);

    const exercise = await ListeningExercise.create({
      userId,
      title: data.title,
      topic: data.topic || chosenTopic,
      level: data.level || level,
      type: data.type || chosenType,
      transcript: data.transcript,
      translation: data.translation,
      duration: data.duration || 60,
      questions: data.questions || [],
      vocabulary: data.vocabulary || [],
      audioGenerated: false,
    });

    return exercise;
  }
}

export const listeningService = new ListeningService();
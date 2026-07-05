import { aiService } from './ai.service';

const SCENARIO_SYSTEM_PROMPT = `You are an English speaking practice designer. Create a daily speaking scenario for the learner.
Return ONLY valid JSON (no markdown, no code block):
{
  "title": string (e.g. "Ordering Coffee at Starbucks"),
  "situation": string (Vietnamese description of the situation, 1-2 sentences),
  "level": string,
  "topic": string (e.g. "food", "travel", "work", "shopping", "health", "social"),
  "keyVocabulary": [{"word": string, "ipa": string, "meaning": string (Vietnamese)}] (5-7 words),
  "usefulPhrases": [{"phrase": string, "translation": string}] (5-7 useful phrases),
  "sampleDialogue": [{"speaker": "You" | "Other", "text": string}] (4-6 exchanges showing how the conversation goes),
  "tips": [string] (2-3 speaking tips in Vietnamese),
  "challenge": string (a specific challenge for the user, e.g. "Try ordering without looking at the menu")
}

Make scenarios practical, varied, and useful for real-life English communication.
Topics: food-ordering, shopping, travel, doctor-visit, job-interview, small-talk, asking-directions, phone-call, hotel, restaurant, bank, airport, weather, hobby, complaint, apology, invitation`;

const TOPICS = [
  'food-ordering', 'shopping', 'travel', 'doctor-visit', 'job-interview',
  'small-talk', 'asking-directions', 'phone-call', 'hotel', 'restaurant',
  'bank', 'airport', 'weather', 'hobby', 'complaint', 'apology', 'invitation',
  'meeting-someone-new', 'renting-apartment', 'buying-tickets',
];

export class SpeakingScenarioService {
  async generate(level: string = 'B1', topic?: string) {
    const chosenTopic = topic || TOPICS[Math.floor(Math.random() * TOPICS.length)];

    const userPrompt = `Create a speaking practice scenario.
Level: ${level}
Topic area: ${chosenTopic}

Make it realistic and practical. The user will practice speaking in this situation.`;

    const data = await aiService.generateJSON<any>(SCENARIO_SYSTEM_PROMPT, userPrompt, 8192);

    return data;
  }

  async generateVariations(level: string, topic: string, count: number = 3) {
    const variations = [];
    for (let i = 0; i < count; i++) {
      try {
        const scenario = await this.generate(level, topic);
        variations.push(scenario);
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
      }
    }
    return variations;
  }
}

export const speakingScenarioService = new SpeakingScenarioService();
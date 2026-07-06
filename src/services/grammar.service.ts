import { aiService } from './ai.service';
import { GrammarLesson, IGrammarLesson, IGrammarExercise } from '../models/Grammar';

const GRAMMAR_SYSTEM_PROMPT = `You are an expert English grammar teacher. Create a comprehensive grammar lesson for English learners.
Return ONLY valid JSON (no markdown, no code block):
{
  "title": string (e.g. "Present Perfect vs Past Simple"),
  "topic": string (e.g. "tenses", "conditionals", "articles", "modals", "passive", "relative-clauses", "gerunds-infinitives", "prepositions", "conjunctions", "comparisons"),
  "level": string ("A1" | "A2" | "B1" | "B2" | "C1" | "C2"),
  "explanation": string (clear explanation in English, 2-3 paragraphs),
  "explanationVi": string (Vietnamese translation of the explanation),
  "examples": [{"en": string, "vi": string}, {"en": string, "vi": string}, {"en": string, "vi": string}],
  "rules": [string, string, string] (key rules to remember, in Vietnamese),
  "commonMistakes": [{"mistake": string, "correct": string, "explanation": string in Vietnamese}, {"mistake": string, "correct": string, "explanation": string}],
  "exercises": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number (0-3),
      "explanation": string (in Vietnamese)
    }
  ] (5-8 exercises)
}

Make the lesson practical and useful for communication. Examples should be natural everyday English.
Exercise types: fill-in-the-blank, choose correct form, identify error, transformation.`;

const GRAMMAR_TOPICS = [
  { topic: 'tenses', title: 'Present Perfect vs Past Simple', level: 'B1' },
  { topic: 'conditionals', title: 'First and Second Conditional', level: 'B1' },
  { topic: 'articles', title: 'A, An, The - When to Use Articles', level: 'A2' },
  { topic: 'modals', title: 'Modal Verbs for Requests and Permission', level: 'B1' },
  { topic: 'passive', title: 'Passive Voice in Everyday English', level: 'B2' },
  { topic: 'relative-clauses', title: 'Defining and Non-defining Relative Clauses', level: 'B2' },
  { topic: 'gerunds-infinitives', title: 'Gerunds vs Infinitives After Verbs', level: 'B1' },
  { topic: 'prepositions', title: 'Common Prepositions of Time and Place', level: 'A2' },
  { topic: 'conjunctions', title: 'Linking Words: Although, Despite, However', level: 'B2' },
  { topic: 'comparisons', title: 'Comparatives and Superlatives', level: 'A2' },
  { topic: 'tenses', title: 'Present Continuous for Future Arrangements', level: 'A2' },
  { topic: 'conditionals', title: 'Third Conditional and Mixed Conditionals', level: 'C1' },
  { topic: 'modals', title: 'Must, Have to, Should for Obligation', level: 'B1' },
  { topic: 'passive', title: 'Passive with Modals and Reporting Verbs', level: 'B2' },
  { topic: 'tenses', title: 'Future Perfect and Future Continuous', level: 'B2' },
];

export class GrammarService {
  async generateLesson(userId: string, topic?: string, level?: string, title?: string) {
    let chosenTopic = topic;
    let chosenTitle = title;
    let chosenLevel = level;

    if (!chosenTopic) {
      const random = GRAMMAR_TOPICS[Math.floor(Math.random() * GRAMMAR_TOPICS.length)];
      chosenTopic = random.topic;
      chosenTitle = random.title;
      chosenLevel = level || random.level;
    }

    // Check if this user already has this lesson
    const existing = await GrammarLesson.findOne({ userId, topic: chosenTopic, title: chosenTitle });
    if (existing) return existing;

    const userPrompt = `Create a grammar lesson${chosenTitle ? ` about "${chosenTitle}"` : ''}.
Topic category: ${chosenTopic}
Level: ${chosenLevel || 'A1'}

Make it comprehensive with 6-8 exercises.`;

    const data = await aiService.generateJSON<any>(GRAMMAR_SYSTEM_PROMPT, userPrompt, 8192);

    const lesson = await GrammarLesson.create({
      userId,
      title: data.title || chosenTitle,
      topic: data.topic || chosenTopic,
      level: data.level || chosenLevel || 'A1',
      explanation: data.explanation,
      explanationVi: data.explanationVi,
      examples: data.examples || [],
      rules: data.rules || [],
      commonMistakes: data.commonMistakes || [],
      exercises: data.exercises || [],
    });

    return lesson;
  }

  async generateBatch(userId: string, topic: string, level: string, count: number = 5) {
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        const lesson = await this.generateLesson(userId, topic, level);
        results.push(lesson);
      } catch (error) {
        console.error(`Failed to generate lesson ${i + 1}:`, error);
      }
    }
    return results;
  }
}

export const grammarService = new GrammarService();
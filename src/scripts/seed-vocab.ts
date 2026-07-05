import { aiService } from '../services/ai.service';
import { Vocabulary } from '../models/Vocabulary';

const SEED_SYSTEM_PROMPT = `Generate essential English vocabulary words. Return ONLY a valid JSON array (no markdown, no code block):
[
  {
    "word": string,
    "ipa": string,
    "meaningVi": string,
    "meaningEn": string,
    "partOfSpeech": "noun"|"verb"|"adjective"|"adverb"|"preposition"|"conjunction"|"pronoun"|"phrasal verb"|"idiom",
    "examples": [{"en": string, "vi": string}, {"en": string, "vi": string}],
    "synonyms": [string, string],
    "collocations": [string, string],
    "level": "A1"|"A2"|"B1"|"B2"|"C1",
    "topic": string
  }
]
Include only commonly used, practical words for English learners. Vietnamese meanings should be natural and common usage.`;

const topics = [
  'daily-life', 'greetings', 'family', 'food', 'travel', 'work',
  'health', 'shopping', 'weather', 'hobbies', 'education', 'technology',
  'entertainment', 'nature', 'emotions', 'time', 'numbers', 'colors',
  'clothing', 'transportation',
];

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
const levelDistribution = { A1: 0.25, A2: 0.25, B1: 0.2, B2: 0.2, C1: 0.1 };

export async function seedVocabularies(totalCount: number = 300): Promise<void> {
  console.log(`Seeding ${totalCount} vocabularies...`);
  const batchSize = 25;
  let created = 0;

  for (let i = 0; i < totalCount; i += batchSize) {
    const remaining = Math.min(batchSize, totalCount - i);
    const level = levels[i % levels.length];
    const topic = topics[Math.floor(i / 5) % topics.length];

    const userPrompt = `Generate ${remaining} essential English words for level ${level} on topic "${topic}". Include only unique, practical words not commonly duplicated.`;

    try {
      const dataArray = await aiService.generateJSON<any[]>(SEED_SYSTEM_PROMPT, userPrompt);

      for (const item of dataArray) {
        const existing = await Vocabulary.findOne({ word: item.word });
        if (!existing) {
          await Vocabulary.create(item);
          created++;
        }
      }

      console.log(`Progress: ${Math.min(i + batchSize, totalCount)}/${totalCount} (${created} new)`);
    } catch (error) {
      console.error(`Batch ${i} failed:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Vocabulary seeding complete. Created ${created} new words.`);
}
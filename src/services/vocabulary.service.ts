import { aiService } from './ai.service';
import { Vocabulary } from '../models/Vocabulary';
import { UserVocabulary } from '../models/UserVocabulary';

const VOCABULARY_SYSTEM_PROMPT = `You are an English language expert. Generate comprehensive vocabulary info.
Return ONLY valid JSON (no markdown, no code block, no explanation):

For single word:
{
  "word": string,
  "ipa": string,
  "meaningVi": string,
  "meaningEn": string,
  "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "preposition" | "conjunction" | "pronoun" | "phrasal verb" | "idiom",
  "examples": [{"en": string, "vi": string}, {"en": string, "vi": string}],
  "synonyms": [string, string],
  "collocations": [string, string],
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "topic": string
}

For batch, wrap in array: [{...}, {...}]
Use natural Vietnamese meanings. IPA in standard notation.`;

export interface VocabularyInput {
  word: string;
  ipa: string;
  meaningVi: string;
  meaningEn: string;
  partOfSpeech: string;
  examples: Array<{ en: string; vi: string }>;
  synonyms: string[];
  collocations: string[];
  level: string;
  topic: string;
}

export class VocabularyService {
  async generateSingle(userId: string, word: string, topic?: string) {
    const userPrompt = `Generate vocabulary for the word: "${word}"${topic ? `\nContext/topic to relate examples and meaning to: "${topic}"` : ''}`;
    const data = await aiService.generateJSON<VocabularyInput>(VOCABULARY_SYSTEM_PROMPT, userPrompt);

    const existing = await Vocabulary.findOne({ word: data.word });
    let vocabulary = existing;
    if (!vocabulary) {
      vocabulary = await Vocabulary.create(data);
    }

    const existingUserVocab = await UserVocabulary.findOne({ userId, vocabularyId: vocabulary._id });
    if (!existingUserVocab) {
      await UserVocabulary.create({ userId, vocabularyId: vocabulary._id });
    }

    return vocabulary;
  }

  async generateBatch(userId: string, words: string[], topic?: string) {
    const userPrompt = `Generate vocabulary for these words: ${JSON.stringify(words)}${topic ? `\nContext/topic to relate examples and meanings to: "${topic}"` : ''}`;
    const dataArray = await aiService.generateJSON<VocabularyInput[]>(VOCABULARY_SYSTEM_PROMPT, userPrompt);

    const results = [];
    for (const item of dataArray) {
      const existing = await Vocabulary.findOne({ word: item.word });
      let vocabulary = existing;
      if (!vocabulary) {
        vocabulary = await Vocabulary.create(item);
      }

      const existingUserVocab = await UserVocabulary.findOne({ userId, vocabularyId: vocabulary._id });
      if (!existingUserVocab) {
        await UserVocabulary.create({ userId, vocabularyId: vocabulary._id });
      }

      results.push(vocabulary);
    }

    return results;
  }
}

export const vocabularyService = new VocabularyService();
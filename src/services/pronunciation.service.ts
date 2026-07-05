import { aiService } from './ai.service';
import { PronunciationLog } from '../models/PronunciationLog';

const PRONUNCIATION_SYSTEM_PROMPT = `You are an English pronunciation coach. Analyze the pronunciation quality.
Return ONLY valid JSON (no markdown, no code block):
{
  "overallScore": number (0-100),
  "wordScores": [
    {"word": string, "score": number, "issue": string | null}
  ],
  "feedback": string (overall feedback in Vietnamese, 2-3 sentences),
  "issues": [
    {"type": "mispronunciation" | "missing-word" | "extra-word" | "stress" | "intonation", "description": string}
  ]
}
Score each word based on phoneme accuracy. Missing/extra words = 0 score.
Feedback in Vietnamese, encouraging and specific.`;

export class PronunciationService {
  async score(
    userId: string,
    audioBuffer: Buffer,
    originalText: string,
  ) {
    const transcribedText = await aiService.transcribeAudio(audioBuffer);

    const userPrompt = `Original text: "${originalText}"
User's transcribed speech: "${transcribedText}"
Analyze the pronunciation quality.`;

    const result = await aiService.generateJSON<any>(PRONUNCIATION_SYSTEM_PROMPT, userPrompt);

    const log = await PronunciationLog.create({
      userId,
      text: originalText,
      overallScore: result.overallScore,
      wordScores: result.wordScores || [],
      feedback: result.feedback || '',
      issues: result.issues || [],
    });

    return log;
  }
}

export const pronunciationService = new PronunciationService();
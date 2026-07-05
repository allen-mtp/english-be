import { aiService } from './ai.service';
import { ShadowingLog } from '../models/ShadowingLog';
import { Conversation } from '../models/Conversation';

const SHADOWING_SYSTEM_PROMPT = `You are an English speaking coach evaluating shadowing practice.
Return ONLY valid JSON (no markdown, no code block):
{
  "overallScore": number (0-100),
  "accuracyScore": number (0-100),
  "fluencyScore": number (0-100),
  "feedback": [
    {"sentence": string, "issue": string, "suggestion": string}
  ]
}
accuracyScore = word match accuracy.
fluencyScore = speech naturalness and rhythm.
overallScore = (accuracyScore * 0.6 + fluencyScore * 0.4), rounded to integer.
feedback in Vietnamese, specific and actionable.`;

export class ShadowingService {
  async score(
    userId: string,
    audioBuffer: Buffer,
    conversationId: string,
    sentenceIndex: number,
  ) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const sentence = conversation.dialogue[sentenceIndex];
    if (!sentence) throw new Error('Invalid sentence index');

    const userTranscript = await aiService.transcribeAudio(audioBuffer);

    const userPrompt = `Original sentence: "${sentence.text}"
User's transcribed speech: "${userTranscript}"
Evaluate this shadowing practice.`;

    const result = await aiService.generateJSON<any>(SHADOWING_SYSTEM_PROMPT, userPrompt);

    const log = await ShadowingLog.create({
      userId,
      conversationId,
      sentenceIndex,
      overallScore: result.overallScore,
      accuracyScore: result.accuracyScore,
      fluencyScore: result.fluencyScore,
      feedback: result.feedback || [],
    });

    return log;
  }
}

export const shadowingService = new ShadowingService();
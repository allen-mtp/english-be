import { aiService, ChunkCallback } from './ai.service';
import { WritingSubmission } from '../models/Writing';

const DEFAULT_WRITING_TYPES = ['email', 'essay', 'story', 'description', 'letter', 'report', 'review'];

const PROMPT_SYSTEM = `You are an English writing teacher. Generate a writing prompt for the learner.
Return ONLY valid JSON (no markdown, no code block):
{
  "prompt": string (the full writing prompt with clear instructions),
  "promptType": string (the writing format, e.g. "email", "essay", "blog post", "diary", "speech"),
  "level": string,
  "topic": string,
  "minWords": number,
  "maxWords": number,
  "tips": [string] (2-3 writing tips in Vietnamese)
}
Make prompts practical and useful for real-life English communication.
If a specific writing type is requested, use that format exactly and set promptType to match it.`;

const FEEDBACK_SYSTEM = `You are an expert English writing examiner. Evaluate the user's writing submission.
Return ONLY valid JSON (no markdown, no code block):
{
  "overallScore": number (0-100),
  "grammarScore": number (0-100),
  "vocabularyScore": number (0-100),
  "coherenceScore": number (0-100),
  "taskAchievement": number (0-100, how well the prompt was addressed),
  "corrections": [
    {"original": "incorrect phrase from user's text", "corrected": "corrected version", "explanation": "Vietnamese explanation"}
  ] (5-15 corrections depending on text length),
  "strengths": [string] (2-3 things done well, in Vietnamese),
  "improvements": [string] (2-3 areas to improve, in Vietnamese),
  "suggestions": string (overall suggestion in Vietnamese, 2-3 sentences),
  "bandScore": string (IELTS-like band, e.g. "6.5" or "7.0")
}

Scoring criteria:
- Grammar: accuracy of tenses, articles, prepositions, word order
- Vocabulary: range, appropriateness, precision
- Coherence: logical flow, transitions, paragraph structure
- Task Achievement: relevance to prompt, completeness

Be specific and constructive. Vietnamese explanations.`;

export class WritingService {
  async generatePrompt(level: string = 'A1', type?: string, topic?: string, onChunk?: ChunkCallback) {
    const customType = type?.trim().slice(0, 100);
    const chosenType = customType || DEFAULT_WRITING_TYPES[Math.floor(Math.random() * DEFAULT_WRITING_TYPES.length)];

    const userPrompt = `Generate a writing prompt.
Level: ${level}
Writing type/format: ${chosenType}${customType ? ' (user requested this format)' : ' (pick randomly from common formats)'}
${topic ? `Topic: ${topic}` : 'Choose an interesting, practical topic.'}
Set promptType in your JSON response to: "${chosenType}"`;

    const data = await aiService.generateJSON<any>(PROMPT_SYSTEM, userPrompt, 8192, onChunk);
    return { ...data, promptType: data.promptType?.trim() || chosenType };
  }

  async evaluate(userId: string, promptData: any, userText: string, onChunk?: ChunkCallback) {
    const wordCount = userText.trim().split(/\s+/).length;

    const userPrompt = `Writing prompt: "${promptData.prompt}"
Type: ${promptData.promptType}
Level: ${promptData.level}
Expected word count: ${promptData.minWords || 100}-${promptData.maxWords || 300}

User's submission (${wordCount} words):
"""
${userText}
"""

Evaluate this writing submission.`;

    const feedback = await aiService.generateJSON<any>(FEEDBACK_SYSTEM, userPrompt, 8192, onChunk);

    const submission = await WritingSubmission.create({
      userId,
      prompt: promptData.prompt,
      promptType: promptData.promptType,
      level: promptData.level,
      topic: promptData.topic || 'general',
      userText,
      wordCount,
      feedback: {
        overallScore: feedback.overallScore,
        grammarScore: feedback.grammarScore,
        vocabularyScore: feedback.vocabularyScore,
        coherenceScore: feedback.coherenceScore,
        taskAchievement: feedback.taskAchievement,
        corrections: feedback.corrections || [],
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
        suggestions: feedback.suggestions || '',
        bandScore: feedback.bandScore,
      },
    });

    return submission;
  }
}

export const writingService = new WritingService();
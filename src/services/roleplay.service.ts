import { aiService } from './ai.service';
import { RolePlayConversation } from '../models/RolePlayConversation';

const SCENARIO_PROMPT = `You are an English teacher creating role-play scenarios for communication practice.
Return ONLY a JSON object (no markdown, no code block):
{
  "scenario": string (the setting/scene description, e.g. "At a coffee shop ordering drinks"),
  "title": string (e.g. "Ordering Coffee"),
  "aiRole": string (the role AI plays, e.g. "Barista"),
  "userRole": string (the role user plays, e.g. "Customer"),
  "topic": string (topic category),
  "level": string (echo the requested CEFR level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2")
}
Vary the scenarios. Choose from: daily-life, shopping, dining, travel, workplace, health, education, social, emergency, phone-call.
Make scenarios realistic and useful for daily English communication.
Adjust dialogue complexity to match the requested CEFR level.`;

const CHAT_PROMPT = `You are playing a role in an English conversation practice. Follow these rules strictly:
1. STAY IN CHARACTER as "{aiRole}" at all times.
2. Reply naturally like a real person would - short, conversational replies (1-3 sentences max).
3. After your reply, add a separator "---NOTES---" followed by a JSON array of corrections:
   [{"error":"user's incorrect phrase", "correct":"corrected version", "explanation":"brief Vietnamese explanation"}]
4. Rate the user's English quality in the last line as "SCORE: X/10" (where X is a number).
5. If the user says something unnatural for the situation, gently steer back.

SCORING: Consider grammar, vocabulary appropriateness, naturalness, and communication effectiveness.
- 1-3: Many errors, hard to understand
- 4-6: Understandable but basic, some errors
- 7-8: Good communication, minor errors  
- 9-10: Excellent, natural English

Do NOT include markdown formatting.`;

export interface RolePlayMessage {
  role: 'ai' | 'user';
  text: string;
  corrections?: string;
  grammarIssues?: Array<{ error: string; correct: string; explanation: string }>;
  vocabularyNote?: string;
  aiReply?: string;
}

export class RoleplayService {
  async generateScenario(topic?: string, level?: string) {
    const topicList = ['ordering food', 'shopping', 'airport check-in', 'hotel booking', 'doctor visit',
      'job interview', 'making friends', 'asking directions', 'phone call', 'restaurant reservation',
      'small talk', 'at the bank', 'at the post office', 'ordering takeout', 'meeting someone new'];
    const randomTopic = topic || topicList[Math.floor(Math.random() * topicList.length)];

    const userPrompt = `Generate a role-play scenario${topic ? ` about "${topic}"` : ''}.${level ? ` Level: ${level}.` : ''} Make it practical and realistic.`;

    return await aiService.generateJSON<any>(SCENARIO_PROMPT, userPrompt);
  }

  async chat(userId: string, conversationId: string, userMessage: string) {
    const conv = await RolePlayConversation.findById(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const fullPrompt = CHAT_PROMPT.replace('{aiRole}', conv.aiRole);

    const recent = conv.messages.slice(-6);
    const context = recent.map(m => `${m.role === 'ai' ? conv.aiRole : 'You'}: ${m.text}`).join('\n');

    const userPrompt = `Scenario: ${conv.scenario}
You are: ${conv.aiRole}
User is: ${conv.userRole}
Topic: ${conv.topic}
Level: ${conv.level}

Previous dialogue:
${context || '(Beginning of conversation)'}

User just said: "${userMessage}"

Reply naturally as ${conv.aiRole}.`;

    const response = await aiService.generateText(fullPrompt, userPrompt, 1024);

    let replyText = response.trim();
    let corrections = '';
    let score = 0;
    let grammarIssues: Array<{ error: string; correct: string; explanation: string }> = [];

    // Parse NOTES section
    const notesIndex = replyText.indexOf('---NOTES---');
    if (notesIndex !== -1) {
      const notesPart = replyText.substring(notesIndex);
      replyText = replyText.substring(0, notesIndex).trim();

      // Parse score
      const scoreMatch = notesPart.match(/SCORE:\s*(\d+)/i);
      if (scoreMatch) score = parseInt(scoreMatch[1]);

      // Parse corrections
      const correctionsJson = notesPart
        .replace(/SCORE:\s*\d+\/?\d*[\s\S]*$/i, '') // Remove score line
        .replace('---NOTES---', '')
        .replace(/^\s*[\n\r]+/, '')
        .trim();

      if (correctionsJson.startsWith('[')) {
        try {
          grammarIssues = JSON.parse(correctionsJson);
          corrections = grammarIssues.map(g => `${g.error} → ${g.correct}`).join('\n');
        } catch {
          corrections = correctionsJson;
        }
      } else if (correctionsJson) {
        corrections = correctionsJson;
      }
    }

    const userMsg: RolePlayMessage = {
      role: 'user',
      text: userMessage,
    };
    conv.messages.push(userMsg);

    const aiMsg: RolePlayMessage = {
      role: 'ai',
      text: replyText || "I'm here! Let's continue the conversation. 😊",
      corrections: corrections || undefined,
      grammarIssues: grammarIssues.length > 0 ? grammarIssues : undefined,
      aiReply: replyText || "I'm here! Let's continue the conversation. 😊",
    };
    conv.messages.push(aiMsg);

    await conv.save();

    return aiMsg;
  }

  async summarizeConversation(conversationId: string) {
    const conv = await RolePlayConversation.findById(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const summaryPrompt = `You are an English teacher. Summarize this role-play conversation and provide feedback.

Scenario: ${conv.scenario}
User role: ${conv.userRole}

Conversation:
${conv.messages.map(m => `${m.role === 'ai' ? conv.aiRole : conv.userRole}: ${m.text}`).join('\n')}

Return ONLY a JSON object:
{
  "summary": string (brief Vietnamese summary of what happened),
  "score": number (0-100 overall score),
  "strengths": [string, string] (what user did well, in Vietnamese),
  "improvements": [string, string] (what to improve, in Vietnamese),
  "vocabularyUsed": [string] (notable vocabulary the user used)
}`;

    const result = await aiService.generateJSON<any>(summaryPrompt, summaryPrompt.replace('You are an English teacher. Return ONLY a JSON object:', 'Summarize this role-play conversation and provide feedback.\n\nReturn ONLY a JSON object:'), 4096);

    conv.summary = result.summary || result.feedback || '';
    conv.overallScore = result.score || undefined;
    conv.completedAt = new Date();
    await conv.save();

    return { conversation: conv, analysis: result };
  }
}

export const roleplayService = new RoleplayService();
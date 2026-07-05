import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const textModel = 'gemini-2.5-flash';

export class AIService {
  async generateText(systemPrompt: string, userPrompt: string, maxOutputTokens: number = 4096): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: textModel,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.7, maxOutputTokens },
    });

    const result = await model.generateContent(userPrompt);
    return result.response.text();
  }

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 8192,
  ): Promise<T> {
    const model = genAI.getGenerativeModel({
      model: textModel,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(userPrompt);
    let text = result.response.text().trim();

    if (text.startsWith('```')) {
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```\s*$/g, '').trim();
    }

    try {
      return JSON.parse(text) as T;
    } catch (firstError: any) {
      const msg = firstError.message || '';
      const positionMatch = msg.match(/position (\d+)/);
      if (positionMatch) {
        const pos = parseInt(positionMatch[1]);
        const snippet = text.substring(Math.max(0, pos - 80), pos + 80);
        console.error(`JSON parse error at pos ${pos}, total length ${text.length}. Snippet: ...${snippet}...`);
      } else {
        console.error(`JSON parse error (no position). Text length: ${text.length}. First 200 chars: ${text.substring(0, 200)}`);
      }

      throw firstError;
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const model = genAI.getGenerativeModel({ model: textModel });

    const result = await model.generateContent([
      { text: 'Transcribe the following audio to English text. Return ONLY the transcribed text, nothing else.' },
      { inlineData: { mimeType: 'audio/webm', data: audioBuffer.toString('base64') } },
    ]);

    return result.response.text().trim();
  }
}

export const aiService = new AIService();
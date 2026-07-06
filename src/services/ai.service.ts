import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const textModel = 'gemini-2.5-flash';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableApiError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 4,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableApiError(error) || attempt === maxRetries) throw error;

      const delay = baseDelayMs * 2 ** attempt;
      const status = (error as { status?: number }).status;
      console.warn(`${label}: API error ${status}, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export class AIService {
  async generateText(systemPrompt: string, userPrompt: string, maxOutputTokens: number = 4096): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: textModel,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.7, maxOutputTokens },
    });

    const result = await withRetry(
      () => model.generateContent(userPrompt),
      'generateText',
    );
    return result.response.text();
  }

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 8192,
    retries: number = 2,
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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await withRetry(
        () => model.generateContent(userPrompt),
        'generateJSON',
      );
      const finishReason = result.response.candidates?.[0]?.finishReason;
      let text = result.response.text().trim();

      if (text.startsWith('```')) {
        text = text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```\s*$/g, '').trim();
      }

      if (finishReason === 'MAX_TOKENS') {
        lastError = new Error(`AI response truncated (MAX_TOKENS), length ${text.length}`);
        console.warn(`generateJSON attempt ${attempt + 1}: output truncated at ${text.length} chars`);
        if (attempt < retries) continue;
        throw lastError;
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError: any) {
        lastError = parseError;
        const msg = parseError.message || '';
        const positionMatch = msg.match(/position (\d+)/);
        if (positionMatch) {
          const pos = parseInt(positionMatch[1]);
          const snippet = text.substring(Math.max(0, pos - 80), pos + 80);
          console.error(`JSON parse error at pos ${pos}, total length ${text.length}. Snippet: ...${snippet}...`);
        } else {
          console.error(`JSON parse error (no position). Text length: ${text.length}. First 200 chars: ${text.substring(0, 200)}`);
        }

        if (attempt < retries) {
          console.warn(`generateJSON attempt ${attempt + 1} failed, retrying...`);
          continue;
        }
      }
    }

    throw lastError ?? new Error('Failed to generate valid JSON');
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const model = genAI.getGenerativeModel({ model: textModel });

    const result = await withRetry(
      () => model.generateContent([
        { text: 'Transcribe the following audio to English text. Return ONLY the transcribed text, nothing else.' },
        { inlineData: { mimeType: 'audio/webm', data: audioBuffer.toString('base64') } },
      ]),
      'transcribeAudio',
    );

    return result.response.text().trim();
  }
}

export const aiService = new AIService();
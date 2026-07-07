import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const MODEL_CHAIN = [PRIMARY_MODEL, FALLBACK_MODEL];

export type ChunkCallback = (chunk: string) => void;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableApiError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function cleanJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/\s*```\s*$/g, '').trim();
  }
  return cleaned;
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

async function withModelFallback<T>(
  label: string,
  fn: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    const maxRetries = i === 0 ? 2 : 4;

    try {
      return await withRetry(() => fn(model), `${label}[${model}]`, maxRetries);
    } catch (error) {
      lastError = error;
      const nextModel = MODEL_CHAIN[i + 1];
      if (nextModel && isRetryableApiError(error)) {
        console.warn(`${label}: ${model} unavailable, falling back to ${nextModel}`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function collectStreamText(
  stream: AsyncIterable<{ text: () => string }>,
  onChunk?: ChunkCallback,
): Promise<string> {
  let text = '';
  for await (const chunk of stream) {
    const piece = chunk.text();
    if (!piece) continue;
    text += piece;
    onChunk?.(piece);
  }
  return text;
}

export class AIService {
  async streamText(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 4096,
    onChunk?: ChunkCallback,
  ): Promise<string> {
    return withModelFallback('streamText', async (model) => {
      const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: { temperature: 0.7, maxOutputTokens },
      });
      const result = await generativeModel.generateContentStream(userPrompt);
      return collectStreamText(result.stream, onChunk);
    });
  }

  async streamJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 8192,
    onChunk?: ChunkCallback,
    retries: number = 2,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      let finishReason: string | undefined;
      let text = '';

      try {
        const aggregated = await withModelFallback('streamJSON', async (model) => {
          const generativeModel = genAI.getGenerativeModel({
            model,
            systemInstruction: systemPrompt,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens,
              responseMimeType: 'application/json',
            },
          });
          const result = await generativeModel.generateContentStream(userPrompt);
          const streamedText = await collectStreamText(result.stream, onChunk);
          const response = await result.response;
          finishReason = response.candidates?.[0]?.finishReason;
          return streamedText;
        });
        text = aggregated;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) continue;
        throw error;
      }

      text = cleanJsonText(text);

      if (finishReason === 'MAX_TOKENS') {
        lastError = new Error(`AI response truncated (MAX_TOKENS), length ${text.length}`);
        console.warn(`streamJSON attempt ${attempt + 1}: output truncated at ${text.length} chars`);
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
          const pos = parseInt(positionMatch[1], 10);
          const snippet = text.substring(Math.max(0, pos - 80), pos + 80);
          console.error(`JSON parse error at pos ${pos}, total length ${text.length}. Snippet: ...${snippet}...`);
        } else {
          console.error(`JSON parse error (no position). Text length: ${text.length}. First 200 chars: ${text.substring(0, 200)}`);
        }

        if (attempt < retries) {
          console.warn(`streamJSON attempt ${attempt + 1} failed, retrying...`);
          continue;
        }
      }
    }

    throw lastError ?? new Error('Failed to generate valid JSON');
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 4096,
    onChunk?: ChunkCallback,
  ): Promise<string> {
    return this.streamText(systemPrompt, userPrompt, maxOutputTokens, onChunk);
  }

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number = 8192,
    onChunk?: ChunkCallback,
    retries: number = 2,
  ): Promise<T> {
    return this.streamJSON<T>(systemPrompt, userPrompt, maxOutputTokens, onChunk, retries);
  }

  async transcribeAudio(audioBuffer: Buffer, onChunk?: ChunkCallback): Promise<string> {
    const result = await withModelFallback('transcribeAudio', async (model) => {
      const generativeModel = genAI.getGenerativeModel({ model });
      const streamResult = await generativeModel.generateContentStream([
        { text: 'Transcribe the following audio to English text. Return ONLY the transcribed text, nothing else.' },
        { inlineData: { mimeType: 'audio/webm', data: audioBuffer.toString('base64') } },
      ]);
      return collectStreamText(streamResult.stream, onChunk);
    });

    return result.trim();
  }
}

export const aiService = new AIService();

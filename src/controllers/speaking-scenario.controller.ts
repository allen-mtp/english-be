import { Request, Response } from 'express';
import { speakingScenarioService } from '../services/speaking-scenario.service';
import { withAIStream } from '../utils/ai-stream-response';

export async function getScenario(req: Request, res: Response): Promise<void> {
  const { level, topic } = req.query;

  await withAIStream(
    res,
    200,
    async (emitChunk) => speakingScenarioService.generate(
      (level as string) || 'B1',
      topic as string,
      emitChunk,
    ),
    (scenario) => ({ scenario }),
  );
}

export async function getVariations(req: Request, res: Response): Promise<void> {
  const { level, topic, count } = req.query;

  await withAIStream(
    res,
    200,
    async (emitChunk) => speakingScenarioService.generateVariations(
      (level as string) || 'B1',
      (topic as string) || 'daily-life',
      parseInt((count as string) || '3', 10),
      emitChunk,
    ),
    (variations) => ({ variations }),
  );
}

import { Request, Response } from 'express';
import { speakingScenarioService } from '../services/speaking-scenario.service';

export async function getScenario(req: Request, res: Response): Promise<void> {
  try {
    const { level, topic } = req.query;
    const scenario = await speakingScenarioService.generate(
      (level as string) || 'B1',
      topic as string,
    );
    res.json({ scenario });
  } catch (error: any) {
    console.error('getScenario error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getVariations(req: Request, res: Response): Promise<void> {
  try {
    const { level, topic, count } = req.query;
    const variations = await speakingScenarioService.generateVariations(
      (level as string) || 'B1',
      (topic as string) || 'daily-life',
      parseInt((count as string) || '3'),
    );
    res.json({ variations });
  } catch (error: any) {
    console.error('getVariations error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
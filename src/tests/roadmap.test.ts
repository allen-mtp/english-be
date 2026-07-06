import request from 'supertest';
import { createApp } from '../app';
import { config } from '../config';
import { Roadmap } from '../models/Roadmap';
import { aiService } from '../services/ai.service';

const app = createApp();

jest.mock('../services/ai.service');

const mockedGenerateJSON = aiService.generateJSON as jest.MockedFunction<typeof aiService.generateJSON>;

async function authedAgent(username = 'roadmapuser') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'Password123', name: 'Roadmap User' });
  return agent;
}

function makeFakeLessons(days = 30) {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    title: `Lesson ${i + 1}`,
    vocabularies: [{ word: `word${i + 1}`, ipa: '/test/', meaningVi: 'nghia', meaningEn: 'meaning', partOfSpeech: 'noun', examples: [{ en: 'a', vi: 'b' }] }],
    grammarNote: 'note',
    conversationTitle: `Chat ${i + 1}`,
    conversation: [{ speaker: 'A', text: 'hi', translation: 'chao' }],
    pronunciationFocus: 'vowels',
    shadowingText: 'shadow text',
    tips: 'tip',
  }));
}

describe('Roadmap: generate', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('POST /api/roadmap/generate should create a 30-day roadmap', async () => {
    const agent = await authedAgent('roadmapgen1');
    const res = await agent.post('/api/roadmap/generate').send({ level: 'A1', goal: 'communication', dailyMinutes: 30 });
    expect(res.status).toBe(201);
    expect(res.body.roadmap.totalDays).toBe(30);
    expect(res.body.roadmap.lessons.length).toBe(30);
    expect(res.body.roadmap.currentDay).toBe(0);
    expect(res.body.roadmap.isCompleted).toBe(false);
    expect(res.body.roadmap.level).toBe('A1');
  });

  it('should default level to A1 if not provided', async () => {
    const agent = await authedAgent('roadmapgen2');
    const res = await agent.post('/api/roadmap/generate').send({});
    expect(res.status).toBe(201);
    expect(res.body.roadmap.level).toBe('A1');
  });

  it('should reject generation if active roadmap not completed (409)', async () => {
    const agent = await authedAgent('roadmapgen3');
    await agent.post('/api/roadmap/generate').send({ level: 'B1' });
    const res = await agent.post('/api/roadmap/generate').send({ level: 'B2' });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('active roadmap');
  });
});

describe('Roadmap: getMyRoadmap', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('GET /api/roadmap/my should return active roadmap with stats', async () => {
    const agent = await authedAgent('roadmapget1');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.get('/api/roadmap/my');
    expect(res.status).toBe(200);
    expect(res.body.roadmap).toBeDefined();
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.canGenerateNew).toBe(false);
    expect(res.body.stats.completedRoadmaps).toBe(0);
  });

  it('should return 404 if no roadmap exists', async () => {
    const agent = await authedAgent('roadmapget2');
    const res = await agent.get('/api/roadmap/my');
    expect(res.status).toBe(404);
  });
});

describe('Roadmap: getDayLesson', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('GET /api/roadmap/day/:day should return lesson', async () => {
    const agent = await authedAgent('roadmapday1');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.get('/api/roadmap/day/1');
    expect(res.status).toBe(200);
    expect(res.body.lesson.day).toBe(1);
    expect(res.body.lesson.title).toBe('Lesson 1');
  });

  it('should return 404 for non-existent day', async () => {
    const agent = await authedAgent('roadmapday2');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.get('/api/roadmap/day/999');
    expect(res.status).toBe(404);
  });
});

describe('Roadmap: completeDayLesson + progression', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('should complete day 1 and advance currentDay', async () => {
    const agent = await authedAgent('roadmapcomplete1');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.post('/api/roadmap/day/1/complete');
    expect(res.status).toBe(200);
    expect(res.body.roadmap.currentDay).toBe(1);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.isCompleted).toBe(false);
  });

  it('should reject completing day out of order', async () => {
    const agent = await authedAgent('roadmapcomplete2');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.post('/api/roadmap/day/5/complete');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('order');
  });

  it('should mark roadmap as completed on day 30 and unlock next level', async () => {
    const agent = await authedAgent('roadmapcomplete3');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    let lastRes: request.Response | null = null;
    for (let d = 1; d <= 30; d++) {
      lastRes = await agent.post(`/api/roadmap/day/${d}/complete`);
    }
    expect(lastRes).toBeTruthy();
    expect(lastRes!.status).toBe(200);
    expect(lastRes!.body.roadmap.isCompleted).toBe(true);
    expect(lastRes!.body.roadmap.currentDay).toBe(30);
    expect(lastRes!.body.isJustCompleted).toBe(true);
    expect(lastRes!.body.nextLevel).toBe('A2');
  });

  it('should allow new roadmap generation with next level after completion', async () => {
    const agent = await authedAgent('roadmapcomplete4');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    for (let d = 1; d <= 30; d++) {
      await agent.post(`/api/roadmap/day/${d}/complete`);
    }

    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
    const res = await agent.post('/api/roadmap/generate').send({});
    expect(res.status).toBe(201);
    expect(res.body.roadmap.level).toBe('A2');
  });

  it('should keep C2 as max level (no auto-advance beyond)', async () => {
    const agent = await authedAgent('roadmapc2');
    await agent.post('/api/roadmap/generate').send({ level: 'C2' });

    for (let d = 1; d <= 30; d++) {
      await agent.post(`/api/roadmap/day/${d}/complete`);
    }

    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
    const res = await agent.post('/api/roadmap/generate').send({});
    expect(res.status).toBe(201);
    expect(res.body.roadmap.level).toBe('C2');
  });
});

describe('Roadmap: reset', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('PATCH /api/roadmap/reset should deactivate active roadmap', async () => {
    const agent = await authedAgent('roadmapreset1');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.patch('/api/roadmap/reset');
    expect(res.status).toBe(200);

    const activeCount = await Roadmap.countDocuments({ isActive: true });
    expect(activeCount).toBe(0);
  });

  it('should allow generation after reset', async () => {
    const agent = await authedAgent('roadmapreset2');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });
    await agent.patch('/api/roadmap/reset');

    const res = await agent.post('/api/roadmap/generate').send({ level: 'B1' });
    expect(res.status).toBe(201);
    expect(res.body.roadmap.level).toBe('B1');
  });
});

describe('Roadmap: history', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(makeFakeLessons(30));
  });

  it('GET /api/roadmap/history should list roadmaps', async () => {
    const agent = await authedAgent('roadmaphist1');
    await agent.post('/api/roadmap/generate').send({ level: 'A1' });

    const res = await agent.get('/api/roadmap/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.roadmaps)).toBe(true);
    expect(res.body.roadmaps.length).toBe(1);
    expect(res.body.roadmaps[0].version).toBe(1);
  });
});

import request from 'supertest';
import { createApp } from '../app';
import { config } from '../config';
import { Vocabulary } from '../models/Vocabulary';
import { UserVocabulary } from '../models/UserVocabulary';
import { aiService } from '../services/ai.service';

const app = createApp();

jest.mock('../services/ai.service');

const mockedGenerateJSON = aiService.generateJSON as jest.MockedFunction<typeof aiService.generateJSON>;

async function authedAgent(username = 'vocabuser') {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'Password123', name: 'Vocab User' });
  return agent;
}

const fakeVocab = {
  word: 'serendipity',
  ipa: '/ˌserənˈdɪpɪti/',
  meaningVi: 'sự tình cờ may mắn',
  meaningEn: 'finding something good without looking for it',
  partOfSpeech: 'noun',
  examples: [{ en: 'It was serendipity.', vi: 'Đó là sự tình cờ.' }],
  synonyms: ['chance', 'luck'],
  collocations: ['pure serendipity'],
  level: 'C1',
  topic: 'general',
};

describe('Vocabulary: generate', () => {
  beforeEach(() => {
    mockedGenerateJSON.mockResolvedValue(fakeVocab);
  });

  it('POST /api/vocabularies/generate should create vocabulary', async () => {
    const agent = await authedAgent('vocabgen1');
    const res = await agent.post('/api/vocabularies/generate').send({ word: 'serendipity', topic: 'general' });
    expect(res.status).toBe(201);
    expect(res.body.vocabulary.word).toBe('serendipity');
    expect(res.body.vocabulary.ipa).toBeDefined();

    const dbVocab = await Vocabulary.findOne({ word: 'serendipity' });
    expect(dbVocab).toBeTruthy();
  });

  it('should create UserVocabulary link after generating', async () => {
    const agent = await authedAgent('vocabgen2');
    await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });
    const uv = await UserVocabulary.findOne({});
    expect(uv).toBeTruthy();
    expect(uv?.status).toBe('NEW');
  });

  it('should reject without word', async () => {
    const agent = await authedAgent('vocabgen3');
    const res = await agent.post('/api/vocabularies/generate').send({ topic: 'general' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Word is required');
  });

  it('should reuse existing vocabulary if word already exists', async () => {
    await Vocabulary.create(fakeVocab);
    const agent = await authedAgent('vocabgen4');
    const res = await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });
    expect(res.status).toBe(201);
    expect(mockedGenerateJSON).toHaveBeenCalled();
    const count = await Vocabulary.countDocuments({ word: 'serendipity' });
    expect(count).toBe(1);
  });
});

describe('Vocabulary: list', () => {
  beforeEach(async () => {
    mockedGenerateJSON.mockResolvedValue(fakeVocab);
  });

  it('GET /api/vocabularies/my should return paginated list', async () => {
    const agent = await authedAgent('vocablist1');
    await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });

    const res = await agent.get('/api/vocabularies/my');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.vocabularies)).toBe(true);
    expect(res.body.vocabularies.length).toBe(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it('GET /api/vocabularies/stats should return stats object', async () => {
    const agent = await authedAgent('vocabstats1');
    await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });

    const res = await agent.get('/api/vocabularies/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.total).toBe(1);
    expect(res.body.stats.newCount).toBe(1);
  });

  it('GET /api/vocabularies/review/today should return due items', async () => {
    const agent = await authedAgent('vocabreview1');
    await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });

    const res = await agent.get('/api/vocabularies/review/today');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('Vocabulary: review', () => {
  beforeEach(async () => {
    mockedGenerateJSON.mockResolvedValue(fakeVocab);
  });

  it('POST /api/vocabularies/review should update SRS state', async () => {
    const agent = await authedAgent('vocabreview2');
    const gen = await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });
    const vocabId = gen.body.vocabulary._id;

    const res = await agent.post('/api/vocabularies/review').send({ vocabularyId: vocabId, quality: 5 });
    expect(res.status).toBe(200);
    expect(res.body.userVocabulary).toBeDefined();
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.userVocabulary.repetitions).toBe(1);
  });

  it('should reject review without vocabularyId', async () => {
    const agent = await authedAgent('vocabreview3');
    const res = await agent.post('/api/vocabularies/review').send({ quality: 5 });
    expect(res.status).toBe(400);
  });

  it('should reject review for non-existent vocab', async () => {
    const agent = await authedAgent('vocabreview4');
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await agent.post('/api/vocabularies/review').send({ vocabularyId: fakeId, quality: 5 });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/vocabularies/:id should remove from user collection', async () => {
    const agent = await authedAgent('vocabdelete1');
    const gen = await agent.post('/api/vocabularies/generate').send({ word: 'serendipity' });
    const vocabId = gen.body.vocabulary._id;

    const res = await agent.delete(`/api/vocabularies/${vocabId}`);
    expect(res.status).toBe(200);
    const uvCount = await UserVocabulary.countDocuments({});
    expect(uvCount).toBe(0);
  });
});
